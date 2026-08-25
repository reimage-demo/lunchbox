import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { publicCheckoutRedirect, SQUARE_API_VERSION } from "./squareShared.js";

const cartItem = v.object({
  menuItemId: v.id("menuItems"),
  quantity: v.number(),
  selectedOptions: v.array(
    v.object({
      groupId: v.id("optionGroups"),
      optionId: v.string(),
    }),
  ),
});

const checkoutArgs = {
  clientRequestId: v.string(),
  customerName: v.string(),
  phone: v.string(),
  email: v.string(),
  notes: v.string(),
  items: v.array(cartItem),
  couponCode: v.optional(v.string()),
  tip: v.number(),
  fulfillmentType: v.literal("pickup"),
  pickupTiming: v.union(v.literal("asap"), v.literal("scheduled")),
  scheduledFor: v.optional(v.string()),
};

type PreparedCheckout = {
  orderId: any;
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  total: number;
  paid: boolean;
  idempotencyKey: string;
};

type SquarePaymentLinkResponse = {
  payment_link?: {
    id?: string;
    order_id?: string;
    url?: string;
  };
  errors?: Array<{ code?: string; detail?: string }>;
};

export const createCheckout = action({
  args: checkoutArgs,
  handler: async (ctx, args): Promise<{ url: string; orderNumber: string }> => {
    const accessToken = requiredEnv("SQUARE_ACCESS_TOKEN");
    const locationId = requiredEnv("SQUARE_LOCATION_ID");
    const publicSiteUrl = requiredEnv("PUBLIC_SITE_URL");
    const prepared: PreparedCheckout = await ctx.runMutation(
      internal.square.prepareCheckout,
      args,
    );

    if (prepared.paid) {
      return {
        url: publicCheckoutRedirect(
          publicSiteUrl,
          prepared.total === 0 ? "complimentary" : "success",
          prepared.orderNumber,
        ),
        orderNumber: prepared.orderNumber,
      };
    }

    const redirectUrl = publicCheckoutRedirect(
      publicSiteUrl,
      "success",
      prepared.orderNumber,
    );
    const apiBaseUrl = (
      process.env.SQUARE_API_BASE_URL || "https://connect.squareup.com"
    ).replace(/\/$/, "");
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/v2/online-checkout/payment-links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_API_VERSION,
        },
        body: JSON.stringify({
          idempotency_key: prepared.idempotencyKey,
          description: `Lunch Box website order ${prepared.orderNumber}`,
          quick_pay: {
            name: `Lunch Box order ${prepared.orderNumber}`,
            price_money: { amount: prepared.total, currency: "USD" },
            location_id: locationId,
          },
          checkout_options: {
            allow_tipping: false,
            ask_for_shipping_address: false,
            redirect_url: redirectUrl,
          },
          pre_populated_data: {
            buyer_email: prepared.email,
            buyer_phone_number: prepared.phone,
          },
          payment_note: `Lunch Box website order ${prepared.orderNumber}`,
        }),
      });
    } catch (error) {
      await recordCheckoutError(ctx, prepared.orderId, "Square was unreachable.");
      console.error("Square CreatePaymentLink network failure", error);
      throw new Error("Secure checkout is temporarily unavailable. Please try again.");
    }

    const result = (await response.json().catch(() => ({}))) as SquarePaymentLinkResponse;
    const paymentLink = result.payment_link;
    if (
      !response.ok ||
      !paymentLink?.id ||
      !paymentLink.order_id ||
      !isSquareCheckoutUrl(paymentLink.url)
    ) {
      const safeError =
        result.errors?.map((error) => error.code).filter(Boolean).join(", ") ||
        `HTTP ${response.status}`;
      await recordCheckoutError(ctx, prepared.orderId, "Square rejected checkout creation.");
      console.error(`Square CreatePaymentLink failed: ${safeError}`);
      throw new Error("Secure checkout could not be started. Please try again.");
    }

    await ctx.runMutation(internal.square.finishCheckout, {
      orderId: prepared.orderId,
      squarePaymentLinkId: paymentLink.id,
      squareOrderId: paymentLink.order_id,
    });
    return { url: paymentLink.url, orderNumber: prepared.orderNumber };
  },
});

export const prepareCheckout = internalMutation({
  args: checkoutArgs,
  handler: async (ctx, args): Promise<PreparedCheckout> => {
    const clientRequestId = args.clientRequestId.trim();
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(clientRequestId))
      throw new Error("Invalid checkout request.");

    const existing = await ctx.db
      .query("orders")
      .withIndex("by_client_request_id", (q) =>
        q.eq("clientRequestId", clientRequestId),
      )
      .unique();
    if (existing) return preparedFromOrder(existing);

    const customerName = cleanText(args.customerName, 2, 100, "full name");
    const phone = cleanPhone(args.phone);
    const email = cleanEmail(args.email);
    const notes = cleanOptionalText(args.notes, 1000, "order notes");
    if (!args.items.length || args.items.length > 50)
      throw new Error("Your cart must contain between 1 and 50 items.");

    const trustedItems = [];
    let totalQuantity = 0;
    let subtotal = 0;
    for (const submitted of args.items) {
      if (!Number.isInteger(submitted.quantity) || submitted.quantity < 1 || submitted.quantity > 20)
        throw new Error("Item quantities must be between 1 and 20.");
      totalQuantity += submitted.quantity;
      if (totalQuantity > 100) throw new Error("This order contains too many items.");
      const item = await ctx.db.get(submitted.menuItemId);
      if (!item?.isAvailable) throw new Error("An item in your cart is no longer available.");
      if (!Number.isInteger(item.price) || item.price < 0 || item.price > 100_000)
        throw new Error("An item in your cart has an invalid price.");

      const attachedGroupIds = new Set((item.optionGroupIds || []).map(String));
      const selectionsByGroup = new Map<string, string[]>();
      for (const selection of submitted.selectedOptions) {
        const groupId = String(selection.groupId);
        if (!attachedGroupIds.has(groupId)) throw new Error("An option does not belong to this item.");
        const selections = selectionsByGroup.get(groupId) || [];
        if (selections.includes(selection.optionId)) throw new Error("An option was selected more than once.");
        selections.push(selection.optionId);
        selectionsByGroup.set(groupId, selections);
      }

      const selectedAddOns: Array<{ name: string; price: number }> = [];
      let optionTotal = 0;
      for (const groupId of item.optionGroupIds || []) {
        const group = await ctx.db.get(groupId);
        if (!group?.isAvailable) continue;
        const selections = selectionsByGroup.get(String(groupId)) || [];
        const maximum = group.selectionMode === "single" ? 1 : group.maxSelections;
        if (selections.length < group.minSelections || selections.length > maximum)
          throw new Error(`Please complete ${group.name}.`);
        for (const optionId of selections) {
          const option = group.options.find(
            (candidate) => candidate.id === optionId && candidate.isAvailable,
          );
          if (!option) throw new Error("A selected option is no longer available.");
          if (!Number.isInteger(option.price) || option.price < 0 || option.price > 100_000)
            throw new Error("A selected option has an invalid price.");
          optionTotal += option.price;
          selectedAddOns.push({ name: option.name, price: option.price });
        }
      }

      const unitPrice = item.price + optionTotal;
      subtotal += unitPrice * submitted.quantity;
      trustedItems.push({
        menuItemId: item._id,
        name: item.name,
        unitPrice,
        quantity: submitted.quantity,
        selectedAddOns,
      });
    }
    // Complimentary demo items use the same trusted cart validation and order
    // lifecycle, but skip Square when the final total is zero.
    if (!Number.isSafeInteger(subtotal) || subtotal < 0 || subtotal > 1_000_000)
      throw new Error("The order total is outside the supported range.");

    const couponCode = args.couponCode?.trim().toUpperCase();
    let discount = 0;
    if (couponCode) {
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", couponCode))
        .unique();
      if (!coupon?.isActive) throw new Error("That discount code is no longer valid.");
      const requested =
        coupon.discountType === "percentage"
          ? Math.floor((subtotal * coupon.amount) / 100)
          : coupon.amount;
      discount = Math.min(subtotal, Math.max(0, requested));
    }

    const tip = Math.round(args.tip);
    if (!Number.isFinite(tip) || tip < 0 || tip > Math.min(100_000, subtotal * 2))
      throw new Error("Enter a valid tip amount.");
    const total = subtotal - discount + tip;
    if (!Number.isSafeInteger(total) || total < 0 || total > 1_000_000)
      throw new Error("The order total is outside the supported range.");

    const location = await ctx.db
      .query("truckLocations")
      .withIndex("by_key", (q) => q.eq("key", "current"))
      .unique();
    const currentLocation =
      location && location.serviceDate >= newYorkDateKey(Date.now()) ? location : null;
    validatePickup(args, currentLocation);

    const now = Date.now();
    const orderNumber = `LB-${newYorkDateKey(now).replaceAll("-", "")}-${clientRequestId.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase()}`;
    const idempotencyKey = `lunchbox-${clientRequestId}`;
    const paid = total === 0;
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      customerName,
      phone,
      email,
      notes,
      items: trustedItems,
      subtotal,
      discount,
      ...(couponCode ? { couponCode } : {}),
      tip,
      total,
      status: paid ? "in-progress" : "received",
      paid,
      paymentStatus: paid ? "approved" : "checkout-creating",
      clientRequestId,
      checkoutIdempotencyKey: idempotencyKey,
      checkoutAttemptedAt: now,
      ...(paid ? { paymentUpdatedAt: now } : {}),
      ageConfirmed: true,
      fulfillmentType: "pickup",
      pickupTiming: args.pickupTiming,
      ...(args.pickupTiming === "scheduled" && args.scheduledFor
        ? { scheduledFor: args.scheduledFor }
        : {}),
      pickupLocationName: currentLocation?.locationName || "Lunch Box",
      pickupAddress:
        currentLocation?.address || "104 Baltimore St, Hartford, CT 06112",
      createdAt: now,
      updatedAt: now,
    });
    if (paid)
      await ctx.scheduler.runAfter(0, internal.notifications.sendOrder, { orderId });
    return {
      orderId,
      orderNumber,
      customerName,
      phone,
      email,
      total,
      paid,
      idempotencyKey,
    };
  },
});

export const finishCheckout = internalMutation({
  args: {
    orderId: v.id("orders"),
    squarePaymentLinkId: v.string(),
    squareOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || order.paid) return;
    await ctx.db.patch(args.orderId, {
      paymentStatus: "checkout-created",
      squarePaymentLinkId: args.squarePaymentLinkId,
      squareOrderId: args.squareOrderId,
      checkoutError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const failCheckout = internalMutation({
  args: { orderId: v.id("orders"), message: v.string() },
  handler: async (ctx, { orderId, message }) => {
    const order = await ctx.db.get(orderId);
    if (!order || order.paid) return;
    await ctx.db.patch(orderId, {
      paymentStatus: "checkout-error",
      checkoutError: message.slice(0, 200),
      updatedAt: Date.now(),
    });
  },
});

export const applyPaymentWebhook = internalMutation({
  args: {
    squareOrderId: v.string(),
    squarePaymentId: v.string(),
    locationId: v.string(),
    status: v.string(),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, payment) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_square_order_id", (q) =>
        q.eq("squareOrderId", payment.squareOrderId),
      )
      .unique();
    if (!order) return { matched: false, paid: false };

    const now = Date.now();
    if (payment.status === "COMPLETED") {
      const matches =
        payment.locationId === process.env.SQUARE_LOCATION_ID &&
        payment.currency === "USD" &&
        payment.amount === order.total;
      if (!matches) {
        await ctx.db.patch(order._id, {
          checkoutError: "Square payment details did not match this order.",
          paymentUpdatedAt: now,
          updatedAt: now,
        });
        return { matched: true, paid: false };
      }
      if (!order.paid) {
        await ctx.db.patch(order._id, {
          paid: true,
          status: "in-progress",
          paymentStatus: "approved",
          squarePaymentId: payment.squarePaymentId,
          checkoutError: undefined,
          paymentUpdatedAt: now,
          updatedAt: now,
        });
        await ctx.scheduler.runAfter(0, internal.notifications.sendOrder, {
          orderId: order._id,
        });
      }
      return { matched: true, paid: true };
    }

    if (["CANCELED", "FAILED"].includes(payment.status) && !order.paid) {
      await ctx.db.patch(order._id, {
        paymentStatus: "declined",
        squarePaymentId: payment.squarePaymentId,
        paymentUpdatedAt: now,
        updatedAt: now,
      });
    }
    return { matched: true, paid: order.paid };
  },
});

function preparedFromOrder(order: any): PreparedCheckout {
  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    total: order.total,
    paid: order.paid,
    idempotencyKey:
      order.checkoutIdempotencyKey || `lunchbox-${order.clientRequestId}`,
  };
}

function cleanText(value: string, minimum: number, maximum: number, label: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < minimum || cleaned.length > maximum)
    throw new Error(`Enter a valid ${label}.`);
  return cleaned;
}

function cleanOptionalText(value: string, maximum: number, label: string) {
  const cleaned = value.trim();
  if (cleaned.length > maximum) throw new Error(`${label} is too long.`);
  return cleaned;
}

function cleanPhone(value: string) {
  const cleaned = value.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("Enter a valid phone number.");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function cleanEmail(value: string) {
  const cleaned = value.trim().toLowerCase();
  if (cleaned.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned))
    throw new Error("Enter a valid email address.");
  return cleaned;
}

function validatePickup(args: any, location: any) {
  const now = Date.now();
  if (location && !location.orderingOpen)
    throw new Error("Online ordering is currently paused.");
  if (args.pickupTiming === "asap") {
    if (location && (location.status !== "open" || location.serviceDate !== newYorkDateKey(now)))
      throw new Error("Order-now pickup is not currently available.");
    return;
  }
  if (!args.scheduledFor) throw new Error("Choose a pickup time.");
  const scheduledAt = Date.parse(args.scheduledFor);
  if (!Number.isFinite(scheduledAt) || scheduledAt < now + 5 * 60 * 1000 || scheduledAt > now + 7 * 24 * 60 * 60 * 1000)
    throw new Error("Choose an available pickup time.");
  if (location && (!location.schedulingEnabled || newYorkDateKey(scheduledAt) !== location.serviceDate))
    throw new Error("That pickup time is no longer available.");
}

function newYorkDateKey(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Square checkout is not configured yet.");
  return value;
}

function isSquareCheckoutUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["square.link", "sandbox.square.link", "checkout.square.site"].includes(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}

async function recordCheckoutError(ctx: any, orderId: any, message: string) {
  await ctx.runMutation(internal.square.failCheckout, { orderId, message });
}
