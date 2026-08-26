import { cache } from "react";
import {
  CORRELATION_REFERENCE_ASSETS,
  SYMBOLS,
  listSymbols,
} from "./config";
import { buildFaq, getAbout } from "./content";
import { fetchAssetCtxs, fetchCandlesFor } from "./hyperliquid";
import { fetchAllMacro } from "./macro";
import {
  getCorrelation,
  getMetrics,
  getPriceSeries,
  getStats,
  getVolatility,
} from "./market";
import { getNewsForSymbol } from "./news";
import { fetchRecentStats } from "./phoenix";
import { getStrategies } from "./strategies";
import type { MarketPageData } from "./types";

export const loadMarketPage = cache(async (symbol: string): Promise<MarketPageData> => {
  const candleSymbols = [
    ...new Set([symbol, "BTC", ...CORRELATION_REFERENCE_ASSETS.filter((s) => s in SYMBOLS)]),
  ];

  const [ctxs, candlesBySymbol, macro, news, strategiesRaw] = await Promise.all([
    fetchAssetCtxs(),
    fetchCandlesFor(candleSymbols),
    fetchAllMacro(),
    getNewsForSymbol(symbol),
    fetchRecentStats(),
  ]);

  const candles = candlesBySymbol[symbol];
  const ctx = ctxs[symbol];
  const livePrice = ctx?.markPx || ctx?.midPx || null;
  const { points } = getPriceSeries(symbol, candles, "ALL");
  const stats = getStats(symbol, candles, livePrice);
  const metrics = getMetrics(symbol, ctx, candles);
  const correlation = getCorrelation(symbol, candlesBySymbol, macro);
  const strategies = getStrategies(symbol, strategiesRaw);
  const volatility = getVolatility(symbol, candlesBySymbol, macro, strategies);
  const about = getAbout(symbol);
  const faq = buildFaq(symbol, strategies, volatility.holdingDrawdown);

  return {
    symbol,
    name: SYMBOLS[symbol].name,
    assetClass: SYMBOLS[symbol].asset_class,
    symbols: listSymbols(),
    points,
    stats,
    metrics,
    correlation,
    about,
    news,
    strategies,
    volatility,
    faq,
  };
});
