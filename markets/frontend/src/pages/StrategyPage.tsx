import { useEffect, useState } from "react";
import { marketApi } from "../api/client";
import type {
  AboutData,
  CorrelationData,
  FaqData,
  MetricsData,
  NewsData,
  PricePoint,
  RangeKey,
  StatsData,
  StrategiesData,
  SymbolInfo,
  VolatilityData,
} from "../api/types";
import AboutPanel from "../components/AboutPanel";
import CoinSelector from "../components/CoinSelector";
import CorrelationPanel from "../components/CorrelationPanel";
import DataSourceBadge from "../components/DataSourceBadge";
import FaqPanel from "../components/FaqPanel";
import MarketMetricsPanel from "../components/MarketMetricsPanel";
import NewsPanel from "../components/NewsPanel";
import PriceChart from "../components/PriceChart";
import StatsRow from "../components/StatsRow";
import StrategiesSection from "../components/StrategiesSection";
import TabsNav, { type TabKey } from "../components/TabsNav";
import VolatilityPanel from "../components/VolatilityPanel";
import { useInterval } from "../hooks/useInterval";
import { useLiveMids } from "../hooks/useLiveMids";

// REST polling fallback/complement cadences. The websocket (useLiveMids)
// covers second-by-second price ticks; these intervals keep the
// derived/aggregate panels (stats, metrics, correlation, daily candles)
// fresh even if a client never gets a websocket connection through, and
// keep the chart's own history in sync with newly-closed daily candles.
const STATS_POLL_MS = 15_000;
const HISTORY_POLL_MS = 60_000;
const NEWS_POLL_MS = 120_000; // RSS feeds only refresh server-side every ~10min anyway

export default function StrategyPage() {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [symbol, setSymbol] = useState("BTC");
  const [tab, setTab] = useState<TabKey>("Price");
  const [range, setRange] = useState<RangeKey>("ALL");

  const [points, setPoints] = useState<PricePoint[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [about, setAbout] = useState<AboutData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [strategies, setStrategies] = useState<StrategiesData | null>(null);
  const [volatility, setVolatility] = useState<VolatilityData | null>(null);
  const [faq, setFaq] = useState<FaqData | null>(null);

  // Real-time mid prices pushed from the backend's /ws/prices relay
  // (which itself relays Hyperliquid's live allMids feed).
  const { mids, connected: liveConnected } = useLiveMids();

  // Symbol list — fetched once.
  useEffect(() => {
    marketApi
      .listSymbols()
      .then(setSymbols)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const refreshStatsPanels = () => {
    Promise.all([
      marketApi.stats(symbol),
      marketApi.metrics(symbol),
      marketApi.correlation(symbol),
    ])
      .then(([s, m, c]) => {
        setStats(s);
        setMetrics(m);
        setCorrelation(c);
      })
      .catch((e) => setError(String(e.message ?? e)));
  };

  // Stats / metrics / correlation refresh whenever the selected symbol changes...
  useEffect(() => {
    setStats(null);
    setMetrics(null);
    setCorrelation(null);
    refreshStatsPanels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ...and again on a fixed interval, so the current price / funding /
  // open interest / correlation panels keep auto-updating even without
  // the user touching anything. This is the REST-polling half of the
  // "real-time" requirement; the websocket above covers the fast path.
  useInterval(refreshStatsPanels, STATS_POLL_MS);

  const refreshHistory = (showLoading: boolean) => {
    if (showLoading) setChartLoading(true);
    marketApi
      .priceHistory(symbol, range)
      .then((d) => setPoints(d.points))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => {
        if (showLoading) setChartLoading(false);
      });
  };

  // Chart series refreshes on symbol or range change...
  useEffect(() => {
    refreshHistory(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, range]);

  // ...and periodically thereafter (no loading flicker) so a freshly
  // closed daily candle shows up without a manual reload.
  useInterval(() => refreshHistory(false), HISTORY_POLL_MS);

  // About + Strategies are effectively static per symbol (editorial copy
  // / a deterministically-seeded example table with no time dependence),
  // so these only need to refetch when the symbol changes — no polling.
  useEffect(() => {
    setAbout(null);
    setStrategies(null);
    marketApi.about(symbol).then(setAbout).catch((e) => setError(String(e.message ?? e)));
    marketApi.strategies(symbol).then(setStrategies).catch((e) => setError(String(e.message ?? e)));
  }, [symbol]);

  // News refreshes on symbol change and periodically thereafter — the
  // backend's own RSS refresh loop runs every ~10min, so polling faster
  // than that just re-reads the same cached pool, which is fine (cheap).
  const refreshNews = () => {
    marketApi.news(symbol).then(setNews).catch((e) => setError(String(e.message ?? e)));
  };
  useEffect(() => {
    setNews(null);
    refreshNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  useInterval(refreshNews, NEWS_POLL_MS);

  // Volatility (real rolling realized-vol series + real holding drawdown)
  // and the FAQ (which quotes the holding-drawdown figure) move together
  // with the daily candle refresh cadence.
  const refreshVolatilityAndFaq = () => {
    marketApi
      .volatility(symbol)
      .then(setVolatility)
      .catch((e) => setError(String(e.message ?? e)));
    marketApi.faq(symbol).then(setFaq).catch((e) => setError(String(e.message ?? e)));
  };
  useEffect(() => {
    setVolatility(null);
    setFaq(null);
    refreshVolatilityAndFaq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  useInterval(refreshVolatilityAndFaq, HISTORY_POLL_MS);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 32px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CoinSelector symbols={symbols} selected={symbol} onChange={setSymbol} />
        <DataSourceBadge source={stats?.source ?? null} />
      </div>

      <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: "16px 0 24px" }}>
        {symbol} trading strategy
      </h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        <a
          href={`https://trade.alphanet.global/perp/PERP_${symbol}_USDC`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, var(--accent-blue), var(--accent-blue-2))",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Deploy on {symbol}
        </a>
        <a
          href="https://trade.alphanet.global/strategies"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "transparent",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            color: "var(--text-primary)",
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Compare strategies
        </a>
      </div>

      <TabsNav active={tab} onChange={setTab} />

      {error && (
        <div style={{ marginTop: 20, color: "var(--accent-red)", fontSize: 13 }}>
          Couldn't reach the API: {error}. Is the backend running on the configured
          VITE_API_BASE_URL?
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 20,
          marginTop: 24,
        }}
      >
        <div>
          <PriceChart
            symbol={symbol}
            points={points}
            range={range}
            onRangeChange={setRange}
            loading={chartLoading}
            livePrice={mids[symbol] ?? null}
            liveConnected={liveConnected}
          />
          <StatsRow stats={stats} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MarketMetricsPanel metrics={metrics} />
          <CorrelationPanel correlation={correlation} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 48,
          marginTop: 56,
        }}
      >
        <AboutPanel about={about} symbol={symbol} />
        <NewsPanel news={news} />
      </div>

      <div style={{ marginTop: 56 }}>
        <StrategiesSection strategies={strategies} symbol={symbol} />
      </div>

      <div style={{ marginTop: 56 }}>
        <VolatilityPanel volatility={volatility} symbol={symbol} />
      </div>

      <div style={{ marginTop: 56 }}>
        <FaqPanel faq={faq} symbol={symbol} />
      </div>
    </main>
  );
}
