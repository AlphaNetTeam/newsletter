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
import { symbolHeroLede, symbolHeroTitle } from "@/lib/seo";
import type { MarketPageData } from "@/lib/types";

export default function StrategyPage({ data }: { data: MarketPageData }) {
  const { symbol } = data;

  return (
    <article>
      <div className="mk-bar">
        <div className="container mk-bar-in">
          <div className="mk-left">
            <CoinSelector symbols={data.symbols} selected={symbol} />
            <DataSourceBadge source={data.stats.source} />
          </div>
          <TabsNav />
        </div>
      </div>

      <section className="mk-intro">
        <div className="container">
          <h1>{symbolHeroTitle(symbol)}</h1>
          <p className="lede-sm">{symbolHeroLede(symbol)}</p>
        </div>
      </section>

      <section id="strategies" aria-labelledby="strategies-heading" className="section">
        <div className="container">
          <StrategiesSection strategies={data.strategies} symbol={symbol} />
        </div>
      </section>

      <section id="price" aria-labelledby="price-heading" className="section">
        <div className="container">
          <hgroup className="section-head">
            <div className="label mono">PRICE</div>
            <h2 id="price-heading">
              Live {symbol} price and market data<span className="accent-dot">.</span>
            </h2>
          </hgroup>

          <div className="mk-price-grid">
            <PriceChart symbol={symbol} points={data.points} />
            <div className="mk-side">
              <MarketMetricsPanel metrics={data.metrics} symbol={symbol} />
              <CorrelationPanel correlation={data.correlation} />
            </div>
          </div>
          <StatsRow stats={data.stats} />
        </div>
      </section>

      <section id="about" aria-labelledby="about-heading" className="section">
        <div className="container">
          <AboutPanel about={data.about} symbol={symbol} />
        </div>
      </section>

      <section id="news" aria-labelledby="news-heading" className="section">
        <div className="container">
          <NewsPanel news={data.news} symbol={symbol} />
        </div>
      </section>

      <section id="volatility" aria-labelledby="volatility-heading" className="section">
        <div className="container">
          <VolatilityPanel volatility={data.volatility} symbol={symbol} />
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-heading" className="section">
        <div className="container">
          <FaqPanel faq={data.faq} symbol={symbol} />
        </div>
      </section>
    </article>
  );
}
