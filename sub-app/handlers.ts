import {
  BROADCAST_CONCURRENCY,
  EMAIL_RE,
  LIST_PASSWORD,
  PUBLIC_BASE_URL,
  SOURCE_MAX_LEN,
} from "./config.ts";
import {
  addSubscriber,
  createCampaign,
  getCampaign,
  getCampaignStats,
  listAdClicks,
  listCampaignStats,
  listSubscribers,
  recordAdClick,
  recordTracking,
  removeSubscriber,
  setCampaignSent,
} from "./db.ts";
import {
  html,
  json,
  parseHttpUrl,
  publicOrigin,
  readJsonObject,
  timingSafeEqual,
  trackingPixel,
} from "./http.ts";
import { sendBroadcastMail, smtpReady } from "./mail.ts";
import { adClickUrl, trackingUrl, unsubscribeKey, unsubscribeUrl } from "./unsub.ts";
import { log, logError } from "./log.ts";

function parseSource(value: unknown): { ok: true; source: string } | { ok: false; response: Response } {
  if (value === undefined || value === null) return { ok: true, source: "" };
  if (typeof value !== "string") {
    return { ok: false, response: json({ error: "source 必须是字符串" }, 400) };
  }
  return { ok: true, source: value.trim().slice(0, SOURCE_MAX_LEN) };
}

export async function handleSubscribe(req: Request): Promise<Response> {
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;

  if (typeof parsed.value.email !== "string") {
    return json({ error: "缺少 email 字段" }, 400);
  }

  const email = parsed.value.email.trim();
  const emailKey = email.toLowerCase();
  if (!email || !EMAIL_RE.test(emailKey)) {
    log("subscribe invalid email");
    return json({ error: "邮箱格式无效" }, 400);
  }

  const sourceParsed = parseSource(parsed.value.source);
  if (!sourceParsed.ok) return sourceParsed.response;

  try {
    const created = await addSubscriber(emailKey, email, sourceParsed.source);
    if (!created) {
      log("subscribe duplicate", { email: emailKey, source: sourceParsed.source });
      return json({ error: "该邮箱已订阅" }, 409);
    }
    log("subscribe ok", { email: emailKey, source: sourceParsed.source });
    return json({ ok: true, message: "订阅成功" }, 201);
  } catch (err) {
    logError("subscribe failed", err);
    return json({ error: "服务器错误" }, 500);
  }
}

export async function handleUnsubscribe(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const emailKey = (params.get("email") ?? "").trim().toLowerCase();
  const key = params.get("key") ?? "";

  if (!emailKey || !EMAIL_RE.test(emailKey) || !key) {
    log("unsubscribe invalid link");
    return html("<p>This unsubscribe link is invalid.</p>", 400);
  }

  const expected = await unsubscribeKey(emailKey);
  if (!timingSafeEqual(expected, key)) {
    log("unsubscribe bad key", { email: emailKey });
    return html("<p>This unsubscribe link is invalid.</p>", 400);
  }

  await removeSubscriber(emailKey);
  log("unsubscribe ok", { email: emailKey });
  return html("<p>You have been unsubscribed.</p>");
}

export function handleList(req: Request): Response {
  const denied = requirePassword(req);
  if (denied) return denied;
  return json(
    listSubscribers().map((s) => ({
      email: s.email,
      source: s.source,
      created_at: s.createdAt,
    })),
  );
}

function requirePassword(req: Request): Response | null {
  const password = new URL(req.url).searchParams.get("password") ?? "";
  if (!timingSafeEqual(password, LIST_PASSWORD)) {
    log("auth failed", { path: new URL(req.url).pathname });
    return json({ error: "密码无效" }, 401);
  }
  return null;
}

function campaignJson(s: {
  id: number;
  link: string;
  createdAt: string;
  sent: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
}) {
  return {
    id: s.id,
    link: s.link,
    created_at: s.createdAt,
    sent: s.sent,
    opens: s.opens,
    unique_opens: s.uniqueOpens,
    clicks: s.clicks,
    unique_clicks: s.uniqueClicks,
  };
}

export function handleStats(req: Request): Response {
  const denied = requirePassword(req);
  if (denied) return denied;

  const idRaw = new URL(req.url).searchParams.get("id");
  if (idRaw == null || idRaw === "") {
    return json({ campaigns: listCampaignStats().map(campaignJson) });
  }

  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: "id 无效" }, 400);
  }
  const stats = getCampaignStats(id);
  if (!stats) return json({ error: "群发不存在" }, 404);
  return json(campaignJson(stats));
}

async function signedTrackParams(
  req: Request,
): Promise<{ emailKey: string; campaignId: number } | null> {
  const params = new URL(req.url).searchParams;
  const emailKey = (params.get("email") ?? "").trim().toLowerCase();
  const key = params.get("key") ?? "";
  const campaignId = Number(params.get("id"));
  if (!emailKey || !EMAIL_RE.test(emailKey) || !key) return null;
  if (!Number.isInteger(campaignId) || campaignId <= 0) return null;
  const expected = await unsubscribeKey(emailKey);
  if (!timingSafeEqual(expected, key)) return null;
  return { emailKey, campaignId };
}

export async function handleOpen(req: Request): Promise<Response> {
  const signed = await signedTrackParams(req);
  if (signed && getCampaign(signed.campaignId)) {
    try {
      await recordTracking(signed.campaignId, signed.emailKey, "open");
      log("open", { id: signed.campaignId, email: signed.emailKey });
    } catch (err) {
      logError("record open failed", err);
    }
  }
  return trackingPixel();
}

export async function handleClick(req: Request): Promise<Response> {
  const signed = await signedTrackParams(req);
  if (!signed) {
    log("click invalid link");
    return html("<p>This link is invalid.</p>", 400);
  }
  const campaign = getCampaign(signed.campaignId);
  if (!campaign) {
    log("click missing campaign", { id: signed.campaignId, email: signed.emailKey });
    return html("<p>This link is invalid.</p>", 404);
  }
  try {
    await recordTracking(signed.campaignId, signed.emailKey, "click");
    log("click", { id: signed.campaignId, email: signed.emailKey });
  } catch (err) {
    logError("record click failed", err);
  }
  return Response.redirect(campaign.link, 302);
}

async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  }));
}

export async function handleBroadcast(req: Request): Promise<Response> {
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;

  const password = typeof parsed.value.password === "string" ? parsed.value.password : "";
  const link = parseHttpUrl(parsed.value.link);

  if (!timingSafeEqual(password, LIST_PASSWORD)) {
    log("auth failed", { path: "/api/subscribe/broadcast" });
    return json({ error: "密码无效" }, 401);
  }
  if (!link) {
    return json({ error: "link 必须是 http(s) URL" }, 400);
  }
  if (!PUBLIC_BASE_URL) {
    log("broadcast missing PUBLIC_BASE_URL");
    return json({ error: "未配置 PUBLIC_BASE_URL，无法生成追踪/退订链接" }, 503);
  }
  const smtpError = smtpReady();
  if (smtpError) {
    log("broadcast smtp not ready", { error: smtpError });
    return json({ error: smtpError }, 503);
  }

  const subscribers = listSubscribers();
  if (subscribers.length === 0) {
    log("broadcast skipped, no subscribers");
    return json({ ok: true, sent: 0, failed: 0, message: "没有订阅用户" });
  }

  const campaign = await createCampaign(link);
  log("broadcast start", { id: campaign.id, link, recipients: subscribers.length });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  await mapPool(subscribers, BROADCAST_CONCURRENCY, async (sub) => {
    try {
      const [unsub, click, open] = await Promise.all([
        unsubscribeUrl(sub.emailKey),
        trackingUrl("click", sub.emailKey, campaign.id),
        trackingUrl("open", sub.emailKey, campaign.id),
      ]);
      await sendBroadcastMail(sub.email, link, click, open, unsub);
      sent++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${sub.emailKey}: ${message}`);
      logError(`broadcast send failed ${sub.emailKey}`, err);
    }
  });

  await setCampaignSent(campaign.id, sent);
  log("broadcast done", { id: campaign.id, sent, failed });

  return json({
    ok: failed === 0,
    id: campaign.id,
    sent,
    failed,
    errors: errors.slice(0, 20),
  });
}

export async function handleAdClick(req: Request): Promise<Response> {
  const emailKey = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();

  if (!emailKey || !EMAIL_RE.test(emailKey)) {
    log("ad click invalid email");
    return html("<p>This link is invalid.</p>", 400);
  }

  try {
    await recordAdClick(emailKey);
    log("ad click", { email: emailKey });
  } catch (err) {
    logError("record ad click failed", err);
  }

  return new Response("waitlist added", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function handleAdStats(req: Request): Response {
  const denied = requirePassword(req);
  if (denied) return denied;
  const data = listAdClicks();
  return json({
    clicks: data.clicks,
    unique_clicks: data.uniqueClicks,
    users: data.users.map((u) => ({
      email: u.email,
      clicks: u.clicks,
      first_at: u.firstAt,
      last_at: u.lastAt,
    })),
  });
}

export function handleAdLinks(req: Request): Response {
  const denied = requirePassword(req);
  if (denied) return denied;

  const origin = publicOrigin(req);
  const links = listSubscribers().map((s) => ({
    email: s.email,
    url: adClickUrl(origin, s.emailKey),
  }));
  return json({ count: links.length, links });
}
