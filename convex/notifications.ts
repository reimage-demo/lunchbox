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
};

type NotificationResult = { sent: boolean; reason?: string };

export const getOrderDetails = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<OrderDetails | null> => {
    const order = await ctx.db.get(orderId);
    if (!order || !order.paid) return null;

    return {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      phone: order.phone,
      email: order.email,
      notes: order.notes,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      couponCode: order.couponCode,
      tip: order.tip || 0,
      total: order.total,
    };
  },
});

export const sendOrder = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<NotificationResult> => {
    const order: OrderDetails | null = await ctx.runQuery(internal.notifications.getOrderDetails, {
      orderId,
    });
    if (!order) {
      console.warn(`Pushover notification skipped for unavailable order ${orderId}.`);
      return { sent: false, reason: "order-unavailable" };
    }

    const itemLines = order.items.flatMap((item) => [
      `${item.quantity}x ${item.name} — ${money(item.unitPrice * item.quantity)}`,
      ...item.selectedAddOns.map(
        (addOn) => `  + ${addOn.name}${addOn.price ? ` (${money(addOn.price)})` : ""}`,
      ),
    ]);
    const message = [
      `Customer: ${order.customerName}`,
      `Phone: ${order.phone}`,
      order.email ? `Email: ${order.email}` : null,
      "",
      ...itemLines,
      "",
      `Subtotal: ${money(order.subtotal)}`,
      order.discount
        ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -${money(order.discount)}`
        : null,
      order.tip ? `Tip: ${money(order.tip)}` : null,
      `Total: ${money(order.total)}`,
      order.notes ? `Notes: ${order.notes}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    return await sendPushover(
      `New Lunch Box Order ${order.orderNumber}`,
      truncate(message, 1024),
      `order ${order.orderNumber}`,
    );
  },
});

export const sendTest = internalAction({
  args: {},
  handler: async () =>
    await sendPushover(
      "Lunch Box Order Notifications",
      "Test successful. New paid orders will be sent to this device.",
      "test notification",
    ),
});

async function sendPushover(
  title: string,
  message: string,
  label: string,
): Promise<NotificationResult> {
  const token = process.env.PUSHOVER_API_TOKEN;
  const user = process.env.PUSHOVER_USER_KEY;

  if (!token || !user) {
    console.warn(
      "Pushover notification skipped: missing PUSHOVER_API_TOKEN or PUSHOVER_USER_KEY.",
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const response = await fetch(PUSHOVER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token,
        user,
        title,
        message,
        priority: "0",
      }),
    });
    const responseBody = await response.text();
    if (!response.ok) {
      console.error(
        `Pushover notification failed for ${label} with ${response.status}: ${responseBody}`,
      );
      return { sent: false, reason: `http-${response.status}` };
    }

    console.log(`Pushover notification accepted for ${label}.`);
    return { sent: true };
  } catch (error) {
    console.error(`Pushover notification request failed for ${label}: ${error}`);
    return { sent: false, reason: "request-failed" };
  }
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
