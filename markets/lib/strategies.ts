import {
  STRATEGY_DEFS,
  STRATEGY_DESCRIPTION_FALLBACK,
  STRATEGY_DESCRIPTIONS,
  STRATEGIES_TOP_N,
} from "./config";
import { gauss, mulberry32, seedFor } from "./generator";
import type { StrategiesData, StrategyOut } from "./types";

const EQUITY_CURVE_POINTS = 48;

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function phoenixSymbol(symbol: string): string {
  return `PERP_${symbol.toUpperCase()}_USDC`;
}

function humanizeDuration(startS: number, endS: number): string {
  const totalDays = Math.max(0, Math.floor(endS) - Math.floor(startS)) / 86400;
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  return years ? `${years}Y ${months}M` : `${months}M`;
}

function toFloat(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseLiveItem(item: Record<string, unknown>): StrategyOut | null {
  try {
    const name = String(item.strategy ?? "");
    if (!name) return null;
    const symbol = String(item.symbol ?? "");
    const maxCap = toFloat(item.maxCapacity);
    const actualCap = toFloat(item.actualCapacity);
    const capacityPct = maxCap > 0 ? actualCap / maxCap : 0;
    const tagsRaw = String(item.tag ?? "");
    const badges = tagsRaw
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const daily = Array.isArray(item.dailyStatList)
      ? [...(item.dailyStatList as Array<Record<string, unknown>>)].sort(
          (a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0),
        )
      : [];
    // dailyStatList[].pnl is the strategy's CUMULATIVE return since inception,
    // not a per-day figure — inside the 30-day window it reads e.g. 2.0039 ->
    // 1.9959 (i.e. +200.39% -> +199.59% since launch). Plotted raw, the curve
    // is a line hovering around 2.0 that has nothing to do with the 30-day ROI
    // shown next to it. Rebase it onto the window's first point so the curve
    // starts at 0 and ends at the window's own return, which is exactly what
    // `totalReturn` reports for t=30.
    const rawCurve = daily.map((d) => toFloat(d.pnl));
    let equityCurve: number[];
    if (rawCurve.length) {
      const base = 1 + rawCurve[0];
      equityCurve = base === 0
        ? rawCurve.map((v) => v - rawCurve[0])
        : rawCurve.map((v) => (1 + v) / base - 1);
    } else {
      equityCurve = [0, toFloat(item.totalReturn)];
    }

    const startTime = Number(item.startTime ?? 0);
    const endTime = Number(item.endTime ?? startTime);

    return {
      key: slugify(String(item.strategyName ?? `${name}-${symbol}`)),
      name,
      badges,
      tagline: String(item.marketProfile ?? "").toUpperCase(),
      description: STRATEGY_DESCRIPTIONS[name] ?? STRATEGY_DESCRIPTION_FALLBACK,
      type: String(item.strategyType ?? "Multi-Alpha"),
      version: String(item.version ?? ""),
      liveSince: humanizeDuration(startTime, endTime),
      trades: Number(item.totalTrades ?? 0) || 0,
      roi: Math.round(toFloat(item.totalReturn) * 10000) / 10000,
      sharpe: Math.round(toFloat(item.sharpeRatio) * 100) / 100,
      maxDrawdown: Math.round(toFloat(item.maxDrawDown) * 10000) / 10000,
      maxDrawdownLive: Math.round(toFloat(item.maxDrawDown) * 10000) / 10000,
      winRate: Math.round(toFloat(item.winRate) * 10000) / 10000,
      capacityPct: Math.round(capacityPct * 10000) / 10000,
      equityCurve: equityCurve.map((v) => Math.round(v * 10000) / 10000),
    };
  } catch {
    return null;
  }
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base * (1 + (rng() * 2 - 1) * spread);
}

function syntheticEquityCurve(symbol: string, key: string, roi: number): number[] {
  const rng = mulberry32(seedFor(symbol, `${key}:equity-curve`));
  const n = EQUITY_CURVE_POINTS - 1;
  const stepVol = Math.max(0.02, Math.abs(roi) / 12);
  const w = [0];
  for (let i = 0; i < n; i++) w.push(w[w.length - 1] + gauss(rng) * stepVol);

  const curve: number[] = [];
  for (let i = 0; i < EQUITY_CURVE_POINTS; i++) {
    const trend = roi * (i / n);
    const bridgeNoise = w[i] - (i / n) * w[n];
    curve.push(Math.round((trend + bridgeNoise * 0.5) * 10000) / 10000);
  }
  curve[0] = 0;
  curve[curve.length - 1] = Math.round(roi * 10000) / 10000;
  return curve;
}

function syntheticStrategies(symbol: string): StrategiesData {
  const out: StrategyOut[] = STRATEGY_DEFS.map((defn) => {
    let roi = defn.base_roi;
    let sharpe = defn.base_sharpe;
    let maxDd = defn.base_max_drawdown;
    let winRate = defn.base_win_rate;
    let capacity = defn.base_capacity_pct;
    if (symbol !== "BTC") {
      const rng = mulberry32(seedFor(symbol, `${defn.key}:metrics`));
      roi = Math.max(-0.9, jitter(rng, defn.base_roi, 0.35));
      sharpe = Math.max(0.1, jitter(rng, defn.base_sharpe, 0.25));
      maxDd = Math.min(0.95, Math.max(0.01, jitter(rng, defn.base_max_drawdown, 0.3)));
      winRate = Math.min(0.95, Math.max(0.05, jitter(rng, defn.base_win_rate, 0.15)));
      capacity = Math.min(0.97, Math.max(0.03, jitter(rng, defn.base_capacity_pct, 0.4)));
    }
    return {
      key: defn.key,
      name: defn.name,
      badges: defn.badges,
      tagline: defn.tagline,
      description: STRATEGY_DESCRIPTIONS[defn.name] ?? STRATEGY_DESCRIPTION_FALLBACK,
      type: defn.type,
      version: defn.version,
      liveSince: defn.liveSince,
      trades: defn.trades,
      roi: Math.round(roi * 10000) / 10000,
      sharpe: Math.round(sharpe * 100) / 100,
      maxDrawdown: Math.round(maxDd * 10000) / 10000,
      maxDrawdownLive: Math.round(maxDd * 10000) / 10000,
      winRate: Math.round(winRate * 10000) / 10000,
      capacityPct: Math.round(capacity * 10000) / 10000,
      equityCurve: syntheticEquityCurve(symbol, defn.key, roi),
    };
  });
  return { symbol, strategies: out, source: "synthetic" };
}

export function getStrategies(
  symbol: string,
  raw: Array<Record<string, unknown>>,
  rawLiveWindow: Array<Record<string, unknown>> = [],
): StrategiesData {
  if (raw.length) {
    const target = phoenixSymbol(symbol);

    // Max drawdown over each strategy's live-trading window, keyed by name.
    // `raw` is the 30-day window, so its maxDrawDown only covers the last
    // month; the drawdown comparison wants go-live-to-now instead.
    const liveDrawdown = new Map<string, number>();
    for (const item of rawLiveWindow) {
      if (item.symbol !== target) continue;
      const nm = String(item.strategy ?? "");
      if (nm) liveDrawdown.set(nm, toFloat(item.maxDrawDown));
    }

    const parsed = raw
      .filter((item) => item.symbol === target)
      .map(parseLiveItem)
      .filter((s): s is StrategyOut => s != null)
      .map((s) => {
        const live = liveDrawdown.get(s.name);
        return live == null
          ? s
          : { ...s, maxDrawdownLive: Math.round(live * 10000) / 10000 };
      })
      .sort((a, b) => b.roi - a.roi)
      .slice(0, STRATEGIES_TOP_N);
    if (parsed.length) return { symbol, strategies: parsed, source: "live" };
  }
  return syntheticStrategies(symbol);
}
