import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "./auth";

const status = v.union(
  v.literal("received"),
  v.literal("in-progress"),
  v.literal("ready"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("refunded"),
);
const activeStatuses = [
  "received",
  "in-progress",
  "ready",
] as const;

const BOARD_RETENTION_MS = 12 * 60 * 60 * 1000;

export const activeBoard = query({
  args: {},
  handler: async (ctx) => {
    const boardCutoff = Date.now() - BOARD_RETENTION_MS;
    const groups = await Promise.all(
      activeStatuses.map((currentStatus) =>
        ctx.db
          .query("orders")
          .withIndex("by_archived_paid_status_created_at", (q) =>
            q
              .eq("archivedAt", undefined)
              .eq("paid", true)
              .eq("status", currentStatus)
              .gte("createdAt", boardCutoff),
          )
          .order("desc")
          .take(50),
      ),
    );
    return groups
      .flat()
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 100)
      .map((row) => ({
        _id: row._id,
        orderNumber: row.orderNumber,
        displayName: row.customerName.split(/\s+/)[0],
        status:
          row.status === "received"
            ? "in-progress"
            : row.status,
        itemSummary: row.items
          .map((item) => `${item.quantity}× ${item.name}`)
          .join(", "),
        createdAt: row.createdAt,
      }));
  },
});
export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_archived_paid_created_at", (q) =>
        q.eq("archivedAt", undefined).eq("paid", true),
      )
      .order("desc")
      .take(200);
    return orders.map((order) => ({
      ...order,
      status: order.status === "received" ? ("in-progress" as const) : order.status,
    }));
  },
});
export const adminPage = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { sessionToken, paginationOpts }) => {
    await requireAdmin(ctx, sessionToken);
    const result = await ctx.db
      .query("orders")
      .withIndex("by_archived_paid_created_at", (q) =>
        q.eq("archivedAt", undefined).eq("paid", true),
      )
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map((order) => ({
        ...order,
        status:
          order.status === "received" ? ("in-progress" as const) : order.status,
      })),
    };
  },
});
export const updateStatus = mutation({
  args: { sessionToken: v.string(), id: v.id("orders"), status },
  handler: async (ctx, { sessionToken, id, status }) => {
    await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(id);
    if (!order) throw new Error("Order not found.");
    const now = Date.now();
    await ctx.db.patch(id, {
      status: order.paid && status === "received" ? "in-progress" : status,
      pickedUpAt: status === "completed" ? now : undefined,
      updatedAt: now,
    });
  },
});
export const updatePaid = mutation({
  args: { sessionToken: v.string(), id: v.id("orders"), paid: v.boolean() },
  handler: async (ctx, { sessionToken, id, paid }) => {
    await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(id);
    if (!order) throw new Error("Order not found.");
    const now = Date.now();
    await ctx.db.patch(id, {
      paid,
      ...(paid && order.status === "received"
        ? { status: "in-progress" as const }
        : {}),
      paymentUpdatedAt: now,
      updatedAt: now,
    });
    if (paid && !order.paid)
      await ctx.scheduler.runAfter(0, internal.notifications.sendOrder, {
        orderId: id,
      });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("orders") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const order = await ctx.db.get(id);
    if (!order) return { deleted: false };
    await ctx.db.delete(id);
    return { deleted: true };
  },
});

export const removeMany = mutation({
  args: {
    sessionToken: v.string(),
    ids: v.array(v.id("orders")),
  },
  handler: async (ctx, { sessionToken, ids }) => {
    await requireAdmin(ctx, sessionToken);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > 200)
      throw new Error("You can delete up to 200 orders at a time.");
    const existing = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
    const foundIds = uniqueIds.filter((_, index) => existing[index]);
    await Promise.all(foundIds.map((id) => ctx.db.delete(id)));
    return { deleted: foundIds.length };
  },
});

export const clearFinished = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const finishedStatuses = new Set(["completed", "cancelled", "refunded"]);
    const orders = await ctx.db.query("orders").collect();
    const finished = orders.filter((order) =>
      !order.archivedAt && finishedStatuses.has(order.status),
    );
    const now = Date.now();
    await Promise.all(
      finished.map((order) =>
        ctx.db.patch(order._id, { archivedAt: now, updatedAt: now }),
      ),
    );
    return { cleared: finished.length };
  },
});
