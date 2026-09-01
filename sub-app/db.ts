import initSqlJs, { type Database, type Statement } from "sql.js";

const DB_PATH = "subscribers.db";

const SQL = await initSqlJs();
let db: Database;
try {
  db = new SQL.Database(await Deno.readFile(DB_PATH));
} catch {
  db = new SQL.Database();
}

db.run(`
  CREATE TABLE IF NOT EXISTS subscribers (
    email_key TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent INTEGER NOT NULL DEFAULT 0
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS tracking_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    email_key TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.run(`
  CREATE INDEX IF NOT EXISTS idx_tracking_campaign_kind
  ON tracking_events (campaign_id, kind)
`);

if (!columnNames("subscribers").has("source")) {
  db.run("ALTER TABLE subscribers ADD COLUMN source TEXT NOT NULL DEFAULT ''");
}

let writeChain = Promise.resolve();

function persistDb(): Promise<void> {
  const bytes = db.export();
  const job = writeChain.then(() => Deno.writeFile(DB_PATH, bytes));
  writeChain = job.then(() => {}, () => {});
  return job;
}

await persistDb();

function columnNames(table: string): Set<string> {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  return new Set(collect(stmt, (row) => String(row.name)));
}

function collect<T>(stmt: Statement, map: (row: Record<string, unknown>) => T): T[] {
  const out: T[] = [];
  try {
    while (stmt.step()) {
      out.push(map(stmt.getAsObject()));
    }
  } finally {
    stmt.free();
  }
  return out;
}

function lastId(): number {
  const rows = db.exec("SELECT last_insert_rowid()");
  return Number(rows[0].values[0][0]);
}

export type Subscriber = {
  emailKey: string;
  email: string;
  source: string;
  createdAt: string;
};

export type Campaign = {
  id: number;
  link: string;
  createdAt: string;
  sent: number;
};

export type CampaignStats = Campaign & {
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
};

export function listSubscribers(): Subscriber[] {
  const stmt = db.prepare(
    "SELECT email_key, email, source, created_at FROM subscribers ORDER BY created_at ASC",
  );
  return collect(stmt, (row) => ({
    emailKey: String(row.email_key).toLowerCase(),
    email: String(row.email),
    source: String(row.source ?? ""),
    createdAt: String(row.created_at),
  }));
}

export function hasSubscriber(emailKey: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM subscribers WHERE email_key = ?");
  stmt.bind([emailKey]);
  try {
    return stmt.step();
  } finally {
    stmt.free();
  }
}

export async function addSubscriber(
  emailKey: string,
  email: string,
  source: string,
): Promise<boolean> {
  if (hasSubscriber(emailKey)) return false;
  db.run(
    "INSERT INTO subscribers (email_key, email, source) VALUES (?, ?, ?)",
    [emailKey, email, source],
  );
  await persistDb();
  return true;
}

export async function removeSubscriber(emailKey: string): Promise<void> {
  db.run("DELETE FROM subscribers WHERE email_key = ?", [emailKey]);
  await persistDb();
}

export async function createCampaign(link: string): Promise<Campaign> {
  db.run("INSERT INTO campaigns (link) VALUES (?)", [link]);
  const id = lastId();
  await persistDb();
  return getCampaign(id)!;
}

export function getCampaign(id: number): Campaign | null {
  const stmt = db.prepare(
    "SELECT id, link, created_at, sent FROM campaigns WHERE id = ?",
  );
  stmt.bind([id]);
  try {
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    return {
      id: Number(row.id),
      link: String(row.link),
      createdAt: String(row.created_at),
      sent: Number(row.sent),
    };
  } finally {
    stmt.free();
  }
}

export async function setCampaignSent(id: number, sent: number): Promise<void> {
  db.run("UPDATE campaigns SET sent = ? WHERE id = ?", [sent, id]);
  await persistDb();
}

export async function recordTracking(
  campaignId: number,
  emailKey: string,
  kind: "open" | "click",
): Promise<void> {
  db.run(
    "INSERT INTO tracking_events (campaign_id, email_key, kind) VALUES (?, ?, ?)",
    [campaignId, emailKey, kind],
  );
  await persistDb();
}

function campaignCounts(id: number): {
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
} {
  const stmt = db.prepare(`
    SELECT kind,
           COUNT(*) AS total,
           COUNT(DISTINCT email_key) AS unique_count
    FROM tracking_events
    WHERE campaign_id = ?
    GROUP BY kind
  `);
  stmt.bind([id]);
  const counts = { opens: 0, uniqueOpens: 0, clicks: 0, uniqueClicks: 0 };
  try {
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const total = Number(row.total);
      const unique = Number(row.unique_count);
      if (row.kind === "open") {
        counts.opens = total;
        counts.uniqueOpens = unique;
      } else if (row.kind === "click") {
        counts.clicks = total;
        counts.uniqueClicks = unique;
      }
    }
  } finally {
    stmt.free();
  }
  return counts;
}

export function listCampaignStats(): CampaignStats[] {
  const stmt = db.prepare(
    "SELECT id, link, created_at, sent FROM campaigns ORDER BY id DESC",
  );
  return collect(stmt, (row) => {
    const id = Number(row.id);
    return {
      id,
      link: String(row.link),
      createdAt: String(row.created_at),
      sent: Number(row.sent),
      ...campaignCounts(id),
    };
  });
}

export function getCampaignStats(id: number): CampaignStats | null {
  const campaign = getCampaign(id);
  if (!campaign) return null;
  return { ...campaign, ...campaignCounts(id) };
}
