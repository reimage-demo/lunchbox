import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

const discountType = v.union(v.literal("percentage"), v.literal("fixed"));
const fields = {
  code: v.string(),
  discountType,
  amount: v.number(),
  isActive: v.boolean(),
};

export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return (await ctx.db.query("coupons").collect()).sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  },
});

export const validate = query({
  args: { code: v.string(), subtotal: v.number() },
  handler: async (ctx, { code, subtotal }) => {
    const normalized = normalizeCouponCode(code);
    if (!normalized || !Number.isFinite(subtotal) || subtotal <= 0)
      return { valid: false as const, message: "Enter a valid discount code." };
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!coupon?.isActive)
      return { valid: false as const, message: "That discount code is not valid." };
    const discount = calculateCouponDiscount(coupon, Math.floor(subtotal));
    return {
      valid: true as const,
      code: coupon.code,
      discount,
      label:
        coupon.discountType === "percentage"
          ? `${coupon.amount}% off`
          : `${money(coupon.amount)} off`,
    };
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), ...fields },
  handler: async (ctx, { sessionToken, ...values }) => {
    await requireAdmin(ctx, sessionToken);
    const coupon = clean(values);
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", coupon.code))
      .unique();
    if (existing) throw new Error("That discount code already exists.");
    const now = Date.now();
    return await ctx.db.insert("coupons", {
      ...coupon,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.id("coupons"), ...fields },
  handler: async (ctx, { sessionToken, id, ...values }) => {
    await requireAdmin(ctx, sessionToken);
    if (!(await ctx.db.get(id))) throw new Error("Discount code not found.");
    const coupon = clean(values);
    const duplicate = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", coupon.code))
      .unique();
    if (duplicate && duplicate._id !== id)
      throw new Error("That discount code already exists.");
    await ctx.db.patch(id, { ...coupon, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("coupons") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
  },
});

export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase();
}

export function calculateCouponDiscount(
  coupon: { discountType: "percentage" | "fixed"; amount: number },
  subtotal: number,
) {
  const requested =
    coupon.discountType === "percentage"
      ? Math.floor((subtotal * coupon.amount) / 100)
      : coupon.amount;
  return Math.min(subtotal, Math.max(0, requested));
}

function clean(values: {
  code: string;
  discountType: "percentage" | "fixed";
  amount: number;
  isActive: boolean;
}) {
  const code = normalizeCouponCode(values.code);
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code))
    throw new Error("Use 2–32 letters, numbers, dashes, or underscores.");
  const amount = Math.round(values.amount);
  if (
    !Number.isFinite(amount) ||
    amount < 1 ||
    (values.discountType === "percentage" ? amount > 100 : amount > 500_000)
  )
    throw new Error(
      values.discountType === "percentage"
        ? "Percentage discounts must be between 1 and 100."
        : "Dollar discounts must be between $0.01 and $5,000.",
    );
  return { ...values, code, amount };
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
