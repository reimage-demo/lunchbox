import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const hartfordDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(timestamp: number) {
  const parts = Object.fromEntries(
    hartfordDate
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const overview = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const today = dateKey(Date.now());
    const [
      menu,
      publishedEvents,
      received,
      inProgress,
      ready,
      paidOrders,
    ] =
      await Promise.all([
        ctx.db.query("menuItems").collect(),
        ctx.db
          .query("events")
          .withIndex("by_published_date", (q) =>
            q.eq("isPublished", true).gte("date", today),
          )
          .collect(),
        ctx.db
          .query("orders")
          .withIndex("by_paid_status_created_at", (q) =>
            q.eq("paid", true).eq("status", "received"),
          )
          .collect(),
        ctx.db
          .query("orders")
          .withIndex("by_paid_status_created_at", (q) =>
            q.eq("paid", true).eq("status", "in-progress"),
          )
          .collect(),
        ctx.db
          .query("orders")
          .withIndex("by_paid_status_created_at", (q) =>
            q.eq("paid", true).eq("status", "ready"),
          )
          .collect(),
        ctx.db
          .query("orders")
          .withIndex("by_paid_created_at", (q) => q.eq("paid", true))
          .order("desc")
          .collect(),
      ]);

    // Cancelled and refunded orders are excluded so the dashboard reflects
    // recognized revenue instead of every payment ever approved.
    const revenueOrders = paidOrders.filter(
      (order) => !["cancelled", "refunded"].includes(order.status),
    );
    const totalRevenue = revenueOrders.reduce(
      (sum, order) => sum + order.total,
      0,
    );
    const todayOrders = revenueOrders.filter(
      (order) =>
        dateKey(order.paymentUpdatedAt || order.createdAt) === today,
    );

    return {
      activeCount: received.length + inProgress.length,
      readyCount: ready.filter((order) => !order.archivedAt).length,
      menuCount: menu.length,
      unavailableMenuCount: menu.filter((item) => !item.isAvailable).length,
      publishedEventCount: publishedEvents.length,
      todayRevenue: todayOrders.reduce((sum, order) => sum + order.total, 0),
      totalRevenue,
      paidOrderCount: revenueOrders.length,
      newestOrders: paidOrders
        .filter((order) => !order.archivedAt)
        .slice(0, 5)
        .map((order) => ({
          ...order,
          status:
            order.status === "received"
              ? ("in-progress" as const)
              : order.status,
        })),
    };
  },
});
