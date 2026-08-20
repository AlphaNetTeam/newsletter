import AboutPanel from "./AboutPanel";
import CoinSelector from "./CoinSelector";
import CorrelationPanel from "./CorrelationPanel";
import DataSourceBadge from "./DataSourceBadge";
import FaqPanel from "./FaqPanel";
import MarketMetricsPanel from "./MarketMetricsPanel";
import NewsPanel from "./NewsPanel";
import PriceChart from "./PriceChart";
import StatsRow from "./StatsRow";
import StrategiesSection from "./StrategiesSection";
import TabsNav from "./TabsNav";
import VolatilityPanel from "./VolatilityPanel";
import type { MarketPageData } from "@/lib/types";

export default function StrategyPage({ data }: { data: MarketPageData }) {
  const { symbol } = data;

  return (
    <article style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 32px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CoinSelector symbols={data.symbols} selected={symbol} />
        <DataSourceBadge source={data.stats.source} />
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
            borderRadius: 8,
            color: "#fff",
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
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
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            color: "var(--text-primary)",
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Compare strategies
        </a>
      </div>

      <TabsNav />

      <section
        id="price"
        aria-labelledby="price-heading"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 20,
          marginTop: 24,
        }}
      >
        <h2 id="price-heading" className="sr-only">
          {symbol} price
        </h2>
        <div>
          <PriceChart symbol={symbol} points={data.points} />
          <StatsRow stats={data.stats} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MarketMetricsPanel metrics={data.metrics} />
          <CorrelationPanel correlation={data.correlation} />
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 48,
          marginTop: 56,
        }}
      >
        <AboutPanel about={data.about} symbol={symbol} />
        <NewsPanel news={data.news} />
      </div>

      <div style={{ marginTop: 56 }}>
        <StrategiesSection strategies={data.strategies} symbol={symbol} />
      </div>

      <div style={{ marginTop: 56 }}>
        <VolatilityPanel volatility={data.volatility} symbol={symbol} />
      </div>

      <div style={{ marginTop: 56 }}>
        <FaqPanel faq={data.faq} symbol={symbol} />
      </div>
    </article>
  );
}
