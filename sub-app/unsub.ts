import { API_PATH, APP_SECRET, PUBLIC_BASE_URL } from "./config.ts";

const hmacKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(APP_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);

export async function unsubscribeKey(emailKey: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(emailKey));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function unsubscribeUrl(emailKey: string): Promise<string> {
  const key = await unsubscribeKey(emailKey);
  const url = new URL(`${PUBLIC_BASE_URL}${API_PATH}/unsubscribe`);
  url.searchParams.set("email", emailKey);
  url.searchParams.set("key", key);
  return url.toString();
}

export async function trackingUrl(
  kind: "open" | "click",
  emailKey: string,
  campaignId: number,
): Promise<string> {
  const key = await unsubscribeKey(emailKey);
  const url = new URL(`${PUBLIC_BASE_URL}${API_PATH}/${kind}`);
  url.searchParams.set("email", emailKey);
  url.searchParams.set("key", key);
  url.searchParams.set("id", String(campaignId));
  return url.toString();
}
