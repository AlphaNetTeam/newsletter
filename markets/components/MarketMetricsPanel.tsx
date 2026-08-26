import { formatCompactNumber, formatPct, formatSmallPct } from "@/lib/format";
import type { MetricsData } from "@/lib/types";

export default function MarketMetricsPanel({ metrics }: { metrics: MetricsData }) {
  const rows: { label: string; value: string; positive?: boolean }[] = [
    { label: "Open interest", value: `$${formatCompactNumber(metrics.openInterest)}` },
    { label: "24h volume", value: `$${formatCompactNumber(metrics.volume24h)}` },
    {
      label: "Funding Rate",
      value: formatSmallPct(metrics.fundingHourly),
      positive: metrics.fundingHourly >= 0,
    },
    {
      label: "Funding annualised",
      value: formatPct(metrics.fundingAnnualized),
      positive: metrics.fundingAnnualized >= 0,
    },
    { label: "30d realised vol", value: `${(metrics.realizedVol30d * 100).toFixed(1)}%` },
    { label: "Max leverage", value: `${metrics.maxLeverage}×` },
  ];

  return (
    <Panel title="HYPERLIQUID MARKET METRICS">
      {rows.map((r) => (
        <Row key={r.label} label={r.label}>
          <span
            style={{
              color:
                r.positive === undefined
                  ? "var(--text-primary)"
                  : r.positive
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
              fontWeight: 600,
            }}
          >
            {r.value}
          </span>
        </Row>
      ))}
    </Panel>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 18,
      }}
    >
      <div className="mono-label" style={{ marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      {children}
    </div>
  );
}
