import { neon } from '@neondatabase/serverless';

export type Row = Record<string, any>;
type Sql = (strings: TemplateStringsArray, ...values: any[]) => Promise<Row[]>;

let client: Sql | null = null;
let ready: Promise<void> | null = null;

function connect(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set. Connect a Neon Postgres database in Vercel > Storage.');
    client = neon(url) as unknown as Sql;
  }
  return client;
}

async function migrate(sql: Sql) {
  // Days are stored as 'YYYY-MM-DD' text and times as 'HH:MM' text to avoid time-zone surprises.
  await sql`CREATE TABLE IF NOT EXISTS plan_items (
    id SERIAL PRIMARY KEY,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Activity',
    status TEXT NOT NULL DEFAULT 'todo',
    actual_time TEXT,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS plan_items_day ON plan_items(day)`;
  await sql`CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    shared BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS logs_day ON logs(day)`;
  await sql`CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    place TEXT,
    added_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS day_status (
    day TEXT PRIMARY KEY,
    sick BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    target TEXT,
    total INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS added_by TEXT NOT NULL DEFAULT 'admin'`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_status TEXT`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_summary TEXT`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_at TIMESTAMPTZ`;
  await sql`CREATE TABLE IF NOT EXISTS ai_reviews (
    id SERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    requested_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    at TIMESTAMPTZ DEFAULT now()
  )`;
}

/** Returns the SQL client, creating the tables on first use. */
export async function db(): Promise<Sql> {
  const sql = connect();
  if (!ready) ready = migrate(sql).catch((e) => { ready = null; throw e; });
  await ready;
  return sql;
}

/** Adds a line to the admin's "Updates from her" feed. */
export async function addEvent(kind: string, text: string) {
  const sql = await db();
  await sql`INSERT INTO events (kind, text) VALUES (${kind}, ${text})`;
}
