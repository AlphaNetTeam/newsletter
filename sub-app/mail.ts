import nodemailer from "nodemailer";
import {
  BROADCAST_CONCURRENCY,
  MAIL_SUBJECT,
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_USER,
} from "./config.ts";
import { escapeHtml } from "./http.ts";

const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>AlphaNet has a new post:</p>
  <p><a href="{{CLICK_URL}}" style="color: #0a7; word-break: break-all;">{{LINK}}</a></p>
  <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
    Don't want these emails?
    <a href="{{UNSUBSCRIBE_URL}}" style="color: #888;">Unsubscribe</a>
  </p>
  <img src="{{OPEN_URL}}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;">
</body>
</html>`;

export function smtpReady(): string | null {
  if (!SMTP_HOST || !SMTP_FROM) return "未配置 SMTP（需要 SMTP_HOST、SMTP_FROM）";
  return null;
}

function renderEmail(
  link: string,
  clickUrl: string,
  openUrl: string,
  unsubUrl: string,
): { html: string; text: string } {
  return {
    html: EMAIL_TEMPLATE
      .replaceAll("{{LINK}}", escapeHtml(link))
      .replaceAll("{{CLICK_URL}}", escapeHtml(clickUrl))
      .replaceAll("{{OPEN_URL}}", escapeHtml(openUrl))
      .replaceAll("{{UNSUBSCRIBE_URL}}", escapeHtml(unsubUrl)),
    text: `AlphaNet has a new post:\n${clickUrl}\n\nUnsubscribe: ${unsubUrl}\n`,
  };
}

function getTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    pool: true,
    maxConnections: BROADCAST_CONCURRENCY,
  });
}

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

export async function sendBroadcastMail(
  to: string,
  link: string,
  clickUrl: string,
  openUrl: string,
  unsubUrl: string,
): Promise<void> {
  const content = renderEmail(link, clickUrl, openUrl, unsubUrl);
  transport ??= getTransport();
  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject: MAIL_SUBJECT,
    text: content.text,
    html: content.html,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>`,
    },
  });
}
