import { formatPct } from "@/lib/format";
import type { StrategiesData, StrategyOut } from "@/lib/types";

function taglineColor(tagline: string): string {
  const t = tagline.toLowerCase();
  if (t.includes("short")) return "var(--accent-amber)";
  if (t.includes("long")) return "var(--accent-green)";
  return "var(--accent-blue)";
}

const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  POPULAR: { background: "var(--accent-green-dim)", color: "var(--accent-green)" },
  "HIGH SHARPE": { background: "var(--accent-blue-dim)", color: "var(--accent-blue)" },
  NEW: { background: "var(--accent-purple-dim)", color: "var(--accent-purple)" },
};
const DEFAULT_BADGE_STYLE = { background: "var(--accent-amber-dim)", color: "var(--accent-amber)" };

// CAPACITY column — matches the "STRATEGY CAPACITY" pill/bar on
// trade.alphanet.global/leaderboard exactly. This isn't a guess: it's
// copied straight out of AlphaNet's own production bundle
// (assets/appStateContext-*.js), where the badge is computed as
// `e = (actualCapacity / maxCapacity) * 100`, run through:
//   e > 100  -> FULL          #FF4D4D  bg rgba(255, 77, 77, 0.1)
//   e > 90   -> ALMOST FULL   #ff7300  bg rgba(255, 152, 0, 0.1)
//   e > 70   -> VERY POPULAR  #FFD146  bg rgba(255, 209, 70, 0.1)
//   e > 40   -> POPULAR       #29E9A9  bg rgba(41, 233, 169, 0.1)
//   else     -> OPEN          #50ffe2  bg rgba(80, 255, 226, 0.1)
// Only OPEN/POPULAR/VERY POPULAR are reachable with today's live data (no
// strategy has broken 90% yet); FULL/ALMOST FULL are included anyway
// since they're part of the real function, not a guess.
function capacityStatus(pct: number): { label: string; color: string; background: string } {
  const e = pct * 100;
  if (e > 100) return { label: "FULL", color: "#FF4D4D", background: "rgba(255, 77, 77, 0.1)" };
  if (e > 90) return { label: "ALMOST FULL", color: "#ff7300", background: "rgba(255, 152, 0, 0.1)" };
  if (e > 70) return { label: "VERY POPULAR", color: "#FFD146", background: "rgba(255, 209, 70, 0.1)" };
  if (e > 40) return { label: "POPULAR", color: "#29E9A9", background: "rgba(41, 233, 169, 0.1)" };
  return { label: "OPEN", color: "#50ffe2", background: "rgba(80, 255, 226, 0.1)" };
}

// Same solid droplet/flame glyph AlphaNet's own capacity badge uses — path
// copied verbatim out of the real DOM (inspected on
// trade.alphanet.global/leaderboard's CAPACITY column), tinted via
// currentColor so it always matches the pill's text color. Only shown for
// POPULAR and up — OPEN's real badge has no icon, just text.
function CapacityIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c0 0-1 3.5-3 5.5S5 12 5 15.5c0 3.866 3.134 7 7 7s7-3.134 7-7c0-3.5-2-7.5-3-9.5s-3-4.5-4-6zM12 18c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2z" />
    </svg>
  );
}

// Capacity cell, rebuilt to match trade.alphanet.global/leaderboard's
// CAPACITY column exactly — every value below (colors, sizes, the tick
// positions, the gradient's own stops) was read straight out of that
// page's live DOM/computed styles, not eyeballed from a screenshot:
//   - badge stacks ABOVE the bar (flex-col), not beside it
//   - the bar's gradient is its own fixed 4-stop ramp, independent of the
//     5 badge tier colors: cyan 0% -> orange 50% -> deep orange 90% ->
//     red 100%. It's rendered at a background-size of (100/fillPct)*100%
//     so the same fixed gradient always spans the full track width even
//     though only the filled slice is visible — a half-full bar shows the
//     cool half of the ramp rather than a color picked in isolation.
//   - nine faint tick marks sit on the track at 10%/20%/.../90%, on both
//     the top and bottom edges
function CapacityCell({ pct }: { pct: number }) {
  const fillPct = Math.min(100, Math.max(0, pct * 100));
  const status = capacityStatus(pct);
  const showIcon = status.label !== "OPEN";
  const ticks = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, width: "100%", minWidth: 80 }}>
      <div
        style={{
          padding: "4px 8px",
          borderRadius: 9999,
          background: status.background,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
          {showIcon && <CapacityIcon />}
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: "10px", color: status.color, whiteSpace: "nowrap" }}>
            {status.label}
          </span>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 4,
          background: "#171921",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            borderRadius: 1,
            width: `${fillPct}%`,
            background: `linear-gradient(90deg, #50ffe2 0%, #ff9800 50%, #ff7300 90%, #ff4d4d 100%) 0% 0% / ${
              fillPct > 0 ? (100 / fillPct) * 100 : 100
            }% 100%`,
            transition: "width 1.5s cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        />
        {ticks.map((left) => (
          <div key={`t-${left}`} style={{ position: "absolute", top: 0, width: 2, height: 1, background: "#101117", zIndex: 10, left: `${left}%` }} />
        ))}
        {ticks.map((left) => (
          <div key={`b-${left}`} style={{ position: "absolute", bottom: 0, width: 2, height: 1, background: "#101117", zIndex: 10, left: `${left}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function StrategiesSection({
  strategies,
  symbol,
}: {
  strategies: StrategiesData;
  symbol: string;
}) {
  const list = strategies.strategies;

  return (
    <section id="strategies" aria-labelledby="strategies-heading">
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <h2 id="strategies-heading" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Strategies on {symbol}
        </h2>
        {strategies.source === "synthetic" && (
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
                    key={h || "details"}
                    className="mono-label"
                    scope="col"
                    style={{
                      textAlign: h === "STRATEGY" || h === "TYPE" || h === "CAPACITY" ? "left" : "right",
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <StrategyRow key={s.key} s={s} symbol={symbol} />
            ))}
          </tbody>
        </table>
      </div>

      {list.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${list.length}, 1fr)`,
            gap: 16,
            marginTop: 16,
          }}
        >
          {list.map((s) => (
            <article
              key={s.key}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 16,
              }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 6px" }}>
                {s.name}
              </h3>
              <div className="mono-label" style={{ color: taglineColor(s.tagline), marginBottom: 10, letterSpacing: 0.04 }}>
                {s.tagline}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{s.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
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
      <td style={{ padding: "14px 16px", textAlign: "left", minWidth: 100, width: 120 }}>
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
            whiteSpace: "nowrap",
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
  if (data.length < 2) return <svg width={w} height={h} aria-hidden="true" />;

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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
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
