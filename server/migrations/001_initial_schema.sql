-- STANDBY Stage Pre-flight Verifier — Production Schema Migration 001
-- Targets: PostgreSQL 16+ / Supabase

BEGIN;

-- 1. Workspaces & Cases
CREATE TABLE IF NOT EXISTS workspaces (
    workspace_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
    case_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_workspace ON cases(workspace_id);

-- 2. Sources (대본, 큐시트, 무대사양 원본 메타데이터)
CREATE TYPE source_role_enum AS ENUM ('SCRIPT', 'MASTER_CUE', 'STAGE_SPEC');
CREATE TYPE source_origin_enum AS ENUM ('USER_PROVIDED', 'CONTROLLED_FIXTURE', 'EXAMPLE_CUE');
CREATE TYPE source_authority_enum AS ENUM ('REVIEWED', 'UNREVIEWED');

CREATE TABLE IF NOT EXISTS source_versions (
    source_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    role source_role_enum NOT NULL,
    sha256 TEXT NOT NULL,
    origin source_origin_enum NOT NULL DEFAULT 'USER_PROVIDED',
    authority source_authority_enum NOT NULL DEFAULT 'REVIEWED',
    media_type TEXT,
    original_filename TEXT,
    storage_key TEXT, -- S3/GCS/Supabase Storage Object Key
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_case_source_role UNIQUE (case_id, role)
);

CREATE INDEX IF NOT EXISTS idx_sources_case ON source_versions(case_id);

-- 3. Extraction Runs & Fact Candidates
CREATE TABLE IF NOT EXISTS extraction_runs (
    run_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    provider TEXT NOT NULL,
    provider_job_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fact_candidates (
    fact_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES source_versions(source_id) ON DELETE CASCADE,
    role source_role_enum NOT NULL,
    fact_type TEXT NOT NULL,
    locator TEXT NOT NULL,
    quote TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
    raw_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_candidates_case ON fact_candidates(case_id);

-- 4. Review Records & Immutable Snapshots
CREATE TABLE IF NOT EXISTS fact_reviews (
    review_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    fact_id TEXT NOT NULL REFERENCES fact_candidates(fact_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'MODIFIED')),
    modified_value JSONB,
    reviewed_by TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_case_fact_review UNIQUE (case_id, fact_id)
);

CREATE TABLE IF NOT EXISTS review_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    source_snapshot_digest TEXT NOT NULL,
    fact_snapshot_digest TEXT NOT NULL,
    reviewed_fact_ids JSONB NOT NULL, -- string[]
    frozen_candidates JSONB NOT NULL,
    frozen_by TEXT NOT NULL,
    frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_snapshots_case ON review_snapshots(case_id);

-- 5. Cue Revisions (Append-Only Revision History)
CREATE TABLE IF NOT EXISTS cue_revisions (
    revision_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    parent_revision_id TEXT REFERENCES cue_revisions(revision_id),
    base_source_sha256 TEXT NOT NULL,
    revision_hash TEXT NOT NULL,
    patches JSONB NOT NULL DEFAULT '[]'::jsonb,
    rows JSONB NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cue_revisions_case ON cue_revisions(case_id);

-- 6. Verification Runs & Findings
CREATE TABLE IF NOT EXISTS verification_runs (
    run_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    snapshot_id TEXT NOT NULL REFERENCES review_snapshots(snapshot_id) ON DELETE CASCADE,
    revision_id TEXT NOT NULL REFERENCES cue_revisions(revision_id) ON DELETE CASCADE,
    result_hash TEXT NOT NULL,
    findings JSONB NOT NULL, -- Finding[] with 3-source evidence
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_runs_case ON verification_runs(case_id);

-- 7. Idempotency & Operations
CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (idempotency_key, actor_id)
);

COMMIT;
