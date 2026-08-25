import { internalMutation, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  ADMIN_ABSOLUTE_TIMEOUT_MS,
  ADMIN_IDLE_TIMEOUT_MS,
  adminSessionExpired,
  requireAdmin,
} from './auth'

const PBKDF2_ITERATIONS = 310_000
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_SECURITY_KEY = 'admin-login'

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new Error('Admin credentials are not configured correctly in Convex.')
  return Uint8Array.from(value.match(/.{2}/g)!, byte => Number.parseInt(byte, 16))
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string, pepper: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(`${password}\u0000${pepper}`), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256
  )
  return bytesToHex(bits)
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username, password }) => {
    const expectedUsername = process.env.ADMIN_USERNAME
    const passwordSalt = process.env.ADMIN_PASSWORD_SALT
    const passwordHash = process.env.ADMIN_PASSWORD_HASH
    const passwordPepper = process.env.ADMIN_PASSWORD_PEPPER
    if (!expectedUsername || !passwordSalt || !passwordHash || !passwordPepper) throw new Error('Admin credentials are not configured in Convex.')
    const security = await ctx.db.query('adminLoginSecurity').withIndex('by_key', q => q.eq('key', LOGIN_SECURITY_KEY)).unique()
    if (security?.locked) return { ok: false as const, reason: 'ACCOUNT_LOCKED' as const, attemptsRemaining: 0 }

    const submittedHash = await hashPassword(password, passwordSalt, passwordPepper)
    const now = Date.now()
    if (username !== expectedUsername || !constantTimeEqual(submittedHash, passwordHash)) {
      const failedAttempts = (security?.failedAttempts ?? 0) + 1
      const locked = failedAttempts >= MAX_LOGIN_ATTEMPTS
      const values = { failedAttempts, locked, ...(locked ? { lockedAt: now } : {}), updatedAt: now }
      if (security) await ctx.db.patch(security._id, values)
      else await ctx.db.insert('adminLoginSecurity', { key: LOGIN_SECURITY_KEY, ...values })
      return {
        ok: false as const,
        reason: locked ? 'ACCOUNT_LOCKED' as const : 'INVALID_CREDENTIALS' as const,
        attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts)
      }
    }

    if (security) await ctx.db.delete(security._id)
    const token = `${now.toString(36)}-${crypto.randomUUID()}`
    const expiresAt = now + ADMIN_ABSOLUTE_TIMEOUT_MS
    await ctx.db.insert('adminSessions', {
      token,
      username,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
    })
    return {
      ok: true as const,
      token,
      username,
      expiresAt,
      idleExpiresAt: now + ADMIN_IDLE_TIMEOUT_MS,
    }
  }
})

// Backend-only by design. Run this manually with the Convex CLI or dashboard;
// browsers cannot call internal functions.
export const unlock = internalMutation({
  args: {},
  handler: async ctx => {
    const security = await ctx.db.query('adminLoginSecurity').withIndex('by_key', q => q.eq('key', LOGIN_SECURITY_KEY)).unique()
    if (security) await ctx.db.delete(security._id)
    return { unlocked: Boolean(security) }
  }
})

export const validate = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await requireAdmin(ctx, sessionToken)
    const lastActivityAt = session.lastActivityAt ?? session.createdAt
    return {
      username: session.username,
      expiresAt: session.expiresAt,
      idleExpiresAt: lastActivityAt + ADMIN_IDLE_TIMEOUT_MS,
    }
  },
})

export const checkSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('adminSessions')
      .withIndex('by_token', q => q.eq('token', sessionToken))
      .unique()
    const now = Date.now()
    if (!session) return { valid: false as const }
    if (adminSessionExpired(session, now)) {
      await ctx.db.delete(session._id)
      return { valid: false as const }
    }
    const lastActivityAt = session.lastActivityAt ?? session.createdAt
    return {
      valid: true as const,
      username: session.username,
      expiresAt: session.expiresAt,
      lastActivityAt,
      idleExpiresAt: lastActivityAt + ADMIN_IDLE_TIMEOUT_MS,
    }
  },
})

export const touchSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('adminSessions')
      .withIndex('by_token', q => q.eq('token', sessionToken))
      .unique()
    const now = Date.now()
    if (!session) return { valid: false as const }
    if (adminSessionExpired(session, now)) {
      await ctx.db.delete(session._id)
      return { valid: false as const }
    }
    await ctx.db.patch(session._id, { lastActivityAt: now })
    return {
      valid: true as const,
      expiresAt: session.expiresAt,
      idleExpiresAt: now + ADMIN_IDLE_TIMEOUT_MS,
    }
  },
})

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('adminSessions')
      .withIndex('by_token', q => q.eq('token', sessionToken))
      .unique()
    if (session) await ctx.db.delete(session._id)
    return { invalidated: Boolean(session) }
  },
})
