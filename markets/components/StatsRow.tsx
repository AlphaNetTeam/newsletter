import { formatPct, formatUsd } from "@/lib/format";
import type { StatsData } from "@/lib/types";

export default function StatsRow({ stats }: { stats: StatsData }) {
  const items: { label: string; value: string; positive?: boolean }[] = [
    { label: "1 MONTH", value: formatPct(stats.change1m), positive: stats.change1m >= 0 },
    { label: "YEAR TO DATE", value: formatPct(stats.changeYtd), positive: stats.changeYtd >= 0 },
    { label: "1 YEAR", value: formatPct(stats.change1y), positive: stats.change1y >= 0 },
    { label: "ALL-TIME HIGH", value: formatUsd(stats.athPrice) },
    { label: "12M LOW", value: formatUsd(stats.low12mPrice) },
  ];

  return (
    <div className="mk-perf mono">
      {items.map((item) => (
        <div className="mk-perf-cell" key={item.label}>
          <span className="mk-perf-k">{item.label}</span>
          <span className={`mk-perf-v${item.positive === undefined ? "" : item.positive ? " mk-pos" : " mk-neg"}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
