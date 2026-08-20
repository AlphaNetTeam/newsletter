export interface SymbolInfo {
  symbol: string;
  name: string;
  assetClass: string;
}

export interface PricePoint {
  t: number;
  price: number;
}

export type DataSource = "live" | "synthetic";
export type RangeKey = "1M" | "3M" | "1Y" | "ALL";

export interface PriceHistoryData {
  symbol: string;
  range: RangeKey;
  unit: string;
  points: PricePoint[];
  source: DataSource;
}

export interface StatsData {
  symbol: string;
  currentPrice: number;
  change1m: number;
  changeYtd: number;
  change1y: number;
  athPrice: number;
  low12mPrice: number;
  source: DataSource;
}

export interface MetricsData {
  symbol: string;
  openInterest: number;
  volume24h: number;
  fundingHourly: number;
  fundingAnnualized: number;
  realizedVol30d: number;
  maxLeverage: number;
  source: DataSource;
}

export interface CorrelationEntry {
  symbol: string;
  correlation: number;
  source: DataSource;
}

export interface CorrelationData {
  baseSymbol: string;
  window: string;
  entries: CorrelationEntry[];
  source: DataSource;
}

export interface AboutFactor {
  title: string;
  description: string;
}

export interface AboutData {
  symbol: string;
  paragraphs: string[];
  factors: AboutFactor[];
  source: "static";
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FaqData {
  symbol: string;
  entries: FaqEntry[];
}

export type NewsSource = "live" | "unavailable";

export interface NewsItemOut {
  title: string;
  url: string;
  source: string;
  publishedAt: number;
}

export interface NewsData {
  symbol: string;
  items: NewsItemOut[];
  source: NewsSource;
}

export interface StrategyOut {
  key: string;
  name: string;
  badges: string[];
  tagline: string;
  description: string;
  type: string;
  version: string;
  liveSince: string;
  trades: number;
  roi: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  capacityPct: number;
  equityCurve: number[];
}

export interface StrategiesData {
  symbol: string;
  strategies: StrategyOut[];
  source: "live" | "synthetic";
}

export interface VolatilityPointOut {
  t: number;
  vol: number;
}

export interface VolatilitySeriesOut {
  points: VolatilityPointOut[];
  current: number;
  high12m: number;
  low12m: number;
  vsBtcMultiple: number | null;
  sp500Current: number | null;
  sp500Source: string;
  source: DataSource;
}

export interface DrawdownEntryOut {
  label: string;
  maxDrawdown: number;
  source: DataSource;
}

export interface VolatilityData {
  symbol: string;
  series: VolatilitySeriesOut;
  drawdownCompare: DrawdownEntryOut[];
  holdingDrawdown: number;
  holdingDrawdownSource: DataSource;
}

export interface Candle {
  openTimeMs: number;
  closeTimeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetCtx {
  symbol: string;
  markPx: number;
  oraclePx: number;
  midPx: number;
  prevDayPx: number;
  fundingHourly: number;
  openInterest: number;
  dayNotionalVolume: number;
  maxLeverage: number;
}

export interface MacroSeries {
  symbol: string;
  closes: Array<[number, number]>;
  source: DataSource;
}

export interface MarketPageData {
  symbol: string;
  name: string;
  assetClass: string;
  symbols: SymbolInfo[];
  points: PricePoint[];
  stats: StatsData;
  metrics: MetricsData;
  correlation: CorrelationData;
  about: AboutData;
  news: NewsData;
  strategies: StrategiesData;
  volatility: VolatilityData;
  faq: FaqData;
}
