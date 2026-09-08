import { PHOENIX_RECENT_STAT_WINDOW_DAYS } from "@/lib/config";
import { formatPct } from "@/lib/format";
import type { StrategiesData, StrategyOut } from "@/lib/types";

// ROI, MAX DD, WIN RATE and the equity curve all come from the Phoenix
// recentStat API windowed to this many days (?t=30), so label them rather
// than letting them read as lifetime figures. SHARPE is deliberately
// unlabelled: the upstream API returns the same lifetime Sharpe regardless
// of the window. Note the drawdown chart in the volatility section uses the
// launch-to-now window instead, which is why its numbers are much larger.
const WINDOW_LABEL = `${PHOENIX_RECENT_STAT_WINDOW_DAYS}D`;

// CAPACITY tiers — matches the "STRATEGY CAPACITY" pill on
// trade.alphanet.global/leaderboard exactly. Copied out of AlphaNet's own
// production bundle (assets/appStateContext-*.js), where the tier is
// computed as `e = (actualCapacity / maxCapacity) * 100`:
//   e > 100  -> FULL          #FF4D4D
//   e > 90   -> ALMOST FULL   #ff7300
//   e > 70   -> VERY POPULAR  #FFD146
//   e > 40   -> POPULAR       #29E9A9 (rendered here as the reference's own
//                                       mk-chip-violet — confirmed live on
//                                       the reference page's CAPACITY column)
//   else     -> OPEN          #50ffe2 (mk-chip-mint on the reference page)
// Only OPEN/POPULAR are reachable with today's live data; the other three
// use the closest chip colors available in the reference's own palette.
function capacityChip(pct: number): { label: string; className: string } {
  const e = pct * 100;
  if (e > 100) return { label: "FULL", className: "mk-chip-red" };
  if (e > 90) return { label: "ALMOST FULL", className: "mk-chip-orange" };
  if (e > 70) return { label: "VERY POPULAR", className: "mk-chip-amber" };
  if (e > 40) return { label: "POPULAR", className: "mk-chip-violet" };
  return { label: "OPEN", className: "mk-chip-mint" };
}

const BADGE_CLASS: Record<string, string> = {
  POPULAR: "mk-chip-violet",
  "HIGH SHARPE": "mk-chip-blue",
  NEW: "mk-chip-mint",
};
const DEFAULT_BADGE_CLASS = "mk-chip-cyan";

function biasClass(tagline: string): string {
  const t = tagline.toLowerCase();
  if (t.includes("short")) return "mk-chip-violet";
  if (t.includes("long")) return "mk-chip-cyan";
  return "mk-chip-blue";
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
    <>
      <hgroup className="section-head">
        <div className="label mono">STRATEGIES</div>
        <h2 id="strategies-heading">
          Automated {symbol} trading strategies<span className="accent-dot">.</span>
        </h2>
        {strategies.source === "synthetic" && (
          <p className="lede-sm" style={{ fontSize: 13 }}>
            AlphaNet&apos;s real strategy-performance API wasn&apos;t reachable, so these are example figures instead
            of live results.
          </p>
        )}
      </hgroup>

      <div className="mk-panel">
        <div className="dex-head">
          <span className="dex-title mono">AlphaNet Strategies</span>
        </div>
        <div className="mk-table-scroll">
          <table className="mk-table">
            <thead>
              <tr>
                {["STRATEGY", "TYPE", `ROI (${WINDOW_LABEL})`, "SHARPE", `MAX DD (${WINDOW_LABEL})`, `WIN RATE (${WINDOW_LABEL})`, `EQUITY CURVE (${WINDOW_LABEL})`, "CAPACITY", ""].map((h) => (
                  <th key={h || "details"} className="mono" scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <StrategyRow key={s.key} s={s} symbol={symbol} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {list.length > 0 && (
        <>
          <h3 className="mk-subhead">{symbol} strategy details</h3>
          <div className="cap-grid three-col">
            {list.map((s, i) => (
              <article className="cap" key={s.key}>
                <span className="cap-n mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 style={{ fontSize: 17 }}>{s.name}</h3>
                <span className={`mk-chip mono mk-bias ${biasClass(s.tagline)}`}>{s.tagline.toUpperCase()}</span>
                <p>{s.description}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function StrategyRow({ s, symbol }: { s: StrategyOut; symbol: string }) {
  const capacity = capacityChip(s.capacityPct);
  return (
    <tr>
      <td>
        <div className="mk-st-name">{s.name}</div>
        <div className="mk-st-badges">
          {s.badges.map((badge) => (
            <span key={badge} className={`mk-chip mono ${BADGE_CLASS[badge] ?? DEFAULT_BADGE_CLASS}`}>
              {badge}
            </span>
          ))}
        </div>
      </td>
      <td className="mk-dim">{s.type}</td>
      <td className={s.roi >= 0 ? "mk-pos" : "mk-neg"} style={{ fontWeight: 600 }}>
        {formatPct(s.roi)}
      </td>
      <td>{s.sharpe.toFixed(2)}</td>
      <td className="mk-dim">{(s.maxDrawdown * 100).toFixed(2)}%</td>
      <td className="mk-dim">{(s.winRate * 100).toFixed(1)}%</td>
      <td>
        <Sparkline data={s.equityCurve} />
      </td>
      <td>
        <span className={`mk-chip mono ${capacity.className}`}>{capacity.label}</span>
      </td>
      <td>
        <a className="mk-details mono" href={`https://trade.alphanet.global/perp/PERP_${symbol}_USDC`} target="_blank" rel="noopener noreferrer">
          Details<span className="btn-arrow">↗</span>
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
        stroke={positive ? "var(--win)" : "var(--loss)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
