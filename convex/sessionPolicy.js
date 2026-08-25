export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ADMIN_ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/**
 * @param {{ createdAt: number, expiresAt: number, lastActivityAt?: number }} session
 * @param {number} now
 */
export function adminSessionExpired(session, now = Date.now()) {
  const lastActivityAt = session.lastActivityAt ?? session.createdAt;
  return (
    session.expiresAt <= now ||
    lastActivityAt + ADMIN_IDLE_TIMEOUT_MS <= now
  );
}
