import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reset } from "cloudflare:test";
import worker from "../src/index";

// Integration tests drive the Worker's default export directly (it runs in the
// same workerd isolate as the test), so global `fetch` can be stubbed to mock
// upstreams — no real network. `reset()` clears the Workers Cache API between
// tests so cache state never leaks across cases.

type MockFetch = ReturnType<typeof vi.fn>;
let routes: Array<{ match: (url: string) => boolean; reply: () => Response }>;
let fetchSpy: MockFetch;

beforeEach(() => {
  routes = [];
  fetchSpy = vi.fn(async (input: unknown) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    for (const r of routes) if (r.match(url)) return r.reply();
    throw new Error(`unmocked fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await reset(); // clear caches.default between tests
});

// --- helpers -----------------------------------------------------------------

function whenUrlIncludes(needle: string, reply: () => Response) {
  routes.push({ match: (u) => u.includes(needle), reply });
}
const jsonBody = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const textBody = (text: string, status: number) => new Response(text, { status });
const req = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(`https://worker.test${path}`, init));
const calledUrl = (i: number) => String(fetchSpy.mock.calls[i]?.[0]);

// A fawazahmed0 USD rate file: fiat codes + crypto codes mixed together.
const usdFile = (extra: Record<string, number> = {}) =>
  jsonBody({
    date: "2026-07-16",
    usd: { eur: 0.9, jpy: 158.3, btc: 0.00002, eth: 0.0005, ...extra },
  });

// --- fiat --------------------------------------------------------------------

describe("GET /api/fiat", () => {
  it("reshapes to UPPERCASE codes and normalizes a lowercase base", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () =>
      jsonBody({ date: "2026-07-16", usd: { eur: 0.92, jpy: 158.3 } }),
    );
    const res = await req("/api/fiat?base=usd");

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=21600");
    expect(res.headers.get("x-cache")).toBe("MISS");
    expect(await res.json()).toEqual({
      base: "USD",
      updatedAt: "2026-07-16",
      rates: { EUR: 0.92, JPY: 158.3 },
    });
    expect(calledUrl(0)).toContain("/usd.json");
  });

  it("returns 400 for an invalid base before any upstream call", async () => {
    const res = await req("/api/fiat?base=USD/../x");
    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.json()).toEqual({ error: "invalid base currency code" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the pages.dev mirror when the primary fails", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () => textBody("boom", 500));
    whenUrlIncludes("currency-api.pages.dev", () =>
      jsonBody({ date: "2026-07-16", eur: { usd: 1.08, jpy: 172 } }),
    );
    const res = await req("/api/fiat?base=EUR");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      base: "EUR",
      rates: { USD: 1.08, JPY: 172 },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(calledUrl(0)).toContain("cdn.jsdelivr.net");
    expect(calledUrl(1)).toContain("currency-api.pages.dev");
  });

  it("returns a generic 502 when both fiat upstreams are down", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () => textBody("err", 500));
    whenUrlIncludes("currency-api.pages.dev", () => textBody("err", 503));
    const res = await req("/api/fiat?base=GBP");

    expect(res.status).toBe(502);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.json()).toEqual({ error: "rate provider unavailable" });
  });
});

// --- crypto ------------------------------------------------------------------

describe("GET /api/crypto", () => {
  it("derives curated coins (price = 1/rate) with CC0 icons", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () => usdFile());
    const res = await req("/api/crypto");

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=21600");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("x-cache")).toBe("MISS");

    const body = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      price: number;
      iconUrl: string;
    }>;
    const btc = body.find((c) => c.symbol === "BTC")!;
    expect(btc.id).toBe("btc");
    expect(btc.name).toBe("Bitcoin");
    expect(btc.price).toBeCloseTo(50000, 6); // 1 / 0.00002
    expect(btc.iconUrl).toBe(
      "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/btc.png",
    );
    expect(body.find((c) => c.symbol === "ETH")!.price).toBeCloseTo(2000, 6);
    // only coins present in the rate file appear (btc + eth here)
    expect(body.map((c) => c.symbol).sort()).toEqual(["BTC", "ETH"]);
    expect(body.every((c) => c.iconUrl.length > 0 && Number.isFinite(c.price))).toBe(true);
    expect(new Set(body.map((c) => c.symbol)).size).toBe(body.length);
  });

  it("falls back to the pages.dev mirror for crypto too", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () => textBody("boom", 500));
    whenUrlIncludes("currency-api.pages.dev", () =>
      jsonBody({ date: "d", usd: { btc: 0.00002 } }),
    );
    const res = await req("/api/crypto");

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const body = (await res.json()) as Array<{ symbol: string }>;
    expect(body.map((c) => c.symbol)).toEqual(["BTC"]);
  });

  it("returns a generic 502 when both upstreams are down", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () => textBody("err", 500));
    whenUrlIncludes("currency-api.pages.dev", () => textBody("err", 503));
    const res = await req("/api/crypto");

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "rate provider unavailable" });
  });

  it("serves a second request from the cache (X-Cache: HIT, one upstream call)", async () => {
    whenUrlIncludes("cdn.jsdelivr.net", () => usdFile());

    const first = await req("/api/crypto");
    const second = await req("/api/crypto");

    expect(first.headers.get("x-cache")).toBe("MISS");
    expect(second.headers.get("x-cache")).toBe("HIT");
    expect(second.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// --- routing -----------------------------------------------------------------

describe("routing", () => {
  it("GET /healthz -> 200 { status: ok }", async () => {
    const res = await req("/healthz");
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("GET /privacy -> 200 HTML privacy policy", async () => {
    const res = await req("/privacy");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("Privacy Policy");
    expect(body).toContain("personal information");
  });

  it("unknown path -> 404 JSON with CORS", async () => {
    const res = await req("/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("OPTIONS preflight -> 204 with CORS headers", async () => {
    const res = await req("/api/crypto", { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });
});
