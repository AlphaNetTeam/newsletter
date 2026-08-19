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
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <div style={{ width: 48, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.round(s.capacityPct * 100)}%`,
                height: "100%",
                background: s.capacityPct >= 0.7 ? "var(--accent-amber)" : "var(--accent-green)",
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {Math.round(s.capacityPct * 100)}% FULL
          </span>
        </div>
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
