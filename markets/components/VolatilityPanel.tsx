"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VolatilityData } from "@/lib/types";
import { Panel } from "./MarketMetricsPanel";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function volatilityBlurb(symbol: string, series: VolatilityData["series"]): string {
  const currentPct = pct(series.current);
  let clause: string;
  if (series.vsBtcMultiple == null) {
    clause = "a market we trade";
  } else if (series.vsBtcMultiple <= 1.05) {
    clause = "the calmest crypto market we trade";
  } else {
    clause = `${series.vsBtcMultiple.toFixed(1)}× BTC's volatility`;
  }
  const sp500Clause =
    series.sp500Current != null && series.sp500Current > 0
      ? ` and still ${(series.current / series.sp500Current).toFixed(1)} times the S&P 500`
      : "";
  return `${symbol} at ${currentPct} annualised volatility is ${clause}${sp500Clause}.`;
}

export default function VolatilityPanel({
  volatility,
  symbol,
}: {
  volatility: VolatilityData;
  symbol: string;
}) {
  const series = volatility.series;
  const chartData = series.points.map((p) => ({ t: p.t, vol: p.vol * 100 }));
  const maxVal = Math.max(...volatility.drawdownCompare.map((e) => e.maxDrawdown), 0.01);

  return (
    <section id="volatility" aria-labelledby="volatility-heading">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 id="volatility-heading" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Volatility and risk profile
        </h2>
        <span className="mono-label">30D REALISED, TRAILING 12 MONTHS</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0 16px" }}>
        {volatilityBlurb(symbol, series)}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
          }}
        >
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) =>
                    new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                  }
                  stroke="var(--text-tertiary)"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  minTickGap={80}
                />
                <YAxis
                  dataKey="vol"
                  tickFormatter={(v) => `${v}%`}
                  stroke="var(--text-tertiary)"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(t) => new Date(t as number).toLocaleDateString()}
                  formatter={(value) => [`${(value as number).toFixed(1)}%`, "Realised vol"]}
                />
                <Line
                  type="monotone"
                  dataKey="vol"
                  stroke="#e0a53d"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 12, fontSize: 13 }}>
            <Stat label="CURRENT" value={pct(series.current)} />
            <Stat label="12M HIGH" value={pct(series.high12m)} />
            <Stat label="12M LOW" value={pct(series.low12m)} />
            {series.vsBtcMultiple != null && <Stat label="VS BTC" value={`${series.vsBtcMultiple.toFixed(1)}×`} />}
          </div>
        </div>

        <Panel title="WORST DRAWDOWN, STRATEGY VS HOLDING">
          {volatility.drawdownCompare.map((e) => (
            <div key={e.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>{e.label}</span>
                <span style={{ fontWeight: 600 }}>{pct(e.maxDrawdown)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(e.maxDrawdown / maxVal) * 100}%`,
                    height: "100%",
                    background: "var(--accent-red)",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
