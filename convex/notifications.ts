import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const PUSHOVER_ENDPOINT = "https://api.pushover.net/1/messages.json";

type OrderDetails = {
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  notes: string;
  items: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
    selectedAddOns: Array<{ name: string; price: number }>;
  }>;
  subtotal: number;
  discount: number;
  couponCode?: string;
  tip: number;
  total: number;
  pickupTiming?: "asap" | "scheduled";
  scheduledFor?: string;
  pickupLocationName?: string;
  pickupAddress?: string;
};
type NotificationResult = { sent: boolean; reason?: string };

// The payment webhook, complimentary checkout, and admin paid transition all
// schedule sendOrder. Unpaid carts never become phone notifications.
export const getOrderDetails = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<OrderDetails | null> => {
    const order = await ctx.db.get(orderId);
    if (!order || !order.paid) return null;
    return {
      orderNumber: order.orderNumber, customerName: order.customerName,
      phone: order.phone, email: order.email, notes: order.notes,
      items: order.items, subtotal: order.subtotal,
      discount: order.discount || 0, couponCode: order.couponCode,
      tip: order.tip || 0, total: order.total,
      pickupTiming: order.pickupTiming, scheduledFor: order.scheduledFor,
      pickupLocationName: order.pickupLocationName, pickupAddress: order.pickupAddress,
    };
  },
});

export function formatOrderNotification(order: OrderDetails) {
  const complimentary = order.total === 0;
  const isDemo = complimentary && order.items.some((item) => /\bdemo\b|training only/i.test(item.name));
  const kind = isDemo ? "Demo Order" : complimentary ? "Complimentary Order" : "Paid Order";
  const scheduledDate = order.scheduledFor ? new Date(order.scheduledFor) : null;
  const pickup = order.pickupTiming === "scheduled" && scheduledDate && Number.isFinite(scheduledDate.getTime())
    ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(scheduledDate)
    : "ASAP";
  // Put payment, pickup and customer details first so they survive long carts.
  const lines = [
    isDemo ? "DEMO / TRAINING — no payment collected" : complimentary ? "Complimentary — no payment required" : `Paid: ${money(order.total)}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Pickup: ${pickup}`,
    order.pickupLocationName ? `Location: ${order.pickupLocationName}` : null,
    order.pickupAddress || null,
    order.notes ? `Notes: ${order.notes}` : null,
    "",
    ...order.items.flatMap((item) => [
      `${item.quantity}x ${item.name} — ${money(item.unitPrice * item.quantity)}`,
      ...(item.selectedAddOns || []).map((option) => `  + ${option.name}${option.price ? ` (${money(option.price)})` : ""}`),
    ]),
    "",
    `Subtotal: ${money(order.subtotal)}`,
    order.discount ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -${money(order.discount)}` : null,
    order.tip ? `Tip: ${money(order.tip)}` : null,
    `Total: ${money(order.total)}`,
    order.email ? `Email: ${order.email}` : null,
  ];
  return {
    title: truncate(`Lunch Box ${kind} ${order.orderNumber}`, 250),
    message: truncate(lines.filter((line) => line !== null).join("\n"), 1024),
  };
}

export const sendOrder = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<NotificationResult> => {
    const order: OrderDetails | null = await ctx.runQuery(internal.notifications.getOrderDetails, { orderId });
    if (!order) return { sent: false, reason: "order-unavailable" };
    const { title, message } = formatOrderNotification(order);
    return sendPushover(title, message);
  },
});

// Does not expose credential values and does not send a phone notification.
export const configurationStatus = internalAction({
  args: {},
  handler: async () => ({
    apiTokenConfigured: Boolean(process.env.PUSHOVER_API_TOKEN?.trim()),
    userKeyConfigured: Boolean(process.env.PUSHOVER_USER_KEY?.trim()),
    deviceConfigured: Boolean(process.env.PUSHOVER_DEVICE?.trim()),
  }),
});

export const sendTest = internalAction({
  args: {},
  handler: async () => sendPushover(
    "Lunch Box Order Notifications — TEST",
    "Test notification from Lunch Box. Paid orders and complimentary demo orders use this Pushover destination. This is not a customer order.",
  ),
});

async function sendPushover(title: string, message: string): Promise<NotificationResult> {
  const token = process.env.PUSHOVER_API_TOKEN?.trim();
  const user = process.env.PUSHOVER_USER_KEY?.trim();
  const device = process.env.PUSHOVER_DEVICE?.trim();
  if (!token || !user) return { sent: false, reason: "not-configured" };
  try {
    const response = await fetch(PUSHOVER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, user, title, message, priority: "0", ...(device ? { device } : {}) }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.status !== 1) {
      // Never log credentials, customer information, or the raw provider body.
      const reason = !response.ok ? `http-${response.status}` : "provider-rejected";
      console.error(`Pushover notification failed: ${reason}.`);
      return { sent: false, reason };
    }
    return { sent: true };
  } catch {
    console.error("Pushover notification request failed.");
    return { sent: false, reason: "request-failed" };
  }
}

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function truncate(value: string, limit: number) {
  const characters = Array.from(value);
  return characters.length <= limit ? value : `${characters.slice(0, limit - 1).join("")}…`;
}
