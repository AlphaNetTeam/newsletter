import { cache } from "react";
import {
  CORRELATION_REFERENCE_ASSETS,
  STRATEGY_WINDOW_ORDER,
  SYMBOLS,
  listSymbols,
} from "./config";
import { buildFaq, getAbout } from "./content";
import { fetchLiquidation24h } from "./hypertracker";
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
import { fetchLiveWindowStats, fetchStatsForWindow } from "./phoenix";
import { getStrategies } from "./strategies";
import type { MarketPageData } from "./types";

export const loadMarketPage = cache(async (symbol: string): Promise<MarketPageData> => {
  const candleSymbols = [
    ...new Set([symbol, "BTC", ...CORRELATION_REFERENCE_ASSETS.filter((s) => s in SYMBOLS)]),
  ];

  const [ctxs, candlesBySymbol, macro, news, windowRaws, strategiesLiveRaw, liquidation24h] =
    await Promise.all([
      fetchAssetCtxs(),
      fetchCandlesFor(candleSymbols),
      fetchAllMacro(),
      getNewsForSymbol(symbol),
      // One request per selectable window so the table's toggle is instant.
      // These URLs carry no symbol, so all 15 symbol pages share the same
      // cached responses rather than multiplying the upstream load.
      Promise.all(STRATEGY_WINDOW_ORDER.map((w) => fetchStatsForWindow(w))),
      fetchLiveWindowStats(),
      fetchLiquidation24h(symbol),
    ]);
  const strategiesRawByWindow = Object.fromEntries(
    STRATEGY_WINDOW_ORDER.map((w, i) => [w, windowRaws[i]]),
  );

  const candles = candlesBySymbol[symbol];
  const ctx = ctxs[symbol];
  const livePrice = ctx?.markPx || ctx?.midPx || null;
  const { points } = getPriceSeries(symbol, candles, "ALL");
  const stats = getStats(symbol, candles, livePrice);
  const metrics = getMetrics(symbol, ctx, candles, liquidation24h);
  const correlation = getCorrelation(symbol, candlesBySymbol, macro);
  const strategies = getStrategies(symbol, strategiesRawByWindow, strategiesLiveRaw);
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
