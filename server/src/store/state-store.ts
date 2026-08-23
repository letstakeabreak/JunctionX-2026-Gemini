import type { WorkspaceRole } from "../auth/jwt.js";
import type {
  CaseRecord,
  CellPatch,
  CueRevision,
  CueRowOperation,
  ExtractionRunRecord,
  FactCandidate,
  FactReviewCommand,
  InternalReviewSnapshot,
  InternalSourceVersion,
  Operation,
  Origin,
  ProductionAgentRole,
  ProductionArtifact,
  ReviewRecord,
  ReviewSnapshot,
  ScriptProjection,
  SourceRole,
  SourceVersion,
  WorkspaceSnapshot,
} from "../domain/types.js";

export type WorkspaceMemberRecord = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
};

/**
 * P1-A / P1-B StateStore Interface
 * 
 * InMemoryStore 및 차세대 PostgreSQL Store가 공통으로 구현하는
 * 도메인 상태 저장소 인터페이스입니다.
 */
export interface StateStore {
  // 1. Case & Workspace Lifecycle
  createCase(title: string, ownerId?: string, workspaceId?: string): { case_id: string; title: string; created_at: string };
  getCase(caseId: string): CaseRecord;
  hasCase(caseId: string): boolean;
  assertCaseAccess(caseId: string, actorId: string, requiredRole?: WorkspaceRole): void;

  // 2. Multi-Tenancy & Workspace Members (P1-B)
  addWorkspaceMember(input: { workspaceId: string; userId: string; role: WorkspaceRole; actorId: string }): WorkspaceMemberRecord;
  getWorkspaceMembers(workspaceId: string, actorId: string): WorkspaceMemberRecord[];
  getWorkspaceRole(workspaceId: string, userId: string): WorkspaceRole | null;

  // 3. Source Ingestion
  uploadSource(input: {
    caseId: string;
    role: SourceRole;
    origin: Origin;
    content: unknown;
    mediaType: string | null;
    originalFilename: string | null;
  }): SourceVersion;

  // 4. Extraction & Operation Lifecycle
  startExtraction(caseId: string, adapter?: any): Operation;
  getOperation(operationId: string): Operation;

  // 5. Review & Snapshot
  getReviewQueue(caseId: string): { items: FactCandidate[]; next_cursor: null };
  reviewFacts(input: { caseId: string; actorId: string; reviews: FactReviewCommand[] }): { items: ReviewRecord[] };
  createReviewSnapshot(caseId: string, actorId: string): ReviewSnapshot;

  // 6. Workspace & Projection
  getWorkspace(caseId: string): WorkspaceSnapshot;
  getCaseScriptProjection(caseId: string): ScriptProjection;

  // 7. Cue Revisions & Edits
  createRevision(input: {
    caseId: string;
    actorId: string;
    baseRevisionId: string;
    baseSourceSha256: string;
    patches: CellPatch[];
    rowOperations?: CueRowOperation[];
  }): CueRevision;
  listCueRevisions(caseId: string): CueRevision[];
}
