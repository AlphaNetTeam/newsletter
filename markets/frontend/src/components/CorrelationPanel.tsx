import type { CorrelationData } from "../api/types";
import { Panel } from "./MarketMetricsPanel";

interface Props {
  correlation: CorrelationData | null;
}

export default function CorrelationPanel({ correlation }: Props) {
  const entries = correlation?.entries ?? [];

  return (
    <Panel title="CORRELATION, 90D">
      {entries.length === 0
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 16, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
          ))
        : entries.map((e) => (
            <div key={e.symbol} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span style={{ width: 44, color: "var(--text-secondary)" }}>{e.symbol}</span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(1, e.correlation)) * 100}%`,
                    height: "100%",
                    background: "var(--accent-green)",
                    borderRadius: 3,
                  }}
                />
              </div>
              <span style={{ width: 36, textAlign: "right", fontWeight: 600 }}>
                {e.correlation.toFixed(2)}
              </span>
            </div>
          ))}
    </Panel>
  );
}
