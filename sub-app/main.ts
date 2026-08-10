import initSqlJs, { type Database } from "sql.js";

const DB_PATH = "subscribers.db";

const SQL = await initSqlJs();
let db: Database;
try {
  const bytes = await Deno.readFile(DB_PATH);
  db = new SQL.Database(bytes);
} catch {
  db = new SQL.Database();
}

function persistDb(): void {
  Deno.writeFileSync(DB_PATH, db.export());
}

db.run(`
  CREATE TABLE IF NOT EXISTS subscribers (
    email_key TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const port = 20001;
const hostname = "127.0.0.1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

Deno.serve({ port, hostname }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "请使用 POST 提交订阅" }, 405);
  }

  let email: string;
  let emailKey: string;
  try {
    const body = await req.json();
    if (typeof body?.email !== "string") {
      return json({ error: "缺少 email 字段" }, 400);
    }
    email = body.email.trim();
    emailKey = email.toLowerCase();
  } catch {
    return json({ error: "请求体必须是 JSON" }, 400);
  }

  if (!email || !EMAIL_RE.test(emailKey)) {
    return json({ error: "邮箱格式无效" }, 400);
  }

  try {
    db.run(
      "INSERT INTO subscribers (email_key, email) VALUES (?, ?)",
      [emailKey, email],
    );
    persistDb();
    return json({ ok: true, message: "订阅成功" }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE")) {
      return json({ error: "该邮箱已订阅" }, 409);
    }
    console.error(err);
    return json({ error: "服务器错误" }, 500);
  }
});

console.log(`邮件订阅服务: http://${hostname}:${port}`);
