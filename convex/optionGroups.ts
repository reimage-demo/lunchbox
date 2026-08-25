import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

const option = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  price: v.number(),
  isAvailable: v.boolean(),
  sortOrder: v.number(),
});
const fields = {
  name: v.string(),
  description: v.string(),
  selectionMode: v.union(v.literal("single"), v.literal("multiple")),
  minSelections: v.number(),
  maxSelections: v.number(),
  isAvailable: v.boolean(),
  sortOrder: v.number(),
  options: v.array(option),
};

function clean(group: any) {
  const min = Math.max(0, Math.floor(group.minSelections));
  const mode = group.selectionMode === "single" ? "single" : "multiple";
  const max =
    mode === "single" ? 1 : Math.max(min, Math.floor(group.maxSelections));
  const seen = new Set<string>();
  const options = group.options.map((entry: any, index: number) => {
    const id = entry.id.trim();
    if (!id || seen.has(id)) throw new Error("Every option needs a unique ID.");
    seen.add(id);
    const name = entry.name.trim();
    if (!name) throw new Error("Every option needs a name.");
    const price = Math.round(entry.price);
    if (!Number.isFinite(price) || price < 0 || price > 100_000)
      throw new Error(`Invalid price for ${name}.`);
    return {
      ...entry,
      id,
      name,
      description: entry.description.trim(),
      price,
      sortOrder: Number.isFinite(entry.sortOrder) ? entry.sortOrder : index + 1,
    };
  });
  if (!group.name.trim()) throw new Error("Option group name is required.");
  if (!options.length) throw new Error("Add at least one option.");
  if (max < 1 || min > max || max > options.length)
    throw new Error("Selection limits do not match the available options.");
  return {
    ...group,
    name: group.name.trim(),
    description: group.description.trim(),
    selectionMode: mode,
    minSelections: min,
    maxSelections: max,
    options,
  };
}

export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return ctx.db.query("optionGroups").withIndex("by_sort_order").collect();
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), ...fields },
  handler: async (ctx, { sessionToken, ...values }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    return ctx.db.insert("optionGroups", {
      ...clean(values),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.id("optionGroups"), ...fields },
  handler: async (ctx, { sessionToken, id, ...values }) => {
    await requireAdmin(ctx, sessionToken);
    if (!(await ctx.db.get(id))) throw new Error("Option group not found.");
    await ctx.db.patch(id, { ...clean(values), updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("optionGroups") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const items = await ctx.db.query("menuItems").collect();
    await Promise.all(
      items
        .filter((item) => item.optionGroupIds?.includes(id))
        .map((item) =>
          ctx.db.patch(item._id, {
            optionGroupIds: item.optionGroupIds?.filter(
              (groupId) => groupId !== id,
            ),
            updatedAt: Date.now(),
          }),
        ),
    );
    await ctx.db.delete(id);
  },
});
