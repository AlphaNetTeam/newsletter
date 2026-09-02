import { API_PATH, PUBLIC_BASE_URL } from "./config.ts";

export type Route =
  | "subscribe"
  | "unsubscribe"
  | "broadcast"
  | "open"
  | "click"
  | "stats"
  | "ad"
  | "ad-stats"
  | "ad-links"
  | "unknown";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function html(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AlphaNet</title></head><body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 48px auto; padding: 0 16px; color: #111;">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

const PIXEL_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

export function trackingPixel(): Response {
  return new Response(PIXEL_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL_GIF.byteLength),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}

export function routeName(pathname: string): Route {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === `${API_PATH}/unsubscribe`) return "unsubscribe";
  if (p === `${API_PATH}/broadcast`) return "broadcast";
  if (p === `${API_PATH}/open`) return "open";
  if (p === `${API_PATH}/click`) return "click";
  if (p === `${API_PATH}/stats`) return "stats";
  if (p === `${API_PATH}/ad/stats`) return "ad-stats";
  if (p === `${API_PATH}/ad/links`) return "ad-links";
  if (p === `${API_PATH}/ad`) return "ad";
  if (p === API_PATH) return "subscribe";
  return "unknown";
}

export function publicOrigin(req: Request): string {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function readJsonObject(
  req: Request,
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: Response }> {
  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { ok: false, response: json({ error: "请求体必须是 JSON 对象" }, 400) };
    }
    return { ok: true, value: body as Record<string, unknown> };
  } catch {
    return { ok: false, response: json({ error: "请求体必须是 JSON" }, 400) };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(aa.length, bb.length);
  let out = aa.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    out |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return out === 0;
}
