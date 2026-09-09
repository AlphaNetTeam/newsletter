import {
  BROWSER_UA,
  PHOENIX_RECENT_STAT_URL,
  PHOENIX_RECENT_STAT_WINDOW_DAYS,
  STRATEGY_LIVE_SINCE_TS,
} from "./config";

async function fetchStats(query: string): Promise<Array<Record<string, unknown>>> {
  // An empty return here silently swaps the whole strategies section over to
  // synthetic example data, so log why rather than failing invisibly.
  const url = `${PHOENIX_RECENT_STAT_URL}${query}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
      next: { revalidate: 10 * 60 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[strategy-stats] ${url} -> HTTP ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
      return [];
    }
    const body = (await res.json()) as { code?: number; data?: unknown };
    if (body.code !== 200 || !Array.isArray(body.data)) {
      console.warn(
        `[strategy-stats] ${url} -> unusable payload, code=${String(body.code)} ` +
          `dataIsArray=${Array.isArray(body.data)}`,
      );
      return [];
    }
    const rows = body.data as Array<Record<string, unknown>>;
    console.info(`[strategy-stats] ${url} -> ok, ${rows.length} rows`);
    return rows;
  } catch (err) {
    console.warn(
      `[strategy-stats] ${url} -> threw ` +
        `${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` +
        `${err instanceof Error && err.cause ? ` cause=${String(err.cause)}` : ""}`,
    );
    return [];
  }
}

// Rolling 30-day window — powers ROI (30D) and the equity curve.
export function fetchRecentStats(): Promise<Array<Record<string, unknown>>> {
  return fetchStats(`?t=${PHOENIX_RECENT_STAT_WINDOW_DAYS}`);
}

// The live-trading window: everything since the strategies went live, up to
// now. Used for the worst-drawdown comparison, which should reflect real
// trading only. Omitting ?t would instead return inception-to-now, which
// includes the pre-launch backtest period and inflates the drawdowns.
export function fetchLiveWindowStats(): Promise<Array<Record<string, unknown>>> {
  return fetchStats(`?t=${STRATEGY_LIVE_SINCE_TS}`);
}
