"use client";

import { useRef, useState } from "react";
import type { VolatilityData } from "@/lib/types";
import { Panel } from "./MarketMetricsPanel";

// Logical coordinate space, matching the reference page's volatility chart.
const VB_W = 707;
const VB_H = 260;
const MARGIN_LEFT = 10;
const MARGIN_RIGHT = 16;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 26;
const PLOT_W = VB_W - MARGIN_LEFT - MARGIN_RIGHT;
const PLOT_H = VB_H - MARGIN_TOP - MARGIN_BOTTOM;
const Y_TICKS = 5;
const X_TICKS = 5;

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function formatXTick(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function formatFullDate(t: number): string {
  return new Date(t)
    .toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
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
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxVal = Math.max(...volatility.drawdownCompare.map((e) => e.maxDrawdown), 0.01);
  const isHolding = (label: string) => label.toLowerCase().startsWith("holding");

  const pts = series.points;
  const n = pts.length;

  // The reference chart uses a fixed 0-100% y-axis rather than scaling to
  // the data, so the line's height reads the same across every symbol.
  const xAt = (i: number) => MARGIN_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
  const yAt = (vol: number) => MARGIN_TOP + PLOT_H - Math.max(0, Math.min(1, vol)) * PLOT_H;

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.vol).toFixed(1)}`).join(" ");
  const baseY = MARGIN_TOP + PLOT_H;
  const areaPath = n ? `${linePath} L${xAt(n - 1).toFixed(1)},${baseY} L${xAt(0).toFixed(1)},${baseY} Z` : "";

  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => i / (Y_TICKS - 1));
  const xTickIdx = n ? Array.from({ length: X_TICKS }, (_, i) => Math.round((i / (X_TICKS - 1)) * (n - 1))) : [];

  const lastPt = n ? pts[n - 1] : null;

  function idxFromEvent(e: React.PointerEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current;
    if (!svg || n === 0) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return null;
    const vbX = ((e.clientX - rect.left) / rect.width) * VB_W;
    const i = Math.round(((vbX - MARGIN_LEFT) / PLOT_W) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  const active = activeIdx != null && activeIdx >= 0 && activeIdx < n ? pts[activeIdx] : null;
  const tipLeft = active ? Math.min(94, Math.max(6, (xAt(activeIdx as number) / VB_W) * 100)) : 0;

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

          <div className="mk-chart-body">
            <div className="mk-chart-wrap">
              <svg
                ref={svgRef}
                className="mk-chart"
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="30-day realised volatility"
                style={{ width: "100%", height: 260, display: "block" }}
                onPointerMove={(e) => setActiveIdx(idxFromEvent(e))}
                onPointerDown={(e) => setActiveIdx(idxFromEvent(e))}
                onPointerLeave={() => setActiveIdx(null)}
              >
                <defs>
                  <linearGradient id="mkv-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="var(--violet-dim)" />
                    <stop offset="1" stopColor="var(--violet-hi)" />
                  </linearGradient>
                  <linearGradient id="mkv-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--violet-hi)" stopOpacity=".22" />
                    <stop offset="1" stopColor="var(--violet-hi)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {yTicks.map((t) => {
                  const y = yAt(t);
                  return (
                    <g key={t}>
                      <line x1={MARGIN_LEFT} y1={y} x2={VB_W - MARGIN_RIGHT} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth={1} />
                      <text x={MARGIN_LEFT + 2} y={y - 5} fill="var(--txt-4)" fontSize="10.5" fontFamily="IBM Plex Mono,monospace" letterSpacing=".04em">
                        {`${Math.round(t * 100)}%`}
                      </text>
                    </g>
                  );
                })}

                {n > 0 && (
                  <>
                    <path d={areaPath} fill="url(#mkv-area)" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="url(#mkv-line)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {lastPt && (
                  <g pointerEvents="none">
                    <circle cx={xAt(n - 1)} cy={yAt(lastPt.vol)} fill="var(--violet-hi)" opacity=".5">
                      <animate attributeName="r" values="4;11;4" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={xAt(n - 1)} cy={yAt(lastPt.vol)} r="3.4" fill="var(--violet-hi)" />
                  </g>
                )}

                {active && (
                  <g pointerEvents="none">
                    <line
                      x1={xAt(activeIdx as number)}
                      y1={MARGIN_TOP}
                      x2={xAt(activeIdx as number)}
                      y2={baseY}
                      stroke="rgba(255,255,255,.28)"
                      strokeWidth={1}
                    />
                    <circle
                      cx={xAt(activeIdx as number)}
                      cy={yAt(active.vol)}
                      r={4}
                      fill="var(--violet-hi)"
                      stroke="#05070D"
                      strokeWidth={2}
                    />
                  </g>
                )}

                {xTickIdx.map((idx, i) => {
                  const anchor = i === 0 ? "start" : i === xTickIdx.length - 1 ? "end" : "middle";
                  return (
                    <text
                      key={`${idx}-${i}`}
                      x={xAt(idx)}
                      y={VB_H - 8}
                      textAnchor={anchor}
                      fill="var(--txt-5)"
                      fontSize="10.5"
                      fontFamily="IBM Plex Mono,monospace"
                      letterSpacing=".08em"
                    >
                      {formatXTick(pts[idx].t)}
                    </text>
                  );
                })}
              </svg>

              {active && (
                <div className="mk-chart-tip mono" style={{ left: `${tipLeft}%` }}>
                  <div className="mk-chart-tip-date">{formatFullDate(active.t)}</div>
                  <div className="mk-chart-tip-price">{pct(active.vol)}</div>
                </div>
              )}
            </div>
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
