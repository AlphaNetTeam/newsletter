import type { StrategiesData, StrategyOut } from "../api/types";
import { formatPct } from "../utils/format";

interface Props {
  strategies: StrategiesData | null;
  symbol: string;
}

// Primary source is AlphaNet's own real strategy-performance API
// (alphanet.phoenix.global/api/orderly/trade/recentStat) — backend-tagged
// `source: "live"` when that's reachable: filtered to strategies trading
// the page's selected symbol, top 4 by 30D ROI. Every real market
// currently only has 3 strategy records (not 4), so this shows however
// many actually exist — not padded with synthetic filler when live data
// is available but sparse. Falls back to a deterministic per-symbol
// synthetic generator (`source: "synthetic"`, always 4 rows) only when
// the real API isn't reachable at all; see
// backend/app/services/strategy_service.py.
//
// Tagline color follows the design's semantic convention (verified
// against the source mockup), keyed off the tagline text itself rather
// than row position — row order now varies (sorted by ROI), so a
// fixed-by-index palette would color the wrong row as soon as the
// ranking changed. "short"-biased taglines are amber, "long"-biased ones
// are green, everything else (neutral, or anything else) is blue.
function taglineColor(tagline: string): string {
  const t = tagline.toLowerCase();
  if (t.includes("short")) return "var(--accent-amber)";
  if (t.includes("long")) return "var(--accent-green)";
  return "var(--accent-blue)";
}

// Badge color also follows the design mockup exactly: each tag gets its
// own soft-fill pill (a dim tint of the accent color as background, the
// full-strength accent as text) rather than one generic solid-blue pill
// for every tag. "NEW" doesn't appear in the source mockup (which only
// ever showed POPULAR/HIGH SHARPE) but the real API does emit it, so it
// gets its own color rather than falling back to the wrong style.
const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  POPULAR: { background: "var(--accent-green-dim)", color: "var(--accent-green)" },
  "HIGH SHARPE": { background: "var(--accent-blue-dim)", color: "var(--accent-blue)" },
  NEW: { background: "var(--accent-purple-dim)", color: "var(--accent-purple)" },
};
const DEFAULT_BADGE_STYLE = { background: "var(--accent-amber-dim)", color: "var(--accent-amber)" };

// CAPACITY column — matches the "STRATEGY CAPACITY" widget on AlphaNet's
// own real strategy-details page (trade.alphanet.global/strategies?s=...&m=...).
// Confirmed directly against that live page (not the `tag` field — a
// strategy tagged "POPULAR" at low utilization still shows "OPEN", and
// one tagged only "HIGH SHARPE" at high utilization still shows
// "VERY POPULAR", so the badge word is purely a function of the real
// actualCapacity/maxCapacity ratio, independent of `tag`):
//   - Hackworth Trend - BTC,  22.0% -> OPEN          (green)
//   - Hackworth Trend - BNB,  28.4% -> OPEN          (green, despite tag "Popular")
//   - Hackworth OptimaShort - LINK, 37.5% -> OPEN    (green)
//   - Hackworth Trend - DOGE, 40.0% -> POPULAR       (green)
//   - Hackworth Prime - BTC,  54.0% -> POPULAR       (green)
//   - Hackworth Prime - ZEC,  60.35% -> POPULAR      (green)
//   - Hackworth OptimaShort - XMR, 80.2% -> VERY POPULAR (amber, despite tag only having "HIGH SHARPE" alongside POPULAR)
// That pins the OPEN/POPULAR cutover at exactly 40%; the POPULAR/VERY
// POPULAR cutover is only bracketed between 60.35% and 80.2% (no live
// strategy currently sits in that gap to pin it exactly) — 75% is used
// here as the midpoint estimate. No strategy currently reaches a
// capacity high enough to reveal a fourth tier (e.g. "FULL"), so none
// is implemented — flag if one ever needs adding.
function capacityStatus(pct: number): { label: string; color: string; background: string } {
  if (pct >= 0.75) return { label: "VERY POPULAR", color: "var(--accent-amber)", background: "var(--accent-amber-dim)" };
  if (pct >= 0.4) return { label: "POPULAR", color: "var(--accent-green)", background: "var(--accent-green-dim)" };
  return { label: "OPEN", color: "var(--accent-green)", background: "var(--accent-green-dim)" };
}

// Small solid flame glyph (Lucide "flame" path) — same icon the
// reference capacity badge uses next to the status word, tinted via
// currentColor so it always matches the pill's text color.
function FlameIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function CapacityCell({ pct }: { pct: number }) {
  const filledPct = Math.round(pct * 100);
  const status = capacityStatus(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      {/* The gradient itself is painted across the bar's full width and
          stays fixed (green -> amber -> red, low capacity to high) —
          only the unfilled remainder is masked over with the track
          color, so a half-full bar shows the low/cool half of the
          gradient rather than a color picked in isolation. This is
          what makes a 54%-full bar end in orange rather than jumping
          straight to red, matching the reference widget. */}
      <div
        style={{
          position: "relative",
          width: 48,
          height: 5,
          borderRadius: 3,
          overflow: "hidden",
          background: "linear-gradient(90deg, var(--accent-green), var(--accent-amber), var(--accent-red))",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: `${100 - filledPct}%`,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 999,
          background: status.background,
          color: status.color,
          letterSpacing: 0.03,
          whiteSpace: "nowrap",
        }}
      >
        <FlameIcon />
        {status.label}
      </span>
    </div>
  );
}

export default function StrategiesSection({ strategies, symbol }: Props) {
  const list = strategies?.strategies ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Strategies on {symbol}</h2>
        {strategies?.source === "synthetic" && (
          <span
            title="AlphaNet's real strategy-performance API wasn't reachable, so these are example figures instead of live results."
            style={{ fontSize: 11, color: "var(--text-tertiary)", cursor: "help" }}
          >
            example data
          </span>
        )}
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["STRATEGY", "TYPE", "ROI", "SHARPE RATIO", "MAX DRAWDOWN", "WIN RATE", "EQUITY CURVE", "CAPACITY", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="mono-label"
                    style={{
                      textAlign: h === "STRATEGY" || h === "TYPE" ? "left" : "right",
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {list.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} style={{ padding: "16px" }}>
                      <div style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
                    </td>
                  </tr>
                ))
              : list.map((s) => <StrategyRow key={s.key} s={s} symbol={symbol} />)}
          </tbody>
        </table>
      </div>

      {list.length > 0 && (
        <div
          style={{
            display: "grid",
            // Real strategy count per symbol isn't fixed at 4 (AlphaNet's
            // live API currently returns 3 per symbol) — sizing columns to
            // the actual row count keeps the cards evenly filled instead
            // of leaving a blank trailing column when there are fewer
            // than 4.
            gridTemplateColumns: `repeat(${list.length}, 1fr)`,
            gap: 16,
            marginTop: 16,
          }}
        >
          {list.map((s) => (
            <div
              key={s.key}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                {s.name}
              </div>
              <div
                className="mono-label"
                style={{ color: taglineColor(s.tagline), marginBottom: 10, letterSpacing: 0.04 }}
              >
                {s.tagline}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyRow({ s, symbol }: { s: StrategyOut; symbol: string }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>{s.name}</span>
          {s.badges.map((badge) => {
            const style = BADGE_STYLES[badge] ?? DEFAULT_BADGE_STYLE;
            return (
              <span
                key={badge}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: style.background,
                  color: style.color,
                  letterSpacing: 0.03,
                }}
              >
                {badge}
              </span>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
          {s.version} · LIVE {s.liveSince} · {s.trades.toLocaleString()} TRADES
        </div>
      </td>
      <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{s.type}</td>
      <td
        style={{
          padding: "14px 16px",
          textAlign: "right",
          fontWeight: 600,
          color: s.roi >= 0 ? "var(--accent-green)" : "var(--accent-red)",
        }}
      >
        {formatPct(s.roi)}
      </td>
      <td style={{ padding: "14px 16px", textAlign: "right" }}>{s.sharpe.toFixed(2)}</td>
      <td style={{ padding: "14px 16px", textAlign: "right", color: "var(--accent-red)" }}>
        {(s.maxDrawdown * 100).toFixed(2)}%
      </td>
      <td style={{ padding: "14px 16px", textAlign: "right" }}>{(s.winRate * 100).toFixed(1)}%</td>
      <td style={{ padding: "14px 16px", textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Sparkline data={s.equityCurve} />
        </div>
      </td>
      <td style={{ padding: "14px 16px", textAlign: "right", minWidth: 90 }}>
        <CapacityCell pct={s.capacityPct} />
      </td>
      <td style={{ padding: "14px 16px", textAlign: "right" }}>
        <a
          href={`https://trade.alphanet.global/perp/PERP_${symbol}_USDC`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "transparent",
            border: "1px solid var(--border-strong)",
            borderRadius: 6,
            color: "var(--text-primary)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            textDecoration: "none",
          }}
        >
          Details
        </a>
      </td>
    </tr>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 90;
  const h = 30;
  if (data.length < 2) return <svg width={w} height={h} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const positive = data[data.length - 1] >= data[0];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "var(--accent-green)" : "var(--accent-red)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
