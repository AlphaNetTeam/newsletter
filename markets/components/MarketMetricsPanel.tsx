import { formatCompactNumber, formatSmallPct } from "@/lib/format";
import type { MetricsData } from "@/lib/types";

export default function MarketMetricsPanel({ metrics, symbol }: { metrics: MetricsData; symbol: string }) {
  const rows: { label: string; value: string; positive?: boolean }[] = [
    {
      label: `${symbol} FUNDING RATE`,
      value: formatSmallPct(metrics.fundingHourly),
      positive: metrics.fundingHourly >= 0,
    },
    { label: `${symbol} OPEN INTEREST`, value: `${formatCompactNumber(metrics.openInterest)}` },
    { label: `${symbol} 30-DAY VOLATILITY`, value: `${(metrics.realizedVol30d * 100).toFixed(1)}%` },
    { label: `${symbol} 24H VOLUME`, value: `${formatCompactNumber(metrics.volume24h)}` },
    {
      label: `${symbol} 24H LIQUIDATION`,
      value: metrics.liquidation24h != null ? `$${formatCompactNumber(metrics.liquidation24h)}` : "Incorrect source",
    },
  ];

  return (
    <Panel title={`${symbol} Funding Rate & Open Interest on Hyperliquid`} bodyClassName="mk-kv mono">
      {rows.map((r) => (
        <Row key={r.label} label={r.label}>
          <span className={r.positive === undefined ? undefined : r.positive ? "mk-pos" : "mk-neg"}>{r.value}</span>
        </Row>
      ))}
    </Panel>
  );
}

export function Panel({
  title,
  children,
  bodyClassName = "dex-body",
}: {
  title: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="mk-panel">
      <div className="dex-head">
        <span className="dex-title mono">{title}</span>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mk-kv-row">
      <span>{label}</span>
      {children}
    </div>
  );
}
