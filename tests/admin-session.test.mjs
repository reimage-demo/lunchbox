import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_ABSOLUTE_TIMEOUT_MS,
  ADMIN_IDLE_TIMEOUT_MS,
  adminSessionExpired,
} from "../convex/sessionPolicy.js";

const createdAt = 1_000_000;

test("a newly created admin session is valid", () => {
  const session = {
    createdAt,
    lastActivityAt: createdAt,
    expiresAt: createdAt + ADMIN_ABSOLUTE_TIMEOUT_MS,
  };
  assert.equal(adminSessionExpired(session, createdAt), false);
});

test("an idle admin session expires at 30 minutes", () => {
  const session = {
    createdAt,
    lastActivityAt: createdAt,
    expiresAt: createdAt + ADMIN_ABSOLUTE_TIMEOUT_MS,
  };
  assert.equal(
    adminSessionExpired(session, createdAt + ADMIN_IDLE_TIMEOUT_MS - 1),
    false,
  );
  assert.equal(
    adminSessionExpired(session, createdAt + ADMIN_IDLE_TIMEOUT_MS),
    true,
  );
});

test("authenticated activity refreshes only the idle deadline", () => {
  const activityAt = createdAt + 20 * 60 * 1000;
  const session = {
    createdAt,
    lastActivityAt: activityAt,
    expiresAt: createdAt + ADMIN_ABSOLUTE_TIMEOUT_MS,
  };
  assert.equal(
    adminSessionExpired(session, activityAt + ADMIN_IDLE_TIMEOUT_MS - 1),
    false,
  );
  assert.equal(
    adminSessionExpired(session, activityAt + ADMIN_IDLE_TIMEOUT_MS),
    true,
  );
});

test("the 12-hour absolute lifetime cannot be extended", () => {
  const expiresAt = createdAt + ADMIN_ABSOLUTE_TIMEOUT_MS;
  const session = {
    createdAt,
    lastActivityAt: expiresAt - 1,
    expiresAt,
  };
  assert.equal(adminSessionExpired(session, expiresAt - 1), false);
  assert.equal(adminSessionExpired(session, expiresAt), true);
});

test("legacy sessions use creation time as their idle baseline", () => {
  const session = {
    createdAt,
    expiresAt: createdAt + ADMIN_ABSOLUTE_TIMEOUT_MS,
  };
  assert.equal(
    adminSessionExpired(session, createdAt + ADMIN_IDLE_TIMEOUT_MS),
    true,
  );
});
