import { adminSessionExpired } from "./sessionPolicy.js"

export {
  ADMIN_ABSOLUTE_TIMEOUT_MS,
  ADMIN_IDLE_TIMEOUT_MS,
  adminSessionExpired,
} from "./sessionPolicy.js"

export async function requireAdmin(ctx: any, token: string) {
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique()
  if (!session || adminSessionExpired(session)) throw new Error("UNAUTHORIZED")
  return session
}
