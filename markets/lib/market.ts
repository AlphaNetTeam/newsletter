import {
  BASE_CORRELATION_TARGETS,
  CORRELATION_REFERENCE_ASSETS,
  CORRELATION_WINDOW_DAYS,
  RANGE_DAYS,
  SYMBOLS,
  VOL_LOOKBACK_DAYS,
  VOL_WINDOW_DAYS,
  fallbackCfg,
} from "./config";
import { generateDailyReturns, generateDailySeries } from "./generator";
import type {
  AssetCtx,
  Candle,
  CorrelationData,
  DataSource,
  MacroSeries,
  MetricsData,
  PricePoint,
  RangeKey,
  StatsData,
  StrategiesData,
  VolatilityData,
} from "./types";

function roundPrice(value: number): number {
  const digits = value < 10 ? 6 : 2;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function pctChange(old: number, next: number): number {
  if (old === 0) return 0;
  return Math.round(((next - old) / old) * 10000) / 10000;
}

function sliceDays(points: PricePoint[], days: number): PricePoint[] {
  return points.slice(-days);
}

export function candlesToPoints(candles: Candle[]): PricePoint[] {
  return candles.map((c) => ({ t: c.openTimeMs, price: c.close }));
}

export function getPriceSeries(
  symbol: string,
  candles: Candle[] | undefined,
  range: RangeKey,
): { points: PricePoint[]; source: DataSource } {
  const days = RANGE_DAYS[range];
  if (candles && candles.length) {
    return { points: sliceDays(candlesToPoints(candles), days), source: "live" };
  }
  return { points: generateDailySeries(symbol, fallbackCfg(symbol), days), source: "synthetic" };
}

export function getStats(
  symbol: string,
  candles: Candle[] | undefined,
  livePrice: number | null,
): StatsData {
  const all = getPriceSeries(symbol, candles, "ALL");
  const oneMonth = getPriceSeries(symbol, candles, "1M");
  const oneYear = getPriceSeries(symbol, candles, "1Y");

  let currentPrice = all.points[all.points.length - 1]?.price ?? 0;
  let source = all.source;
  if (livePrice != null && livePrice > 0) {
    currentPrice = livePrice;
    source = "live";
  }

  const now = new Date();
  const jan1 = Date.UTC(now.getUTCFullYear(), 0, 1);
  const ytdStart = all.points.reduce((best, p) =>
    Math.abs(p.t - jan1) < Math.abs(best.t - jan1) ? p : best,
  );

  const withCurrent = [...all.points, { t: 0, price: currentPrice }];
  const yearWithCurrent = [...oneYear.points, { t: 0, price: currentPrice }];

  return {
    symbol,
    currentPrice: roundPrice(currentPrice),
    change1m: pctChange(oneMonth.points[0]?.price ?? currentPrice, currentPrice),
    changeYtd: pctChange(ytdStart.price, currentPrice),
    change1y: pctChange(oneYear.points[0]?.price ?? currentPrice, currentPrice),
    athPrice: roundPrice(Math.max(...withCurrent.map((p) => p.price))),
    low12mPrice: roundPrice(Math.min(...yearWithCurrent.map((p) => p.price))),
    source,
  };
}

function realizedVol(prices: number[]): number | null {
  if (prices.length < 2) return null;
  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  if (!logReturns.length) return null;
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / logReturns.length;
  return Math.round(Math.sqrt(variance) * Math.sqrt(365) * 10000) / 10000;
}

export function getMetrics(
  symbol: string,
  ctx: AssetCtx | undefined,
  candles: Candle[] | undefined,
): MetricsData {
  const realized = candles ? realizedVol(candles.slice(-31).map((c) => c.close)) : null;
  if (ctx) {
    return {
      symbol,
      openInterest: Math.round(ctx.openInterest * ctx.markPx * 100) / 100,
      volume24h: Math.round(ctx.dayNotionalVolume * 100) / 100,
      fundingHourly: Math.round(ctx.fundingHourly * 1e6) / 1e6,
      fundingAnnualized: Math.round(ctx.fundingHourly * 24 * 365 * 10000) / 10000,
      realizedVol30d: realized ?? 0,
      maxLeverage: ctx.maxLeverage,
      source: "live",
    };
  }
  const cfg = SYMBOLS[symbol];
  return {
    symbol,
    openInterest: cfg.fallback_open_interest,
    volume24h: cfg.fallback_volume_24h,
    fundingHourly: 0,
    fundingAnnualized: 0,
    realizedVol30d: realized ?? 0.35,
    maxLeverage: cfg.fallback_max_leverage,
    source: "synthetic",
  };
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aa = a.slice(-n);
  const bb = b.slice(-n);
  const meanA = aa.reduce((x, y) => x + y, 0) / n;
  const meanB = bb.reduce((x, y) => x + y, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = aa[i] - meanA;
    const db = bb[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : cov / denom;
}

function dailyReturnsFromCloses(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return out;
}

function realReturnsFor(
  symbol: string,
  days: number,
  candlesBySymbol: Record<string, Candle[]>,
  macro: Record<string, MacroSeries>,
): number[] | null {
  if (symbol in SYMBOLS) {
    const candles = candlesBySymbol[symbol];
    if (candles && candles.length > days) {
      return dailyReturnsFromCloses(candles.slice(-(days + 1)).map((c) => c.close));
    }
    return null;
  }
  const series = macro[symbol];
  if (series && series.source === "live" && series.closes.length > days) {
    return dailyReturnsFromCloses(series.closes.slice(-(days + 1)).map(([, px]) => px));
  }
  return null;
}

export function getCorrelation(
  symbol: string,
  candlesBySymbol: Record<string, Candle[]>,
  macro: Record<string, MacroSeries>,
  window = "90d",
): CorrelationData {
  const days = CORRELATION_WINDOW_DAYS;
  const others = CORRELATION_REFERENCE_ASSETS.filter((a) => a !== symbol).slice(0, 5);
  const baseReal = realReturnsFor(symbol, days, candlesBySymbol, macro);
  const baseSynthetic = generateDailyReturns(symbol, days, "corr-base");

  let anySynthetic = false;
  const entries = others.map((other) => {
    const otherReal = realReturnsFor(other, days, candlesBySymbol, macro);
    if (baseReal && otherReal) {
      return {
        symbol: other,
        correlation: Math.round(pearson(baseReal, otherReal) * 100) / 100,
        source: "live" as const,
      };
    }
    anySynthetic = true;
    const target = BASE_CORRELATION_TARGETS[other] ?? 0.3;
    const noise = generateDailyReturns(other, days, `corr-noise:${symbol}`);
    const blended = baseSynthetic.map(
      (v, i) => target * v + Math.sqrt(Math.max(0, 1 - target ** 2)) * noise[i],
    );
    return {
      symbol: other,
      correlation: Math.round(pearson(baseSynthetic, blended) * 100) / 100,
      source: "synthetic" as const,
    };
  });

  return {
    baseSymbol: symbol,
    window,
    entries,
    source: anySynthetic ? "synthetic" : "live",
  };
}

function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let worst = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    else if (peak > 0) worst = Math.max(worst, (peak - p) / peak);
  }
  return worst;
}

function rollingRealizedVol(
  closes: number[],
  timestamps: number[],
  window: number,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = window; i < closes.length; i++) {
    const vol = realizedVol(closes.slice(i - window, i + 1));
    if (vol != null) out.push([timestamps[i], vol]);
  }
  return out;
}

export function getVolatility(
  symbol: string,
  candlesBySymbol: Record<string, Candle[]>,
  macro: Record<string, MacroSeries>,
  strategies: StrategiesData,
): VolatilityData {
  const candles = candlesBySymbol[symbol];
  let closes: number[];
  let timestamps: number[];
  let seriesSource: DataSource;

  if (candles && candles.length >= VOL_WINDOW_DAYS + 30) {
    closes = candles.map((c) => c.close);
    timestamps = candles.map((c) => c.openTimeMs);
    seriesSource = "live";
  } else {
    const points = generateDailySeries(symbol, fallbackCfg(symbol), RANGE_DAYS.ALL);
    closes = points.map((p) => p.price);
    timestamps = points.map((p) => p.t);
    seriesSource = "synthetic";
  }

  const volSeries = rollingRealizedVol(closes, timestamps, VOL_WINDOW_DAYS);
  const trailing =
    volSeries.length > VOL_LOOKBACK_DAYS ? volSeries.slice(-VOL_LOOKBACK_DAYS) : volSeries;
  const current = trailing[trailing.length - 1]?.[1] ?? 0;
  const high12m = trailing.length ? Math.max(...trailing.map(([, v]) => v)) : 0;
  const low12m = trailing.length ? Math.min(...trailing.map(([, v]) => v)) : 0;

  let vsBtc: number | null;
  if (symbol === "BTC") {
    vsBtc = 1;
  } else {
    const btcCandles = candlesBySymbol.BTC;
    let btcVol: number | null = null;
    if (btcCandles && btcCandles.length >= 31) {
      btcVol = realizedVol(btcCandles.slice(-31).map((c) => c.close));
    } else {
      const btcPoints = generateDailySeries("BTC", fallbackCfg("BTC"), RANGE_DAYS.ALL);
      btcVol = realizedVol(btcPoints.slice(-31).map((p) => p.price));
    }
    vsBtc = btcVol ? Math.round((current / btcVol) * 100) / 100 : null;
  }

  const spx = macro.SPX;
  let sp500Current: number | null = null;
  let sp500Source = "unavailable";
  if (spx && spx.closes.length >= 31) {
    sp500Current = realizedVol(spx.closes.slice(-31).map(([, px]) => px));
    sp500Source = spx.source;
  }

  const holdingWindow =
    closes.length > VOL_LOOKBACK_DAYS ? closes.slice(-VOL_LOOKBACK_DAYS) : closes;
  const holdingDd = maxDrawdown(holdingWindow);

  const drawdownCompare = [
    ...strategies.strategies.map((s) => ({
      label: s.name,
      maxDrawdown: s.maxDrawdown,
      source: strategies.source,
    })),
    {
      label: `Holding ${symbol}`,
      maxDrawdown: Math.round(holdingDd * 10000) / 10000,
      source: seriesSource,
    },
  ];

  return {
    symbol,
    series: {
      points: trailing.map(([t, vol]) => ({ t, vol })),
      current: Math.round(current * 10000) / 10000,
      high12m: Math.round(high12m * 10000) / 10000,
      low12m: Math.round(low12m * 10000) / 10000,
      vsBtcMultiple: vsBtc,
      sp500Current: sp500Current != null ? Math.round(sp500Current * 10000) / 10000 : null,
      sp500Source,
      source: seriesSource,
    },
    drawdownCompare,
    holdingDrawdown: Math.round(holdingDd * 10000) / 10000,
    holdingDrawdownSource: seriesSource,
  };
}
