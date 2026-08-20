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
const LIST_PASSWORD = "alphanet-0807";
const port = 20001;
const hostname = "127.0.0.1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function txt(body: string, status = 200, filename = "subscribers.txt"): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function listEmails(): string {
  const rows = db.exec("SELECT email_key FROM subscribers ORDER BY created_at ASC");
  if (rows.length === 0) return "";
  return rows[0].values.map((row) => String(row[0]).toLowerCase()).join("\n");
}

Deno.serve({ port, hostname }, async (req) => {
  if (req.method === "GET") {
    const password = new URL(req.url).searchParams.get("password") ?? "";
    if (password !== LIST_PASSWORD) {
      return json({ error: "密码无效" }, 401);
    }
    return txt(listEmails());
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
