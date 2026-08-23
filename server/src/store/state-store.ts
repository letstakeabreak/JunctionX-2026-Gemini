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

/**
 * P1-A StateStore Interface
 * 
 * InMemoryStore 및 차세대 PostgreSQL Store가 공통으로 구현하는
 * 도메인 상태 저장소 인터페이스입니다.
 */
export interface StateStore {
  // 1. Case Lifecycle
  createCase(title: string): CaseRecord;
  getCase(caseId: string): CaseRecord;
  hasCase(caseId: string): boolean;

  // 2. Source Ingestion
  uploadSource(input: {
    caseId: string;
    role: SourceRole;
    origin: Origin;
    content: unknown;
    mediaType: string | null;
    originalFilename: string | null;
  }): SourceVersion;

  uploadFileSource(input: {
    caseId: string;
    role: "SCRIPT" | "MASTER_CUE";
    origin: Origin;
    bytes: Uint8Array;
    mediaType: string;
    originalFilename: string;
  }): Promise<SourceVersion>;

  refreshSource(input: {
    caseId: string;
    role: SourceRole;
    origin: Origin;
    content: unknown;
    mediaType: string | null;
    originalFilename: string | null;
  }): SourceVersion;

  refreshFileSource(input: {
    caseId: string;
    role: "SCRIPT" | "MASTER_CUE";
    origin: Origin;
    bytes: Uint8Array;
    mediaType: string;
    originalFilename: string;
  }): Promise<SourceVersion>;

  // 3. Extraction & Operation Lifecycle
  startExtraction(caseId: string): Operation;
  getOperation(operationId: string): Operation;
  getExtractionRun(caseId: string): ExtractionRunRecord;

  // 4. Review & Snapshot
  getReviewQueue(caseId: string): {
    case_id: string;
    facts: FactCandidate[];
    reviews: ReviewRecord[];
  };
  reviewFacts(caseId: string, commands: FactReviewCommand[]): ReviewRecord[];
  freezeReviewSnapshot(caseId: string): ReviewSnapshot;
  getLatestSnapshot(caseId: string): InternalReviewSnapshot | null;

  // 5. Workspace & Projection
  getWorkspace(caseId: string): WorkspaceSnapshot;
  getScriptProjection(caseId: string): ScriptProjection | null;

  // 6. Cue Revisions & Edits
  saveCueRevision(input: {
    caseId: string;
    parentRevisionId: string;
    patches?: CellPatch[];
    operations?: CueRowOperation[];
    createdBy: string;
  }): CueRevision;
  getRevision(caseId: string, revisionId: string): CueRevision;
  restoreRevision(caseId: string, revisionId: string): CueRevision;

  // 7. Exports
  exportCueRevision(caseId: string, revisionId: string): Promise<{ bytes: Uint8Array; filename: string }>;
  exportStandardCueDocx(caseId: string, revisionId: string): Promise<{ bytes: Uint8Array; filename: string }>;
  exportStandardCuePrintHtml(caseId: string, revisionId: string): string;

  // 8. Production Artifacts (Agents)
  getProductionArtifact(caseId: string, role: ProductionAgentRole): ProductionArtifact | null;
}
