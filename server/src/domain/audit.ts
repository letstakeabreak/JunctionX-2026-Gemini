import { sha256 } from "../lib/hash.js";

export type AuditEventType =
  | "WORKSPACE_CREATED"
  | "MEMBER_ADDED"
  | "CASE_CREATED"
  | "SOURCE_UPLOADED"
  | "SOURCE_PURGED"
  | "EXTRACTION_STARTED"
  | "EXTRACTION_COMPLETED"
  | "FACT_REVIEWED"
  | "SNAPSHOT_FROZEN"
  | "REVISION_SAVED"
  | "REVISION_RESTORED"
  | "REVISION_EXPORTED"
  | "PERMISSION_DENIED"
  | "AUTH_FAILURE";

export type AuditEvent = {
  event_id: string;
  workspace_id: string | null;
  actor_id: string;
  event_type: AuditEventType;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const SENSITIVE_KEYS = new Set([
  "quote",
  "text",
  "content",
  "body",
  "token",
  "password",
  "secret",
  "authorization",
  "bearer",
  "signed_url",
  "url",
  "source_text",
  "dialogue",
]);

/**
 * Redacts sensitive plaintext content into cryptographic SHA-256 digests.
 */
export function sanitizeAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      if (typeof value === "string" && value.length > 0) {
        sanitized[key] = `[REDACTED_SHA256:${sha256(value).slice(0, 16)}]`;
      } else {
        sanitized[key] = "[REDACTED]";
      }
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export class AuditLogger {
  private readonly events: AuditEvent[] = [];
  private sequence = 0;

  log(input: {
    workspaceId?: string | null;
    actorId: string;
    eventType: AuditEventType;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  }): AuditEvent {
    this.sequence += 1;
    const event: AuditEvent = {
      event_id: `audit_${this.sequence.toString().padStart(6, "0")}`,
      workspace_id: input.workspaceId ?? null,
      actor_id: input.actorId,
      event_type: input.eventType,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      metadata: sanitizeAuditMetadata(input.metadata ?? {}),
      created_at: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  getEventsByWorkspace(workspaceId: string): AuditEvent[] {
    return this.events
      .filter((e) => e.workspace_id === workspaceId)
      .map((e) => structuredClone(e));
  }

  getAllEvents(): AuditEvent[] {
    return this.events.map((e) => structuredClone(e));
  }
}
