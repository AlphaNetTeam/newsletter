import type { CorrelationData } from "@/lib/types";
import { Panel } from "./MarketMetricsPanel";

export default function CorrelationPanel({ correlation }: { correlation: CorrelationData }) {
  return (
    <Panel title="CORRELATION, 90D">
      {correlation.entries.map((e) => (
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
          <span style={{ width: 36, textAlign: "right", fontWeight: 600 }}>{e.correlation.toFixed(2)}</span>
        </div>
      ))}
    </Panel>
  );
}
