import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint, RangeKey } from "../api/types";
import { formatAxisTick, formatUsd } from "../utils/format";

const RANGES: RangeKey[] = ["1M", "3M", "1Y", "ALL"];

interface Props {
  symbol: string;
  points: PricePoint[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  loading: boolean;
  /** Real-time mid price from the /ws/prices feed, if connected — takes
   * priority over the last daily candle close for the "Latest" readout. */
  livePrice?: number | null;
  liveConnected?: boolean;
}

export default function PriceChart({
  symbol,
  points,
  range,
  onRangeChange,
  loading,
  livePrice,
  liveConnected,
}: Props) {
  const last = points[points.length - 1];
  const displayPrice = livePrice ?? last?.price;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{symbol} price</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
            SPOT PRICE, USD · {rangeLabel(range)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              style={{
                background: r === range ? "rgba(255,255,255,0.08)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: r === range ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 12,
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 260, marginTop: 16, opacity: loading ? 0.4 : 1, transition: "opacity .2s" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tickFormatter={(t) => formatAxisTick(t, range)}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              minTickGap={80}
            />
            <YAxis
              dataKey="price"
              orientation="left"
              domain={[
                (min: number) => Math.max(0, min * 0.85),
                (max: number) => max * 1.08,
              ]}
              tickFormatter={(v) => formatUsd(v, { compact: true })}
              stroke="var(--text-tertiary)"
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(t) => new Date(t as number).toLocaleDateString()}
              formatter={(value) => [formatUsd(Number(value)), "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--accent-green)"
              strokeWidth={2}
              fill="url(#priceFill)"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {displayPrice !== undefined && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: -8,
          }}
        >
          {liveConnected && (
            <span
              title="Live tick from Hyperliquid via /ws/prices"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent-green)",
                boxShadow: "0 0 0 3px var(--accent-green-dim)",
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
          )}
          Latest: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatUsd(displayPrice)}</span>
        </div>
      )}
    </div>
  );
}

function rangeLabel(r: RangeKey): string {
  switch (r) {
    case "1M":
      return "1 MONTH";
    case "3M":
      return "3 MONTHS";
    case "1Y":
      return "1 YEAR";
    case "ALL":
      return "3 YEARS";
  }
}
