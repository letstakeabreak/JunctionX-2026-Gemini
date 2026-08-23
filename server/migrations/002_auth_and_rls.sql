-- STANDBY PostgreSQL 16+ / Supabase Migration 002: Auth, Workspace Members & Row Level Security (RLS)
-- Goal 4 [P1-B]: Multi-Tenancy & Role-Based Access Control

-- 1. Workspace Members Table
CREATE TYPE workspace_role AS ENUM ('OWNER', 'EDITOR', 'REVIEWER', 'VIEWER');

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role workspace_role NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_role ON workspace_members (workspace_id, role);

-- 2. Enable Row Level Security (RLS) on all domain tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_runs ENABLE ROW LEVEL SECURITY;

-- 3. Helper function: Check if current authenticated user has at least the required role in the workspace
CREATE OR REPLACE FUNCTION has_workspace_role(target_workspace_id UUID, required_role workspace_role)
RETURNS BOOLEAN AS $$
DECLARE
    user_role workspace_role;
BEGIN
    SELECT role INTO user_role
    FROM workspace_members
    WHERE workspace_id = target_workspace_id
      AND user_id = auth.uid();

    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF required_role = 'VIEWER' THEN
        RETURN TRUE; -- All roles (OWNER, EDITOR, REVIEWER, VIEWER) have at least VIEWER access
    ELSIF required_role = 'REVIEWER' THEN
        RETURN user_role IN ('OWNER', 'EDITOR', 'REVIEWER');
    ELSIF required_role = 'EDITOR' THEN
        RETURN user_role IN ('OWNER', 'EDITOR');
    ELSIF required_role = 'OWNER' THEN
        RETURN user_role = 'OWNER';
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies for Workspaces
CREATE POLICY workspaces_select_policy ON workspaces
    FOR SELECT
    USING (has_workspace_role(workspace_id, 'VIEWER'));

CREATE POLICY workspaces_insert_policy ON workspaces
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY workspaces_update_policy ON workspaces
    FOR UPDATE
    USING (has_workspace_role(workspace_id, 'OWNER'));

-- 5. RLS Policies for Workspace Members
CREATE POLICY members_select_policy ON workspace_members
    FOR SELECT
    USING (has_workspace_role(workspace_id, 'VIEWER'));

CREATE POLICY members_manage_policy ON workspace_members
    FOR ALL
    USING (has_workspace_role(workspace_id, 'OWNER'));

-- 6. RLS Policies for Cases
CREATE POLICY cases_select_policy ON cases
    FOR SELECT
    USING (has_workspace_role(workspace_id, 'VIEWER'));

CREATE POLICY cases_insert_policy ON cases
    FOR INSERT
    WITH CHECK (has_workspace_role(workspace_id, 'EDITOR'));

CREATE POLICY cases_update_policy ON cases
    FOR UPDATE
    USING (has_workspace_role(workspace_id, 'EDITOR'));

-- 7. RLS Policies for Sources & Extractions
CREATE POLICY sources_select_policy ON source_versions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = source_versions.case_id
          AND has_workspace_role(c.workspace_id, 'VIEWER')
    ));

CREATE POLICY sources_insert_policy ON source_versions
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = source_versions.case_id
          AND has_workspace_role(c.workspace_id, 'EDITOR')
    ));

-- 8. RLS Policies for Fact Reviews & Snapshots
CREATE POLICY reviews_select_policy ON fact_reviews
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = fact_reviews.case_id
          AND has_workspace_role(c.workspace_id, 'VIEWER')
    ));

CREATE POLICY reviews_insert_policy ON fact_reviews
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = fact_reviews.case_id
          AND has_workspace_role(c.workspace_id, 'REVIEWER')
    ));

CREATE POLICY snapshots_insert_policy ON review_snapshots
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = review_snapshots.case_id
          AND has_workspace_role(c.workspace_id, 'REVIEWER')
    ));

-- 9. RLS Policies for Cue Revisions
CREATE POLICY revisions_select_policy ON cue_revisions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = cue_revisions.case_id
          AND has_workspace_role(c.workspace_id, 'VIEWER')
    ));

CREATE POLICY revisions_insert_policy ON cue_revisions
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM cases c
        WHERE c.case_id = cue_revisions.case_id
          AND has_workspace_role(c.workspace_id, 'EDITOR')
    ));
