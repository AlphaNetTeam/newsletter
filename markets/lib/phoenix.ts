import { BROWSER_UA, PHOENIX_RECENT_STAT_URL, PHOENIX_RECENT_STAT_WINDOW_DAYS } from "./config";

export async function fetchRecentStats(): Promise<Array<Record<string, unknown>>> {
  try {
    const url = `${PHOENIX_RECENT_STAT_URL}?t=${PHOENIX_RECENT_STAT_WINDOW_DAYS}`;
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
