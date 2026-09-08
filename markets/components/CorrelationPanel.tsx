import type { CorrelationData } from "@/lib/types";
import { Panel } from "./MarketMetricsPanel";

export default function CorrelationPanel({ correlation }: { correlation: CorrelationData }) {
  return (
    <Panel title="Correlation // 90D" bodyClassName="mk-corr">
      {correlation.entries.map((e) => (
        <div key={e.symbol} className="mk-corr-row mono">
          <span className="mk-corr-sym">{e.symbol}</span>
          <div className="mk-corr-track">
            <i style={{ width: `${Math.max(0, Math.min(1, e.correlation)) * 100}%` }} />
          </div>
          <span className="mk-corr-v">{e.correlation.toFixed(2)}</span>
        </div>
      ))}
    </Panel>
  );
}
