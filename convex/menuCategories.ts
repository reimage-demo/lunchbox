import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

const kind = v.union(v.literal("menu"), v.literal("bottle"));

const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

async function assertUniqueName(
  ctx: any,
  name: string,
  categoryKind: "menu" | "bottle",
  exceptId?: any,
) {
  const categories = await ctx.db.query("menuCategories").collect();
  const duplicate = categories.find(
    (category: any) =>
      category._id !== exceptId &&
      category.kind === categoryKind &&
      category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (duplicate) throw new Error("A category with this name already exists.");
}

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("menuCategories").collect();
    return categories
      .filter((category) => category.isAvailable)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  },
});

export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const categories = await ctx.db.query("menuCategories").collect();
    return categories.sort(
      (left, right) =>
        left.kind.localeCompare(right.kind) || left.sortOrder - right.sortOrder,
    );
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    kind,
    isAvailable: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (
    ctx,
    { sessionToken, name, kind: categoryKind, ...values },
  ) => {
    await requireAdmin(ctx, sessionToken);
    const cleanedName = cleanName(name);
    if (!cleanedName) throw new Error("Category name is required.");
    await assertUniqueName(ctx, cleanedName, categoryKind);
    const now = Date.now();
    return ctx.db.insert("menuCategories", {
      ...values,
      name: cleanedName,
      kind: categoryKind,
      sortOrder: Math.max(0, Math.floor(values.sortOrder)),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("menuCategories"),
    name: v.string(),
    kind,
    isAvailable: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (
    ctx,
    { sessionToken, id, name, kind: categoryKind, ...values },
  ) => {
    await requireAdmin(ctx, sessionToken);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Category not found.");
    if (existing.kind !== categoryKind)
      throw new Error("A category cannot be moved between menu types.");
    const cleanedName = cleanName(name);
    if (!cleanedName) throw new Error("Category name is required.");
    await assertUniqueName(ctx, cleanedName, categoryKind, id);
    if (cleanedName !== existing.name) {
      const items = await ctx.db.query("menuItems").collect();
      await Promise.all(
        items
          .filter(
            (item) =>
              item.category === existing.name &&
              Boolean(item.isBottleService) === (categoryKind === "bottle"),
          )
          .map((item) =>
            ctx.db.patch(item._id, {
              category: cleanedName,
              updatedAt: Date.now(),
            }),
          ),
      );
    }
    await ctx.db.patch(id, {
      ...values,
      name: cleanedName,
      sortOrder: Math.max(0, Math.floor(values.sortOrder)),
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    sessionToken: v.string(),
    kind,
    ids: v.array(v.id("menuCategories")),
  },
  handler: async (ctx, { sessionToken, kind: categoryKind, ids }) => {
    await requireAdmin(ctx, sessionToken);
    if (new Set(ids.map(String)).size !== ids.length)
      throw new Error("A category was included more than once.");
    const all = await ctx.db.query("menuCategories").collect();
    const matching = all.filter((category) => category.kind === categoryKind);
    const submitted = new Set(ids.map(String));
    if (
      matching.length !== ids.length ||
      matching.some((category) => !submitted.has(String(category._id)))
    )
      throw new Error("The categories changed. Refresh before reordering.");
    const now = Date.now();
    await Promise.all(
      ids.map((id, index) =>
        ctx.db.patch(id, { sortOrder: index + 1, updatedAt: now }),
      ),
    );
  },
});
