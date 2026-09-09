import data from "./config-data.json";
import type { RangeKey, SymbolInfo } from "./types";

export interface SymbolConfig {
  name: string;
  asset_class: string;
  fallback_start_price: number;
  fallback_current_price: number;
  fallback_volatility: number;
  fallback_open_interest: number;
  fallback_volume_24h: number;
  fallback_max_leverage: number;
}

export interface MacroFallbackConfig {
  name: string;
  fallback_start_price: number;
  fallback_current_price: number;
  fallback_volatility: number;
}

export const SYMBOLS = data.SYMBOLS as Record<string, SymbolConfig>;
export const MACRO_FALLBACK = data.MACRO_FALLBACK as Record<string, MacroFallbackConfig>;
export const CORRELATION_REFERENCE_ASSETS = data.CORRELATION_REFERENCE_ASSETS as string[];
export const BASE_CORRELATION_TARGETS = data.BASE_CORRELATION_TARGETS as Record<string, number>;
export const RANGE_DAYS = data.RANGE_DAYS as Record<RangeKey, number>;
export const ABOUT_CONTENT = data.ABOUT_CONTENT as Record<
  string,
  { paragraphs: string[]; factors: { title: string; description: string }[] }
>;
export const STRATEGY_DESCRIPTIONS = data.STRATEGY_DESCRIPTIONS as Record<string, string>;
export const STRATEGY_DESCRIPTION_FALLBACK = data.STRATEGY_DESCRIPTION_FALLBACK as string;
export const STRATEGY_DEFS = data.STRATEGY_DEFS as Array<{
  key: string;
  name: string;
  badges: string[];
  tagline: string;
  type: string;
  version: string;
  liveSince: string;
  trades: number;
  base_roi: number;
  base_sharpe: number;
  base_max_drawdown: number;
  base_win_rate: number;
  base_capacity_pct: number;
}>;
export const RSS_FEEDS = data.RSS_FEEDS as Array<{
  name: string;
  url: string;
  headers?: Record<string, string>;
}>;
export const NEWS_KEYWORDS = data.NEWS_KEYWORDS as Record<string, string[]>;

export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
export const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";

export const STOOQ_CSV_URL = "https://stooq.com/q/d/l/";
export const STOOQ_TICKERS: Record<string, string> = { SPX: "^spx", XAU: "xauusd" };

export const PHOENIX_RECENT_STAT_URL =
  "https://alphanet.phoenix.global/api/orderly/trade/recentStat";
export const PHOENIX_RECENT_STAT_WINDOW_DAYS = 30;
export const STRATEGIES_TOP_N = 4;

export const NEWS_MAX_ITEMS_PER_FEED = 30;
export const NEWS_ITEMS_PER_SYMBOL = 6;

export const VOL_WINDOW_DAYS = 30;
export const VOL_LOOKBACK_DAYS = 365;
export const CORRELATION_WINDOW_DAYS = 90;

export const DEFAULT_SYMBOL = "BTC";

export const SITE_NAME = "AlphaNet";
export const BASE_PATH = "/markets";
export const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  `http://localhost:3000${BASE_PATH}`
).replace(/\/$/, "");

export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// HyperTracker (docs.coinmarketman.com) — used only for the "24H
// LIQUIDATION" metric, which Hyperliquid's own info API does not expose.
// Unlike CoinGlass/CoinAnk this indexes Hyperliquid's raw liquidation fills
// directly and has a genuine free tier. Requires HYPERTRACKER_API_KEY; when
// it's not configured, or the request fails, the metrics panel shows
// "Incorrect source" instead of a fabricated number.
export const HYPERTRACKER_BASE_URL = "https://ht-api.coinmarketman.com";
export const HYPERTRACKER_API_KEY = process.env.HYPERTRACKER_API_KEY || "";
// Free tier is 100 requests/day and this project has 15 symbol pages, each
// doing one liquidation fetch per revalidation window. Note a full
// `npm run build` also costs 15 requests up front, because
// generateStaticParams pre-renders every symbol — so a day with a few
// redeploys can burn the quota fast. At 24h the steady-state cost is
// 15 requests/day, leaving room for several builds on top; the previous
// 6h setting cost 60/day and left almost none.
export const HYPERTRACKER_REVALIDATE_SECONDS = 86400;

export function listSymbols(): SymbolInfo[] {
  return Object.entries(SYMBOLS).map(([symbol, cfg]) => ({
    symbol,
    name: cfg.name,
    assetClass: cfg.asset_class,
  }));
}

export function isKnownSymbol(symbol: string): boolean {
  return symbol in SYMBOLS;
}

export function fallbackCfg(symbol: string) {
  const cfg = SYMBOLS[symbol];
  return {
    start_price: cfg.fallback_start_price,
    current_price: cfg.fallback_current_price,
    volatility: cfg.fallback_volatility,
  };
}
