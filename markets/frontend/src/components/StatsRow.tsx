import type { StatsData } from "../api/types";
import { formatPct, formatUsd } from "../utils/format";

interface Props {
  stats: StatsData | null;
}

export default function StatsRow({ stats }: Props) {
  const items: { label: string; value: string; positive?: boolean }[] = stats
    ? [
        { label: "1 MONTH", value: formatPct(stats.change1m), positive: stats.change1m >= 0 },
        { label: "YEAR TO DATE", value: formatPct(stats.changeYtd), positive: stats.changeYtd >= 0 },
        { label: "1 YEAR", value: formatPct(stats.change1y), positive: stats.change1y >= 0 },
        { label: "ALL-TIME HIGH", value: formatUsd(stats.athPrice) },
        { label: "12M LOW", value: formatUsd(stats.low12mPrice) },
      ]
    : [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16,
        marginTop: 16,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 20px",
      }}
    >
      {items.length === 0
        ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 40 }} />)
        : items.map((item) => (
            <div key={item.label}>
              <div className="mono-label">{item.label}</div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginTop: 4,
                  color:
                    item.positive === undefined
                      ? "var(--text-primary)"
                      : item.positive
                      ? "var(--accent-green)"
                      : "var(--accent-red)",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
    </div>
  );
}
