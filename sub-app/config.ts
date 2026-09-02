export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIST_PASSWORD = Deno.env.get("LIST_PASSWORD") ?? "alphanet-0807";
export const APP_SECRET = Deno.env.get("APP_SECRET") ?? "alphanet-unsub-0807";

export const port = 20001;
export const hostname = "127.0.0.1";

/** 所有接口都挂在这个前缀下，反代只需代理这一条。 */
export const API_PATH = "/api/subscribe";

export const PUBLIC_BASE_URL = (Deno.env.get("PUBLIC_BASE_URL") ?? "").replace(/\/$/, "");

export const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
export const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "587");
export const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
export const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
export const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? SMTP_USER;
export const MAIL_SUBJECT = Deno.env.get("MAIL_SUBJECT") ?? "AlphaNet";

export const BROADCAST_CONCURRENCY = 5;
export const SOURCE_MAX_LEN = 200;
