export function formatUsd(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  const decimals = value < 10 ? 4 : value < 1000 ? 2 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value: number): string {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// Two-decimal percentage, matching the ROI column on
// trade.alphanet.global/leaderboard (e.g. "+110.67%", "-0.53%"). Kept
// separate from formatPct because the stats row (1 MONTH / YTD / 1 YEAR)
// and the page metadata deliberately stay at one decimal.
export function formatRoiPct(value: number): string {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatSmallPct(value: number): string {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4)}%`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatAxisTick(ts: number, range: "1M" | "3M" | "1Y" | "ALL"): string {
  const d = new Date(ts);
  if (range === "1M") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

export function formatNewsDate(ms: number): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString("en-US", { day: "2-digit" });
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
