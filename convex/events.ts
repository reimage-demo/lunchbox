import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { paginationOptsValidator } from "convex/server";

async function withImage(ctx: any, event: any) {
  return {
    ...event,
    imageUrl: event.imageStorageId
      ? await ctx.storage.getUrl(event.imageStorageId)
      : event.imageUrl,
  };
}
const fields = {
  title: v.string(),
  date: v.string(),
  startTime: v.string(),
  endTime: v.optional(v.string()),
  description: v.string(),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  isPublished: v.boolean(),
};

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await ctx.db
      .query("events")
      .withIndex("by_published_date", (q) =>
        q.eq("isPublished", true).gte("date", today),
      )
      .collect();
    return Promise.all(rows.map((row) => withImage(ctx, row)));
  },
});
export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const rows = await ctx.db
      .query("events")
      .withIndex("by_date")
      .order("desc")
      .collect();
    return Promise.all(rows.map((row) => withImage(ctx, row)));
  },
});
export const adminPage = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { sessionToken, paginationOpts }) => {
    await requireAdmin(ctx, sessionToken);
    const result = await ctx.db
      .query("events")
      .withIndex("by_date")
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(result.page.map((row) => withImage(ctx, row))),
    };
  },
});
export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return ctx.storage.generateUploadUrl();
  },
});
export const create = mutation({
  args: { sessionToken: v.string(), ...fields },
  handler: async (ctx, { sessionToken, ...event }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    return ctx.db.insert("events", {
      ...event,
      title: event.title.trim(),
      description: event.description.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("events"),
    removeImage: v.optional(v.boolean()),
    ...fields,
  },
  handler: async (ctx, { sessionToken, id, removeImage, ...event }) => {
    await requireAdmin(ctx, sessionToken);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Event not found.");
    const replacing = Boolean(
      event.imageStorageId && event.imageStorageId !== existing.imageStorageId,
    );
    if (existing.imageStorageId && (replacing || removeImage))
      await ctx.storage.delete(existing.imageStorageId);
    await ctx.db.patch(id, {
      ...event,
      ...(event.imageStorageId ? { imageUrl: undefined } : {}),
      ...(removeImage
        ? { imageUrl: undefined, imageStorageId: undefined }
        : {}),
      title: event.title.trim(),
      description: event.description.trim(),
      updatedAt: Date.now(),
    });
  },
});
export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("events") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const event = await ctx.db.get(id);
    if (event?.imageStorageId) await ctx.storage.delete(event.imageStorageId);
    await ctx.db.delete(id);
  },
});
