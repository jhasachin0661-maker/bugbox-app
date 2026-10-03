-- BUG//BOX Database Schema v1.0
-- Apply this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Bug Boxes table
CREATE TABLE IF NOT EXISTS bug_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT DEFAULT 'default',
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
    status TEXT CHECK (status IN ('Captured', 'Reproducible', 'Investigating', 'Resolved', 'Closed')) DEFAULT 'Captured',
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_box_id UUID REFERENCES bug_boxes(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    browser TEXT,
    os TEXT,
    viewport TEXT,
    timezone TEXT
);

-- Events table (user interactions)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL,
    target TEXT,
    metadata JSONB
);

-- Network Events table
CREATE TABLE IF NOT EXISTS network_events (
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
);

-- Console Events table
CREATE TABLE IF NOT EXISTS console_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    level TEXT CHECK (level IN ('log', 'info', 'warn', 'error')) NOT NULL,
    message TEXT NOT NULL,
    source TEXT
);

-- Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    storage_url TEXT NOT NULL,
    viewport TEXT
);

-- Replays table
CREATE TABLE IF NOT EXISTS replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_box_id UUID REFERENCES bug_boxes(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('READY', 'RUNNING', 'SUCCESS', 'FAILED')) DEFAULT 'READY',
    result JSONB
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bug_boxes_created_at ON bug_boxes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_boxes_status ON bug_boxes(status);
CREATE INDEX IF NOT EXISTS idx_bug_boxes_severity ON bug_boxes(severity);
CREATE INDEX IF NOT EXISTS idx_bug_boxes_share_token ON bug_boxes(share_token);
CREATE INDEX IF NOT EXISTS idx_sessions_bug_box_id ON sessions(bug_box_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_network_events_session_id ON network_events(session_id);
CREATE INDEX IF NOT EXISTS idx_console_events_session_id ON console_events(session_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_session_id ON screenshots(session_id);
CREATE INDEX IF NOT EXISTS idx_replays_bug_box_id ON replays(bug_box_id);

-- Row Level Security (RLS) - disabled for MVP demo (enable in production)
-- ALTER TABLE bug_boxes ENABLE ROW LEVEL SECURITY;
-- In production, add policies to restrict access by user/organization

-- Grant permissions for anon key (for demo)
GRANT ALL ON bug_boxes TO anon;
GRANT ALL ON sessions TO anon;
GRANT ALL ON events TO anon;
GRANT ALL ON network_events TO anon;
GRANT ALL ON console_events TO anon;
GRANT ALL ON screenshots TO anon;
GRANT ALL ON replays TO anon;

-- MVP demo access: API routes use the Supabase anon key without auth.
-- Replace this with authenticated ownership policies before production use.
ALTER TABLE bug_boxes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE console_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE replays DISABLE ROW LEVEL SECURITY;
