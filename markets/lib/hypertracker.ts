import {
  HYPERTRACKER_API_KEY,
  HYPERTRACKER_BASE_URL,
  HYPERTRACKER_REVALIDATE_SECONDS,
} from "./config";

interface LiquidationFill {
  coin?: string;
  px?: number | string;
  sz?: number | string;
  side?: string;
}

interface LiquidationFillsResponse {
  fills?: LiquidationFill[];
  nextCursor?: string;
}

// 24h liquidation volume in USD for `symbol` on Hyperliquid, from
// HyperTracker (docs.coinmarketman.com). Unlike CoinGlass/CoinAnk, this
// indexes Hyperliquid's own liquidation fills directly rather than
// aggregating third-party exchange stats, and has a genuine free tier
// (100 tokens/day). We sum notional value (price * size) across every
// liquidation fill for `symbol` in the trailing 24h, capped at one page
// (limit=500) so each fetch costs one token. Returns null — never a
// fabricated number — when the key is missing, the request fails, or the
// response can't be parsed; render that as "Incorrect source". A genuine
// zero (no liquidations in the window) is returned as 0, not null.
export async function fetchLiquidation24h(symbol: string): Promise<number | null> {
  // Every failure below renders identically as "Incorrect source", so log a
  // distinguishable reason to the server journal. The key itself is never
  // logged — only whether it is present and how long it is, which is enough
  // to catch an empty, truncated or quote-wrapped value.
  if (!HYPERTRACKER_API_KEY) {
    console.warn(
      `[hypertracker] ${symbol}: HYPERTRACKER_API_KEY is empty in this process — request skipped`,
    );
    return null;
  }
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const url =
      `${HYPERTRACKER_BASE_URL}/api/external/fills/liquidation?coin=${encodeURIComponent(symbol)}` +
      `&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&limit=500`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HYPERTRACKER_API_KEY}` },
      next: { revalidate: HYPERTRACKER_REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[hypertracker] ${symbol}: HTTP ${res.status} ${res.statusText} ` +
          `(keyLen=${HYPERTRACKER_API_KEY.length}) ${body.slice(0, 200)}`,
      );
      return null;
    }
    const json = (await res.json()) as LiquidationFillsResponse;
    const fills = json.fills;
    if (!Array.isArray(fills)) {
      console.warn(
        `[hypertracker] ${symbol}: unexpected response shape, keys=[${Object.keys(json ?? {}).join(",")}]`,
      );
      return null;
    }

    let total = 0;
    for (const f of fills) {
      const px = Number(f.px);
      const sz = Number(f.sz);
      if (Number.isFinite(px) && Number.isFinite(sz)) {
        total += Math.abs(px * sz);
      }
    }
    console.info(`[hypertracker] ${symbol}: ok, ${fills.length} fills, total=${Math.round(total)}`);
    return total;
  } catch (err) {
    console.warn(
      `[hypertracker] ${symbol}: request threw — ` +
        `${err instanceof Error ? `${err.name}: ${err.message}` : String(err)} ` +
        `(keyLen=${HYPERTRACKER_API_KEY.length})`,
    );
    return null;
  }
}
