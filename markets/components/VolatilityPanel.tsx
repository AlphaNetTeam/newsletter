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
  const isHolding = (label: string) => label.toLowerCase().startsWith("holding");

  return (
    <>
      <hgroup className="section-head">
        <div className="label mono">VOLATILITY</div>
        <h2 id="volatility-heading">
          {symbol} volatility and risk<span className="accent-dot">.</span>
        </h2>
        <p className="lede-sm">{volatilityBlurb(symbol, series)}</p>
      </hgroup>

      <div className="mk-vol-grid">
        <div className="mk-panel">
          <div className="dex-head">
            <span className="dex-title mono">30D Realised Volatility</span>
          </div>
          <div style={{ height: 220, padding: "16px 20px 0" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                  stroke="var(--txt-4)"
                  tick={{ fontSize: 11, fill: "var(--txt-4)" }}
                  axisLine={{ stroke: "var(--line)" }}
                  tickLine={false}
                  minTickGap={80}
                />
                <YAxis
                  dataKey="vol"
                  tickFormatter={(v) => `${v}%`}
                  stroke="var(--txt-4)"
                  tick={{ fontSize: 11, fill: "var(--txt-4)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(t) => new Date(t as number).toLocaleDateString()}
                  formatter={(value) => [`${(value as number).toFixed(1)}%`, "Realised vol"]}
                />
                <Line
                  type="monotone"
                  dataKey="vol"
                  stroke="var(--violet)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mk-volstats mono">
            <Stat label="CURRENT" value={pct(series.current)} />
            <Stat label="12M HIGH" value={pct(series.high12m)} />
            <Stat label="12M LOW" value={pct(series.low12m)} />
            {series.vsBtcMultiple != null && <Stat label="VS BTC" value={`${series.vsBtcMultiple.toFixed(1)}×`} />}
          </div>
        </div>

        <Panel title="Worst Drawdown // Strategy vs Holding" bodyClassName="mk-dd mono">
          {volatility.drawdownCompare.map((e) => {
            const holding = isHolding(e.label);
            return (
              <div key={e.label} className="mk-dd-row">
                <span className="mk-dd-name">{e.label}</span>
                <div className="mk-dd-track">
                  <i className={holding ? "mk-dd-hold" : undefined} style={{ width: `${(e.maxDrawdown / maxVal) * 100}%` }} />
                </div>
                <span className={`mk-dd-v${holding ? " mk-neg" : ""}`}>{pct(e.maxDrawdown)}</span>
              </div>
            );
          })}
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mk-volstat">
      <div className="mono-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
