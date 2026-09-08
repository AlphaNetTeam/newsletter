"use client";

import { useRef, useState } from "react";
import { formatUsd } from "@/lib/format";
import { useLiveMids } from "@/hooks/useLiveMids";
import type { PricePoint, RangeKey } from "@/lib/types";

const RANGES: RangeKey[] = ["1M", "3M", "1Y", "ALL"];
const RANGE_DAYS: Record<RangeKey, number> = { "1M": 30, "3M": 90, "1Y": 365, ALL: 1095 };

// Logical coordinate space for the chart SVG. preserveAspectRatio="none" plus
// a CSS width of 100% stretches this to whatever the card's actual pixel
// width is, so the exact numbers here don't matter — only the ratios do.
const VB_W = 716;
const VB_H = 300;
const MARGIN_LEFT = 10;
const MARGIN_RIGHT = 16;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 26;
const PLOT_W = VB_W - MARGIN_LEFT - MARGIN_RIGHT;
const PLOT_H = VB_H - MARGIN_TOP - MARGIN_BOTTOM;
const Y_TICKS = 4;
const X_TICKS = 5;

interface Props {
  symbol: string;
  points: PricePoint[];
}

function formatYTick(v: number): string {
  return `$${(v / 1000).toFixed(2)}K`;
}

function formatXTick(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function formatFullDate(t: number): string {
  return new Date(t)
    .toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export default function PriceChart({ symbol, points }: Props) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { mids, connected } = useLiveMids();
  const sliced = points.slice(-RANGE_DAYS[range]);
  const last = sliced[sliced.length - 1];
  const displayPrice = mids[symbol] ?? last?.price;
  const latestDate = last ? new Date(last.t) : null;

  const n = sliced.length;
  const prices = sliced.map((p) => p.price);
  const minP = n ? Math.min(...prices) : 0;
  const maxP = n ? Math.max(...prices) : 1;
  const priceRange = maxP - minP || 1;

  const xAt = (i: number) => MARGIN_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
  const yAt = (price: number) => MARGIN_TOP + PLOT_H - ((price - minP) / priceRange) * PLOT_H;

  const linePath = sliced.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.price).toFixed(1)}`).join(" ");
  const baseY = MARGIN_TOP + PLOT_H;
  const areaPath = n ? `${linePath} L${xAt(n - 1).toFixed(1)},${baseY} L${xAt(0).toFixed(1)},${baseY} Z` : "";

  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => minP + (priceRange * i) / (Y_TICKS - 1));

  const xTickIdx = n
    ? Array.from({ length: X_TICKS }, (_, i) => Math.round((i / (X_TICKS - 1)) * (n - 1)))
    : [];

  // Pointer x -> nearest data index. The SVG is stretched horizontally
  // (preserveAspectRatio="none"), so map through the rendered width rather
  // than assuming viewBox units equal CSS pixels.
  function idxFromEvent(e: React.PointerEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current;
    if (!svg || n === 0) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return null;
    const vbX = ((e.clientX - rect.left) / rect.width) * VB_W;
    const ratio = (vbX - MARGIN_LEFT) / PLOT_W;
    const i = Math.round(ratio * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  const active = activeIdx != null && activeIdx >= 0 && activeIdx < n ? sliced[activeIdx] : null;
  // Keep the tooltip inside the card at both ends.
  const tipLeft = active ? Math.min(94, Math.max(6, (xAt(activeIdx as number) / VB_W) * 100)) : 0;

  return (
    <div className="mk-panel">
      <div className="dex-head">
        <span className="dex-title mono">{symbol} Spot Price</span>
        {connected && (
          <span
            title="Live tick from Hyperliquid"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--win)",
              boxShadow: "0 0 0 3px rgba(74,222,128,0.14)",
              animation: "pulse 1.6s ease-in-out infinite",
            }}
          />
        )}
      </div>

      <div className="mk-chart-body">
        <div className="mk-chart-top">
          <div>
            <div className="mk-latest mono">{displayPrice !== undefined ? formatUsd(displayPrice) : "—"}</div>
            {latestDate && (
              <div className="mk-latest-sub mono">
                LATEST · {formatFullDate(latestDate.getTime())}
              </div>
            )}
          </div>
          <div className="mk-ranges mono" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} className={r === range ? "on" : undefined} aria-pressed={r === range}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mk-chart-wrap">
          <svg
            ref={svgRef}
            className="mk-chart"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Price chart"
            style={{ width: "100%", height: 300, display: "block" }}
            onPointerMove={(e) => setActiveIdx(idxFromEvent(e))}
            onPointerDown={(e) => setActiveIdx(idxFromEvent(e))}
            onPointerLeave={() => setActiveIdx(null)}
          >
            <defs>
              <linearGradient id="mkp-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--blue)" />
                <stop offset="1" stopColor="var(--cyan)" />
              </linearGradient>
              <linearGradient id="mkp-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--cyan)" stopOpacity=".22" />
                <stop offset="1" stopColor="var(--cyan)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((t) => {
              const y = yAt(t);
              return (
                <g key={t}>
                  <line x1={MARGIN_LEFT} y1={y} x2={VB_W - MARGIN_RIGHT} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth={1} />
                  <text x={MARGIN_LEFT + 2} y={y - 5} fill="var(--txt-4)" fontSize="10.5" fontFamily="IBM Plex Mono,monospace" letterSpacing=".04em">
                    {formatYTick(t)}
                  </text>
                </g>
              );
            })}

            {n > 0 && (
              <>
                <path d={areaPath} fill="url(#mkp-area)" />
                <path d={linePath} fill="none" stroke="url(#mkp-line)" strokeWidth={2} />
              </>
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
                  cy={yAt(active.price)}
                  r={4}
                  fill="var(--cyan)"
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
                  {formatXTick(sliced[idx].t)}
                </text>
              );
            })}
          </svg>

          {active && (
            <div className="mk-chart-tip mono" style={{ left: `${tipLeft}%` }}>
              <div className="mk-chart-tip-date">{formatFullDate(active.t)}</div>
              <div className="mk-chart-tip-price">{formatUsd(active.price)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
