import {
  BROWSER_UA,
  MACRO_FALLBACK,
  RANGE_DAYS,
  STOOQ_CSV_URL,
  STOOQ_TICKERS,
} from "./config";
import { generateDailySeries } from "./generator";
import type { MacroSeries } from "./types";

async function fetchStooqCsv(ticker: string): Promise<Array<[number, number]> | null> {
  try {
    const url = `${STOOQ_CSV_URL}?s=${encodeURIComponent(ticker)}&i=d`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      next: { revalidate: 6 * 60 * 60 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    if (!lines[0] || !lines[0].includes("Date")) return null;

    const header = lines[0].split(",");
    const dateIdx = header.indexOf("Date");
    const closeIdx = header.indexOf("Close");
    if (dateIdx < 0 || closeIdx < 0) return null;

    const out: Array<[number, number]> = [];
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const cols = line.split(",");
      const date = Date.parse(`${cols[dateIdx]}T00:00:00Z`);
      const close = Number(cols[closeIdx]);
      if (!Number.isFinite(date) || !Number.isFinite(close)) continue;
      out.push([date, close]);
    }
    out.sort((a, b) => a[0] - b[0]);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export async function fetchMacroSeries(symbol: string): Promise<MacroSeries | null> {
  const ticker = STOOQ_TICKERS[symbol];
  if (!ticker) return null;

  const closes = await fetchStooqCsv(ticker);
  if (closes) {
    const cutoff = Date.now() - RANGE_DAYS.ALL * 24 * 60 * 60 * 1000;
    const trimmed = closes.filter((p) => p[0] >= cutoff);
    return {
      symbol,
      closes: trimmed.length ? trimmed : closes.slice(-RANGE_DAYS.ALL),
      source: "live",
    };
  }

  const cfg = MACRO_FALLBACK[symbol];
  if (!cfg) return null;
  const points = generateDailySeries(
    symbol,
    {
      start_price: cfg.fallback_start_price,
      current_price: cfg.fallback_current_price,
      volatility: cfg.fallback_volatility,
    },
    RANGE_DAYS.ALL,
  );
  return {
    symbol,
    closes: points.map((p) => [p.t, p.price]),
    source: "synthetic",
  };
}

export async function fetchAllMacro(): Promise<Record<string, MacroSeries>> {
  const symbols = Object.keys(STOOQ_TICKERS);
  const series = await Promise.all(symbols.map((s) => fetchMacroSeries(s)));
  const out: Record<string, MacroSeries> = {};
  for (const item of series) {
    if (item) out[item.symbol] = item;
  }
  return out;
}
