import type { MetricsData } from "../api/types";
import { formatCompactNumber, formatPct, formatSmallPct } from "../utils/format";

interface Props {
  metrics: MetricsData | null;
}

export default function MarketMetricsPanel({ metrics }: Props) {
  const rows: { label: string; value: string; positive?: boolean }[] = metrics
    ? [
        { label: "Open interest", value: `$${formatCompactNumber(metrics.openInterest)}` },
        { label: "24h volume", value: `$${formatCompactNumber(metrics.volume24h)}` },
        {
          // Hyperliquid settles funding hourly, and this is that hourly
          // rate exactly as their API reports it — not derived/multiplied.
          // formatSmallPct (not formatPct) because at 1h scale the rate is
          // small enough that a single decimal place rounds it to 0.0%.
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
      ]
    : [];

  return (
    <Panel title="HYPERLIQUID MARKET METRICS">
      {rows.length === 0 ? (
        <SkeletonRows count={6} />
      ) : (
        rows.map((r) => (
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
        ))
      )}
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

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 16, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
      ))}
    </>
  );
}
