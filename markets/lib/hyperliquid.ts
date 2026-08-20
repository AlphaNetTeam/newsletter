import { BROWSER_UA, HYPERLIQUID_INFO_URL, RANGE_DAYS, SYMBOLS } from "./config";
import type { AssetCtx, Candle } from "./types";

function toFloat(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function postInfo<T>(body: unknown, revalidate: number): Promise<T> {
  const res = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": BROWSER_UA,
    },
    body: JSON.stringify(body),
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchAssetCtxs(): Promise<Record<string, AssetCtx>> {
  try {
    const [meta, assetCtxs] = await postInfo<[ { universe?: Array<{ name?: string; maxLeverage?: number }> }, Array<Record<string, unknown>> ]>(
      { type: "metaAndAssetCtxs" },
      15,
    );
    const universe = meta?.universe ?? [];
    const out: Record<string, AssetCtx> = {};
    for (let i = 0; i < universe.length; i++) {
      if (i >= assetCtxs.length) break;
      const symbol = universe[i]?.name;
      if (!symbol || !(symbol in SYMBOLS)) continue;
      const ctx = assetCtxs[i];
      out[symbol] = {
        symbol,
        markPx: toFloat(ctx.markPx),
        oraclePx: toFloat(ctx.oraclePx),
        midPx: toFloat(ctx.midPx),
        prevDayPx: toFloat(ctx.prevDayPx),
        fundingHourly: toFloat(ctx.funding),
        openInterest: toFloat(ctx.openInterest),
        dayNotionalVolume: toFloat(ctx.dayNtlVlm),
        maxLeverage: Number(universe[i].maxLeverage) || 0,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function fetchCandles(symbol: string): Promise<Candle[]> {
  const endMs = Date.now();
  const startMs = endMs - RANGE_DAYS.ALL * 24 * 60 * 60 * 1000;
  try {
    const raw = await postInfo<Array<Record<string, unknown>>>(
      {
        type: "candleSnapshot",
        req: { coin: symbol, interval: "1d", startTime: startMs, endTime: endMs },
      },
      300,
    );
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c) => ({
        openTimeMs: Number(c.t),
        closeTimeMs: Number(c.T),
        open: toFloat(c.o),
        high: toFloat(c.h),
        low: toFloat(c.l),
        close: toFloat(c.c),
        volume: toFloat(c.v),
      }))
      .filter((c) => Number.isFinite(c.openTimeMs) && c.close > 0)
      .sort((a, b) => a.openTimeMs - b.openTimeMs);
  } catch {
    return [];
  }
}

export async function fetchCandlesFor(symbols: string[]): Promise<Record<string, Candle[]>> {
  const unique = [...new Set(symbols)];
  const entries = await Promise.all(
    unique.map(async (sym) => [sym, await fetchCandles(sym)] as const),
  );
  return Object.fromEntries(entries);
}
