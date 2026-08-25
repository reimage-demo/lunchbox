import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const addOns = v.array(
  v.object({ name: v.string(), price: v.number(), isAvailable: v.boolean() }),
);
const fields = {
  name: v.string(),
  category: v.string(),
  description: v.string(),
  price: v.number(),
  accent: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  isAvailable: v.boolean(),
  isFeatured: v.optional(v.boolean()),
  isDrinkOfNight: v.optional(v.boolean()),
  isCustomDrink: v.optional(v.boolean()),
  isBottleService: v.optional(v.boolean()),
  showsStartingPrice: v.optional(v.boolean()),
  optionGroupIds: v.optional(v.array(v.id("optionGroups"))),
  sortOrder: v.number(),
  addOns,
};
async function withImage(ctx: any, item: any) {
  return {
    ...item,
    imageUrl: item.imageStorageId
      ? await ctx.storage.getUrl(item.imageStorageId)
      : item.imageUrl,
  };
}
function featuredFirst(left: any, right: any) {
  const leftRank = left.isDrinkOfNight ? 0 : left.isFeatured ? 1 : 2;
  const rightRank = right.isDrinkOfNight ? 0 : right.isFeatured ? 1 : 2;
  return leftRank - rightRank || left.sortOrder - right.sortOrder;
}
async function clearOtherDrinkOfNight(ctx: any, exceptId?: any) {
  const rows = await ctx.db.query("menuItems").collect();
  await Promise.all(
    rows
      .filter((row: any) => row.isDrinkOfNight && row._id !== exceptId)
      .map((row: any) =>
        ctx.db.patch(row._id, { isDrinkOfNight: false, updatedAt: Date.now() }),
      ),
  );
}
async function validateOptionGroups(ctx: any, ids: any[] = []) {
  if (new Set(ids.map(String)).size !== ids.length)
    throw new Error("A pricing group was selected more than once.");
  const groups = await Promise.all(ids.map((id) => ctx.db.get(id)));
  if (groups.some((group) => !group))
    throw new Error("One of the selected pricing groups no longer exists.");
}

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("menuItems")
      .withIndex("by_available_sort", (q) => q.eq("isAvailable", true))
      .collect();
    rows.sort(featuredFirst);
    const groups = await ctx.db
      .query("optionGroups")
      .withIndex("by_sort_order")
      .collect();
    const categories = await ctx.db.query("menuCategories").collect();
    const categoryMap = new Map(
      categories.map((category) => [
        `${category.kind}:${category.name.toLocaleLowerCase()}`,
        category,
      ]),
    );
    const groupMap = new Map(
      groups
        .filter((group) => group.isAvailable)
        .map((group) => [
          String(group._id),
          {
            ...group,
            options: group.options
              .filter((option) => option.isAvailable)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          },
        ]),
    );
    return Promise.all(
      rows
        .filter((row) => {
          const category = categoryMap.get(
            `${row.isBottleService ? "bottle" : "menu"}:${row.category.toLocaleLowerCase()}`,
          );
          return category?.isAvailable !== false;
        })
        .map(async (row) => {
          const category = categoryMap.get(
            `${row.isBottleService ? "bottle" : "menu"}:${row.category.toLocaleLowerCase()}`,
          );
          return {
            ...(await withImage(ctx, row)),
            categorySortOrder: category?.sortOrder ?? Number.MAX_SAFE_INTEGER,
            optionGroups: (row.optionGroupIds || [])
              .map((id) => groupMap.get(String(id)))
              .filter(Boolean),
          };
        }),
    );
  },
});
export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const rows = await ctx.db
      .query("menuItems")
      .withIndex("by_sort_order")
      .collect();
    return Promise.all(rows.map((row) => withImage(ctx, row)));
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
  handler: async (ctx, { sessionToken, ...item }) => {
    await requireAdmin(ctx, sessionToken);
    await validateOptionGroups(ctx, item.optionGroupIds);
    if (item.isDrinkOfNight) await clearOtherDrinkOfNight(ctx);
    const now = Date.now();
    return ctx.db.insert("menuItems", {
      ...item,
      isFeatured: item.isFeatured ?? false,
      isDrinkOfNight: item.isDrinkOfNight ?? false,
      isCustomDrink: item.isCustomDrink ?? false,
      isBottleService: item.isBottleService ?? false,
      showsStartingPrice:
        item.showsStartingPrice ??
        (item.isCustomDrink === true || item.isBottleService === true),
      optionGroupIds: item.optionGroupIds ?? [],
      name: item.name.trim(),
      description: item.description.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("menuItems"),
    removeImage: v.optional(v.boolean()),
    ...fields,
  },
  handler: async (ctx, { sessionToken, id, removeImage, ...item }) => {
    await requireAdmin(ctx, sessionToken);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Menu item not found.");
    await validateOptionGroups(ctx, item.optionGroupIds);
    if (item.isDrinkOfNight) await clearOtherDrinkOfNight(ctx, id);
    const replacing = Boolean(
      item.imageStorageId && item.imageStorageId !== existing.imageStorageId,
    );
    if (existing.imageStorageId && (replacing || removeImage))
      await ctx.storage.delete(existing.imageStorageId);
    await ctx.db.patch(id, {
      ...item,
      isFeatured: item.isFeatured ?? false,
      isDrinkOfNight: item.isDrinkOfNight ?? false,
      isCustomDrink: item.isCustomDrink ?? false,
      isBottleService: item.isBottleService ?? false,
      showsStartingPrice:
        item.showsStartingPrice ??
        (item.isCustomDrink === true || item.isBottleService === true),
      optionGroupIds: item.optionGroupIds ?? [],
      ...(item.imageStorageId ? { imageUrl: undefined } : {}),
      ...(removeImage
        ? { imageUrl: undefined, imageStorageId: undefined }
        : {}),
      name: item.name.trim(),
      description: item.description.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    sessionToken: v.string(),
    ids: v.array(v.id("menuItems")),
  },
  handler: async (ctx, { sessionToken, ids }) => {
    await requireAdmin(ctx, sessionToken);
    if (new Set(ids.map(String)).size !== ids.length)
      throw new Error("A menu item was included more than once.");

    const items = await Promise.all(ids.map((id) => ctx.db.get(id)));
    if (items.some((item) => !item))
      throw new Error("One of these menu items no longer exists.");

    const bottleService = items[0]?.isBottleService ?? false;
    if (
      items.some((item) => (item?.isBottleService ?? false) !== bottleService)
    )
      throw new Error(
        "Regular menu items and catering items must be reordered separately.",
      );

    const allItems = await ctx.db.query("menuItems").collect();
    const matchingItems = allItems.filter(
      (item) => (item.isBottleService ?? false) === bottleService,
    );
    const submittedIds = new Set(ids.map(String));
    if (
      matchingItems.length !== ids.length ||
      matchingItems.some((item) => !submittedIds.has(String(item._id)))
    )
      throw new Error("The menu changed. Refresh it before reordering.");

    const now = Date.now();
    await Promise.all(
      ids.map((id, index) =>
        ctx.db.patch(id, { sortOrder: index + 1, updatedAt: now }),
      ),
    );
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("menuItems") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const item = await ctx.db.get(id);
    if (item?.imageStorageId) await ctx.storage.delete(item.imageStorageId);
    await ctx.db.delete(id);
  },
});
