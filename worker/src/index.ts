/**
 * tsukakan-rates — a zero-cost, keyless Cloudflare Worker that serves public,
 * public-domain fiat and crypto rates, replacing the hosted Go backend.
 *
 * Both fiat and crypto derive from ONE CC0 (public-domain) source:
 * fawazahmed0/currency-api on jsDelivr. It is commercial-safe, needs no API key
 * and no attribution, and — being a CDN — cannot rate-limit or block a Worker's
 * shared egress IPs (keyless CoinPaprika returned 402 for exactly that reason,
 * and its free tier is personal-use-only anyway). The data updates daily. Coin
 * icons come from the CC0 `cryptocurrency-icons` pack (also jsDelivr).
 *
 * Stateless: no KV, no cron, no database, no secrets. Edge caching uses the
 * Workers Cache API and stores the transformed (small) output. See
 * docs/specs/12-cloudflare-worker.md.
 *
 * Public contract (v1):
 *   GET /api/fiat?base=USD -> { base, updatedAt, rates: { <UPPER>: number } }
 *   GET /api/crypto        -> [ { id, symbol, name, price, iconUrl } ]
 *   GET /healthz           -> { status: "ok" }
 *   unknown path           -> 404 { error: "not found" }
 */

type Env = Record<string, never>; // no bindings — pure stateless proxy

// Both feeds come from the same daily source, so a 6h edge cache is plenty.
const FIAT_TTL = 21600;
const CRYPTO_TTL = 21600;

const primaryUrl = (base: string): string =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`;
const fallbackUrl = (base: string): string =>
  `https://latest.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.json`;

// CC0 icon pack (github.com/spothq/cryptocurrency-icons), served via jsDelivr.
// Keyed by lowercase symbol; `generic` covers any gap.
const ICON_BASE =
  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color";

const BASE_RE = /^[A-Z]{3}$/;

/**
 * Curated set of major cryptocurrencies exposed by /api/crypto. `code` is the
 * fawazahmed0/currency-api key (lowercase); the USD price is derived as
 * 1 / rate (the file gives "1 USD = <rate> <code>"). Every code was verified
 * present in the source's currencies.json (2026-07-16). It is a fixed curated
 * list rather than a live market-cap ranking — the source is a flat code->rate
 * map with no ranking — which is fine for a converter.
 */
const CRYPTO_LIST: ReadonlyArray<{ code: string; symbol: string; name: string }> =
  [
    { code: "btc", symbol: "BTC", name: "Bitcoin" },
    { code: "eth", symbol: "ETH", name: "Ethereum" },
    { code: "usdt", symbol: "USDT", name: "Tether" },
    { code: "bnb", symbol: "BNB", name: "Binance Coin" },
    { code: "sol", symbol: "SOL", name: "Solana" },
    { code: "xrp", symbol: "XRP", name: "Ripple" },
    { code: "ada", symbol: "ADA", name: "Cardano" },
    { code: "doge", symbol: "DOGE", name: "Dogecoin" },
    { code: "trx", symbol: "TRX", name: "TRON" },
    { code: "dot", symbol: "DOT", name: "Polkadot" },
    { code: "link", symbol: "LINK", name: "Chainlink" },
    { code: "ltc", symbol: "LTC", name: "Litecoin" },
    { code: "bch", symbol: "BCH", name: "Bitcoin Cash" },
    { code: "avax", symbol: "AVAX", name: "Avalanche" },
    { code: "xlm", symbol: "XLM", name: "Stellar" },
    { code: "uni", symbol: "UNI", name: "Uniswap" },
    { code: "atom", symbol: "ATOM", name: "Cosmos" },
    { code: "shib", symbol: "SHIB", name: "Shiba Inu" },
    { code: "near", symbol: "NEAR", name: "NEAR Protocol" },
    { code: "apt", symbol: "APT", name: "Aptos" },
    { code: "fil", symbol: "FIL", name: "Filecoin" },
    { code: "etc", symbol: "ETC", name: "Ethereum Classic" },
    { code: "icp", symbol: "ICP", name: "Internet Computer" },
    { code: "xmr", symbol: "XMR", name: "Monero" },
    { code: "algo", symbol: "ALGO", name: "Algorand" },
    { code: "vet", symbol: "VET", name: "VeChain" },
  ];

// ---------------------------------------------------------------------------
// Pure transforms (exported so they can be unit-tested without the network).
// ---------------------------------------------------------------------------

export interface FiatOut {
  base: string;
  updatedAt: string | null;
  rates: Record<string, number>;
}

export interface CryptoOut {
  id: string;
  symbol: string;
  name: string;
  price: number;
  iconUrl: string;
}

/** Parsed rate map: lowercase code -> "1 base = rate code", plus the source date. */
export interface RateMap {
  updatedAt: string | null;
  rates: Record<string, number>;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Icon URL from the CC0 pack, keyed by lowercase symbol. Never empty. */
export function iconUrl(symbol: string): string {
  const s = symbol.trim().toLowerCase();
  return `${ICON_BASE}/${s || "generic"}.png`;
}

/**
 * Parse the fawazahmed0 payload `{ date, <base>: { <code>: rate } }` into a
 * lowercase code->rate map + date. Returns null when the base sub-map is
 * absent/empty (the caller treats null as a failure and tries the next mirror).
 */
export function parseRateMap(data: unknown, base: string): RateMap | null {
  if (!isRecord(data)) return null;
  const map = data[base.toLowerCase()];
  if (!isRecord(map)) return null;

  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(map)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      rates[code.toLowerCase()] = value;
    }
  }
  if (Object.keys(rates).length === 0) return null;

  return { updatedAt: typeof data.date === "string" ? data.date : null, rates };
}

/** Uppercase a parsed rate map into the fiat contract for `base`. */
export function toFiatOut(map: RateMap, base: string): FiatOut {
  const rates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(map.rates)) {
    rates[code.toUpperCase()] = rate;
  }
  return { base, updatedAt: map.updatedAt, rates };
}

/**
 * Derive the crypto contract from a USD rate map: for each curated coin present
 * in the map, price = 1 / rate. Coins absent from the map or with a
 * non-positive/non-finite rate are skipped.
 */
export function deriveCrypto(usd: RateMap): CryptoOut[] {
  const out: CryptoOut[] = [];
  for (const c of CRYPTO_LIST) {
    const rate = usd.rates[c.code];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
    out.push({
      id: c.code,
      symbol: c.symbol,
      name: c.name,
      price: 1 / rate,
      iconUrl: iconUrl(c.symbol),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*"); // public, keyless data
  return new Response(JSON.stringify(body), { ...init, headers });
}

function preflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Generic 502 — upstream error text is never echoed to the client.
const upstreamDown = (): Response =>
  json({ error: "rate provider unavailable" }, { status: 502 });

/**
 * Serve `producer()` through the Workers Cache API keyed by `key`. On a hit we
 * return the cached transformed response and do zero upstream work. On a miss we
 * run the producer (fetch + transform) and cache only a small 200 response —
 * never the raw upstream — then respond. Non-200s (e.g. 502) are not cached.
 * An `X-Cache: HIT|MISS` header makes caching observable.
 */
async function withCache(
  key: string,
  producer: () => Promise<Response>,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(key, { method: "GET" });

  const hit = await cache.match(cacheKey);
  if (hit) {
    const headers = new Headers(hit.headers);
    headers.set("X-Cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers });
  }

  const fresh = await producer();
  if (fresh.status === 200) {
    await cache.put(cacheKey, fresh.clone());
  }
  const headers = new Headers(fresh.headers);
  headers.set("X-Cache", "MISS");
  return new Response(fresh.body, { status: fresh.status, headers });
}

// ---------------------------------------------------------------------------
// Upstream (only runs on a cache miss)
// ---------------------------------------------------------------------------

/**
 * Fetch + parse the CC0 rate map for `base`, trying the jsDelivr CDN then the
 * pages.dev mirror. Returns null when both are unusable. Failures are logged
 * server-side (never leaked to the client) for `wrangler tail` diagnosis.
 */
async function fetchRateMap(base: string): Promise<RateMap | null> {
  for (const url of [primaryUrl(base), fallbackUrl(base)]) {
    try {
      const res = await fetch(url, {
        headers: { "Accept-Encoding": "gzip" },
        cf: { cacheTtl: FIAT_TTL, cacheEverything: true },
      });
      if (!res.ok) {
        console.error(`rate upstream non-200 (${url}): ${res.status}`);
        continue;
      }
      const parsed = parseRateMap(await res.json(), base);
      if (parsed) return parsed;
      console.error(`rate upstream had no usable rates (${url})`);
    } catch (err) {
      console.error(`rate upstream error (${url}): ${String(err)}`);
    }
  }
  return null;
}

async function fetchFiat(base: string): Promise<Response> {
  const map = await fetchRateMap(base);
  if (!map) return upstreamDown();
  return json(toFiatOut(map, base), {
    headers: { "Cache-Control": `public, s-maxage=${FIAT_TTL}` },
  });
}

async function fetchCrypto(): Promise<Response> {
  // Crypto prices live in the same USD rate file (crypto codes are mixed in).
  const map = await fetchRateMap("usd");
  if (!map) return upstreamDown();
  const coins = deriveCrypto(map);
  if (coins.length === 0) {
    console.error("crypto: no coins derived from the rate map");
    return upstreamDown();
  }
  return json(coins, {
    headers: { "Cache-Control": `public, s-maxage=${CRYPTO_TTL}` },
  });
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

async function route(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return preflight();

  const url = new URL(request.url);
  switch (url.pathname) {
    case "/healthz":
      return json({ status: "ok" });

    case "/api/fiat": {
      // Validate the base *before* any upstream call (same rule as the Go backend).
      const base = (url.searchParams.get("base") ?? "USD").trim().toUpperCase();
      if (!BASE_RE.test(base)) {
        return json({ error: "invalid base currency code" }, { status: 400 });
      }
      return withCache(`https://rates-cache.internal/fiat?base=${base}`, () =>
        fetchFiat(base),
      );
    }

    case "/api/crypto":
      return withCache("https://rates-cache.internal/crypto", fetchCrypto);

    default:
      return json({ error: "not found" }, { status: 404 });
  }
}

export default {
  fetch(request: Request): Promise<Response> {
    return route(request);
  },
} satisfies ExportedHandler<Env>;
