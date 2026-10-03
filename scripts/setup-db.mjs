/**
 * Apply BUG//BOX schema to Supabase via management REST API.
 * Run with: node scripts/setup-db.mjs
 * 
 * This uses the Supabase database directly via its REST SQL endpoint.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || 'configured-project';

const statements = [
  // Extensions
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  // bug_boxes
  `CREATE TABLE IF NOT EXISTS bug_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT DEFAULT 'default',
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
    status TEXT CHECK (status IN ('Captured', 'Reproducible', 'Investigating', 'Resolved', 'Closed')) DEFAULT 'Captured',
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,

  // sessions
  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_box_id UUID REFERENCES bug_boxes(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    browser TEXT,
    os TEXT,
    viewport TEXT,
    timezone TEXT
  )`,

  // events
  `CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL,
    target TEXT,
    metadata JSONB
  )`,

  // network_events
  `CREATE TABLE IF NOT EXISTS network_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    payload_redacted JSONB
  )`,

  // console_events
  `CREATE TABLE IF NOT EXISTS console_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    level TEXT CHECK (level IN ('log', 'info', 'warn', 'error')) NOT NULL,
    message TEXT NOT NULL,
    source TEXT
  )`,

  // screenshots
  `CREATE TABLE IF NOT EXISTS screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    storage_url TEXT NOT NULL,
    viewport TEXT
  )`,

  // replays
  `CREATE TABLE IF NOT EXISTS replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_box_id UUID REFERENCES bug_boxes(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('READY', 'RUNNING', 'SUCCESS', 'FAILED')) DEFAULT 'READY',
    result JSONB
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_bug_boxes_created_at ON bug_boxes(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bug_boxes_status ON bug_boxes(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bug_boxes_share_token ON bug_boxes(share_token)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_bug_box_id ON sessions(bug_box_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_network_events_session_id ON network_events(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_console_events_session_id ON console_events(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_replays_bug_box_id ON replays(bug_box_id)`,
];

async function executeStatement(sql) {
  const url = `${SUPABASE_URL}/pg/query`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-db-password': DB_PASSWORD,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    const text = await response.text();
    return { ok: response.ok, status: response.status, body: text };
  } catch (err) {
    return { ok: false, status: 0, body: err.message };
  }
}

async function main() {
  if (!SUPABASE_URL || !DB_PASSWORD) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD before running schema setup.');
  }

  console.log('🚀 Applying BUG//BOX schema to Supabase...\n');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`URL: ${SUPABASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').trim().slice(0, 70);
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

    const result = await executeStatement(stmt);
    
    if (result.ok || result.body.includes('already exists')) {
      console.log('✓');
      success++;
    } else {
      console.log(`✗ (${result.status}: ${result.body.slice(0, 100)})`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${success} succeeded, ${failed} failed`);

  if (failed > 0) {
    console.log('\n⚠️  Some statements failed. Please apply the schema manually:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('   2. Copy and paste the contents of: supabase/schema.sql');
    console.log('   3. Click "Run"\n');
  }
}

main().catch(console.error);
