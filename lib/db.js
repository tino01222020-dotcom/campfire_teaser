import { sql } from '@vercel/postgres';

// ── Schema Migration ──
export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS connections (
      id          SERIAL PRIMARY KEY,
      provider    TEXT NOT NULL UNIQUE,
      credentials JSONB NOT NULL DEFAULT '{}',
      status      TEXT DEFAULT 'disconnected',
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      platform    TEXT,
      phase       TEXT DEFAULT 'lead',
      status      TEXT DEFAULT 'draft',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id           SERIAL PRIMARY KEY,
      email        TEXT,
      line_user_id TEXT,
      channel      TEXT NOT NULL,
      source_lp    TEXT,
      campaign     TEXT,
      phase        TEXT DEFAULT 'lead',
      utm_source   TEXT,
      utm_medium   TEXT,
      utm_campaign TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS ad_metrics (
      id          SERIAL PRIMARY KEY,
      provider    TEXT NOT NULL,
      campaign_id TEXT,
      campaign_name TEXT,
      date        DATE NOT NULL,
      phase       TEXT DEFAULT 'lead',
      impressions BIGINT DEFAULT 0,
      clicks      BIGINT DEFAULT 0,
      spend       NUMERIC(12,2) DEFAULT 0,
      conversions INT DEFAULT 0,
      conv_value  NUMERIC(12,2) DEFAULT 0,
      ctr         NUMERIC(6,4) DEFAULT 0,
      cvr         NUMERIC(6,4) DEFAULT 0,
      cpl         NUMERIC(10,2) DEFAULT 0,
      cpa         NUMERIC(10,2) DEFAULT 0,
      raw_data    JSONB DEFAULT '{}',
      synced_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider, campaign_id, date)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS sequences (
      id          SERIAL PRIMARY KEY,
      campaign    TEXT,
      name        TEXT NOT NULL,
      channel     TEXT NOT NULL,
      delay_hours INT DEFAULT 0,
      trigger_type TEXT DEFAULT 'delay',
      content     TEXT,
      subject     TEXT,
      phase       TEXT DEFAULT 'lead',
      status      TEXT DEFAULT 'draft',
      sort_order  INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS deliveries (
      id          SERIAL PRIMARY KEY,
      sequence_id INT REFERENCES sequences(id),
      lead_id     INT REFERENCES leads(id),
      status      TEXT DEFAULT 'pending',
      sent_at     TIMESTAMPTZ,
      opened_at   TIMESTAMPTZ,
      clicked_at  TIMESTAMPTZ,
      error       TEXT
    )`;

  await sql`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ad_metrics_date ON ad_metrics(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ad_metrics_provider ON ad_metrics(provider)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status)`;

  // ── AI Task Queue (Claude Code Worker) ──
  await sql`
    CREATE TABLE IF NOT EXISTS ai_tasks (
      id          SERIAL PRIMARY KEY,
      task_type   TEXT NOT NULL,
      status      TEXT DEFAULT 'pending',
      input       JSONB NOT NULL DEFAULT '{}',
      result      JSONB,
      error       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      started_at  TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_tasks_type ON ai_tasks(task_type)`;

  return { success: true };
}

// ── Connection helpers ──
export async function getConnection(provider) {
  const { rows } = await sql`SELECT * FROM connections WHERE provider = ${provider}`;
  return rows[0] || null;
}

export async function saveConnection(provider, credentials, status = 'connected') {
  await sql`
    INSERT INTO connections (provider, credentials, status, updated_at)
    VALUES (${provider}, ${JSON.stringify(credentials)}, ${status}, NOW())
    ON CONFLICT (provider) DO UPDATE SET
      credentials = ${JSON.stringify(credentials)},
      status = ${status},
      updated_at = NOW()`;
}

export async function removeConnection(provider) {
  await sql`UPDATE connections SET status = 'disconnected', credentials = '{}', updated_at = NOW() WHERE provider = ${provider}`;
}

export async function getAllConnections() {
  const { rows } = await sql`SELECT provider, status, updated_at FROM connections ORDER BY provider`;
  return rows;
}

export { sql };
