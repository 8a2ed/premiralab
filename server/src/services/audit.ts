import { db, now } from '../db.js';
import type { AuthRequest } from '../types.js';

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'currentPassword', 'newPassword', 'token']);

/** Strip sensitive keys from metadata before storing in the audit log */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!SENSITIVE_KEYS.has(k)) result[k] = v;
  }
  return result;
}

export function audit(
  req: AuthRequest,
  action: string,
  entity: string,
  entityId: number | null,
  metadata: Record<string, unknown> = {},
): void {
  try {
    db.prepare(
      'INSERT INTO activity_log(user_id,action,entity,entity_id,metadata,created_at) VALUES(?,?,?,?,?,?)',
    ).run(
      req.user?.id ?? null,
      action,
      entity,
      entityId,
      JSON.stringify(sanitize(metadata)),
      now(),
    );
  } catch {
    // Non-critical — never let audit failure break the main request
  }
}
