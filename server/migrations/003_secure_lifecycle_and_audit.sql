-- STANDBY PostgreSQL 16+ / Supabase Migration 003: Secure File Lifecycle, Retention & Audit Trail
-- Goal 5 [P1-C]: Secure Operations & Observability

-- 1. Source Versions Table Lifecycle Extensions
ALTER TABLE source_versions
    ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '30 days'),
    ADD COLUMN IF NOT EXISTS is_purged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_source_versions_retention ON source_versions (retention_expires_at) WHERE (is_purged = FALSE);

-- 2. Audit Events Table
CREATE TYPE audit_event_type AS ENUM (
    'WORKSPACE_CREATED',
    'MEMBER_ADDED',
    'CASE_CREATED',
    'SOURCE_UPLOADED',
    'SOURCE_PURGED',
    'EXTRACTION_STARTED',
    'EXTRACTION_COMPLETED',
    'FACT_REVIEWED',
    'SNAPSHOT_FROZEN',
    'REVISION_SAVED',
    'REVISION_RESTORED',
    'REVISION_EXPORTED',
    'PERMISSION_DENIED',
    'AUTH_FAILURE'
);

CREATE TABLE IF NOT EXISTS audit_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL,
    event_type audit_event_type NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_time ON audit_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_time ON audit_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type_time ON audit_events (event_type, created_at DESC);

-- 3. RLS Policies for Audit Events (Only OWNER can view audit logs)
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_select_policy ON audit_events
    FOR SELECT
    USING (has_workspace_role(workspace_id, 'OWNER'));

CREATE POLICY audit_events_insert_policy ON audit_events
    FOR INSERT
    WITH CHECK (TRUE); -- System/Service can record audit events
