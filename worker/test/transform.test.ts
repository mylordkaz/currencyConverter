import { describe, it, expect } from "vitest";
import { parseRateMap, toFiatOut, deriveCrypto, iconUrl } from "../src/index";

describe("parseRateMap", () => {
  it("extracts the base sub-map as a lowercase code->rate map + date", () => {
    const data = { date: "2026-07-16", usd: { eur: 0.92, jpy: 158.3, BTC: 0.000016 } };
    const out = parseRateMap(data, "USD");
    expect(out).not.toBeNull();
    expect(out!.updatedAt).toBe("2026-07-16");
    expect(out!.rates).toEqual({ eur: 0.92, jpy: 158.3, btc: 0.000016 });
  });

  it("selects the correct sub-map for a non-USD base", () => {
    const data = { date: "d", eur: { usd: 1.08, jpy: 172 }, usd: { eur: 0.92 } };
    expect(parseRateMap(data, "EUR")!.rates).toEqual({ usd: 1.08, jpy: 172 });
  });

  it("drops non-numeric values defensively", () => {
    const out = parseRateMap({ date: "d", usd: { eur: 0.9, junk: "nope" } }, "USD")!;
    expect(out.rates).toEqual({ eur: 0.9 });
  });

  it("returns null when the base sub-map is missing/empty or data is not an object", () => {
    expect(parseRateMap({ date: "d", usd: { eur: 1 } }, "XXX")).toBeNull();
    expect(parseRateMap({ date: "d", usd: {} }, "USD")).toBeNull();
    expect(parseRateMap(null, "USD")).toBeNull();
  });

  it("null updatedAt when the date field is absent", () => {
    expect(parseRateMap({ usd: { eur: 0.9 } }, "USD")!.updatedAt).toBeNull();
  });
});

describe("toFiatOut", () => {
  it("uppercases codes and sets the base", () => {
    const out = toFiatOut({ updatedAt: "d", rates: { eur: 0.9, jpy: 160 } }, "USD");
    expect(out).toEqual({ base: "USD", updatedAt: "d", rates: { EUR: 0.9, JPY: 160 } });
    expect(Object.keys(out.rates).every((k) => k === k.toUpperCase())).toBe(true);
  });
});

describe("deriveCrypto", () => {
  it("derives price = 1/rate for curated coins present in the map", () => {
    const out = deriveCrypto({ updatedAt: "d", rates: { btc: 0.00002, eth: 0.0005 } });
    const btc = out.find((c) => c.symbol === "BTC")!;
    expect(btc.price).toBeCloseTo(50000, 6);
    expect(btc.id).toBe("btc");
    expect(btc.name).toBe("Bitcoin");
    expect(btc.iconUrl).toBe(
      "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/btc.png",
    );
    expect(out.find((c) => c.symbol === "ETH")!.price).toBeCloseTo(2000, 6);
  });

  it("skips coins absent from the map or with a non-positive rate", () => {
    const out = deriveCrypto({ updatedAt: "d", rates: { btc: 0.00002, eth: 0, doge: -1 } });
    // eth (rate 0) and doge (rate -1) dropped; sol/xrp/etc. absent -> dropped
    expect(out.map((c) => c.symbol)).toEqual(["BTC"]);
  });

  it("yields unique symbols and non-empty icon URLs across the full list", () => {
    const codes = [
      "btc", "eth", "usdt", "bnb", "sol", "xrp", "ada", "doge", "trx", "dot",
      "link", "ltc", "bch", "avax", "xlm", "uni", "atom", "shib", "near", "apt",
      "fil", "etc", "icp", "xmr", "algo", "vet",
    ];
    const rates: Record<string, number> = {};
    for (const c of codes) rates[c] = 2; // price = 0.5 each
    const out = deriveCrypto({ updatedAt: "d", rates });
    expect(out.length).toBe(codes.length);
    expect(new Set(out.map((c) => c.symbol)).size).toBe(out.length);
    expect(out.every((c) => c.iconUrl.length > 0 && c.price === 0.5)).toBe(true);
  });

  it("returns [] when no curated coin is present", () => {
    expect(deriveCrypto({ updatedAt: "d", rates: { eur: 0.9 } })).toEqual([]);
  });
});

describe("iconUrl", () => {
  it("builds a lowercase-symbol URL from the CC0 pack", () => {
    expect(iconUrl("BTC")).toBe(
      "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/btc.png",
    );
  });
  it("falls back to a generic icon for an empty symbol", () => {
    expect(iconUrl("")).toContain("generic.png");
  });
});
