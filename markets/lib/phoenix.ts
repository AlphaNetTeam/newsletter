import { BROWSER_UA, PHOENIX_RECENT_STAT_URL, PHOENIX_RECENT_STAT_WINDOW_DAYS } from "./config";

async function fetchStats(query: string): Promise<Array<Record<string, unknown>>> {
  try {
    const url = `${PHOENIX_RECENT_STAT_URL}${query}`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
      next: { revalidate: 10 * 60 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { code?: number; data?: unknown };
    if (body.code !== 200 || !Array.isArray(body.data)) return [];
    return body.data as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

// Rolling 30-day window — powers ROI (30D) and the equity curve.
export function fetchRecentStats(): Promise<Array<Record<string, unknown>>> {
  return fetchStats(`?t=${PHOENIX_RECENT_STAT_WINDOW_DAYS}`);
}

// Omitting ?t returns the strategy's full live window (inception -> now).
// The upstream API only honours t=30 and t=90; every other value silently
// falls back to this same all-time window, so we ask for it explicitly by
// sending no parameter at all. Used for the worst-drawdown comparison,
// which should reflect the whole time a strategy has been live.
export function fetchLifetimeStats(): Promise<Array<Record<string, unknown>>> {
  return fetchStats("");
}
