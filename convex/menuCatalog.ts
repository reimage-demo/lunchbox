import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type CatalogEntry = {
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl?: string;
  catering?: boolean;
  featured?: boolean;
  showsStartingPrice?: boolean;
  optionGroup?: string;
};

const categories = [
  { name: "Lunch Boxes", kind: "menu" as const },
  { name: "Build Your Own", kind: "menu" as const },
  { name: "Starters", kind: "menu" as const },
  { name: "Mains", kind: "menu" as const },
  { name: "Sides", kind: "menu" as const },
  { name: "Natural Drinks", kind: "menu" as const },
  { name: "Drinks", kind: "menu" as const },
  { name: "Catering Trays", kind: "bottle" as const },
];

const publicImageUrl = (filename: string) =>
  `https://lunchboxct.com/assets/images/lunch-box/${filename}`;

const catalog: CatalogEntry[] = [
  { name: "Jerk Chicken Lunch Box", category: "Lunch Boxes", price: 1800, description: "Smoky jerk chicken with rice, cabbage and plantain.", imageUrl: publicImageUrl("branded-jerk-chicken-box.webp"), featured: true },
  { name: "Curry Chicken Lunch Box", category: "Lunch Boxes", price: 1800, description: "Slow-cooked curry chicken served with rice and a seasonal side.", imageUrl: publicImageUrl("branded-curry-chicken-box.webp"), featured: true },
  { name: "Escovitch Fish Lunch Box", category: "Lunch Boxes", price: 2400, description: "Seasoned fish finished with bright pickled peppers and vegetables.", imageUrl: publicImageUrl("branded-escovitch-fish.webp") },
  { name: "Steamed Fish Lunch Box", category: "Lunch Boxes", price: 2600, description: "Whole fish steamed with herbs, peppers and garden vegetables.", imageUrl: publicImageUrl("branded-steamed-fish-box-v2.webp") },
  { name: "Soup", category: "Starters", price: 500, description: "A comforting bowl of today's freshly prepared soup.", imageUrl: publicImageUrl("branded-soup-v2.webp") },
  { name: "Jerk Chicken", category: "Mains", price: 1000, description: "Chicken seasoned with our bold jerk spices and cooked until tender.", imageUrl: publicImageUrl("branded-jerk-chicken.webp") },
  { name: "Jerk Pork", category: "Mains", price: 1000, description: "Tender pork seasoned with our bold jerk spices.", imageUrl: publicImageUrl("branded-jerk-pork-v2.webp") },
  { name: "Fish", category: "Mains", price: 2500, description: "Freshly prepared fish in your choice of size.", imageUrl: publicImageUrl("branded-fish-v2.webp"), showsStartingPrice: true, optionGroup: "Choose your fish size" },
  { name: "Rice & Peas Meal", category: "Mains", price: 1500, description: "A hearty meal built around seasoned rice and peas.", imageUrl: publicImageUrl("branded-rice-and-peas-v2.webp") },
  { name: "Callaloo", category: "Sides", price: 700, description: "Tender greens cooked with fresh vegetables and island seasoning.", imageUrl: publicImageUrl("branded-callaloo-v2.webp") },
  { name: "Fried Dumplings", category: "Sides", price: 600, description: "Golden, crisp outside and soft inside. Three per order.", imageUrl: publicImageUrl("branded-fried-dumplings-v2.webp") },
  { name: "Festival", category: "Sides", price: 500, description: "Sweet Jamaican fried dough with a golden outside and soft center.", imageUrl: publicImageUrl("branded-festival.webp") },
  { name: "Fried Plantain", category: "Sides", price: 500, description: "Sweet ripe plantain fried until caramelized.", imageUrl: publicImageUrl("branded-fried-plantain-v2.webp") },
  { name: "Strawberry Pineapple", category: "Natural Drinks", price: 1000, description: "A refreshing natural strawberry and pineapple drink.", imageUrl: publicImageUrl("branded-strawberry-pineapple-v2.webp") },
  { name: "To The World", category: "Natural Drinks", price: 1000, description: "The house natural drink blend featured on our menu.", imageUrl: publicImageUrl("branded-to-the-world-v2.webp") },
  { name: "Beetroot", category: "Natural Drinks", price: 1000, description: "A vibrant natural beetroot drink.", imageUrl: publicImageUrl("branded-beetroot-v2.webp") },
  { name: "Irish Moss", category: "Natural Drinks", price: 1000, description: "A rich, creamy Caribbean-style Irish moss drink.", imageUrl: publicImageUrl("branded-irish-moss-v2.webp") },
  { name: "Cucumber", category: "Natural Drinks", price: 1000, description: "A cool and refreshing natural cucumber drink.", imageUrl: publicImageUrl("branded-cucumber-v2.webp") },
  { name: "Carrot", category: "Natural Drinks", price: 1000, description: "A smooth natural carrot drink with island flavor.", imageUrl: publicImageUrl("branded-carrot-v2.webp") },
  { name: "Other Natural Drink", category: "Natural Drinks", price: 1000, description: "Ask about today's additional natural drink flavor.", imageUrl: publicImageUrl("branded-other-natural-v2.webp") },
  { name: "Jerk Chicken Catering Tray", category: "Catering Trays", price: 8500, description: "A party-ready tray of chopped jerk chicken.", imageUrl: publicImageUrl("branded-jerk-chicken.webp"), catering: true },
  { name: "Fish & Vegetable Catering Tray", category: "Catering Trays", price: 12000, description: "Seasoned fish with peppers and vegetables for group orders.", imageUrl: publicImageUrl("branded-escovitch-fish.webp"), catering: true },
];

const normalized = (value: string) => value.trim().toLocaleLowerCase();

const optionId = (value: string) =>
  `side-${normalized(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

const generatedImageItemNames = new Set([
  "steamed fish lunch box",
  "callaloo",
  "fried dumplings",
  "soup",
  "jerk pork",
  "fish",
  "rice & peas meal",
  "festival",
  "fried plantain",
  "strawberry pineapple",
  "to the world",
  "beetroot",
  "irish moss",
  "cucumber",
  "carrot",
  "other natural drink",
]);

// Adds only missing starter records and preserves everything already edited by
// Lunch Box staff. Safe to run more than once on the new deployment.
export const addMissingClientMenu = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingCategories = await ctx.db.query("menuCategories").collect();
    const existingItems = await ctx.db.query("menuItems").collect();
    const existingGroups = await ctx.db.query("optionGroups").collect();
    let categoriesInserted = 0;
    let itemsInserted = 0;
    let itemImagesBackfilled = 0;
    let groupsInserted = 0;

    for (const [index, category] of categories.entries()) {
      if (existingCategories.some((row) => row.kind === category.kind && normalized(row.name) === normalized(category.name))) continue;
      await ctx.db.insert("menuCategories", {
        name: category.name,
        kind: category.kind,
        sortOrder: index + 1,
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
      categoriesInserted++;
    }

    const fishGroupName = "Choose your fish size";
    let fishGroupId: Id<"optionGroups">;
    const existingFishGroup = existingGroups.find(
      (group) => normalized(group.name) === normalized(fishGroupName),
    );
    if (existingFishGroup) {
      fishGroupId = existingFishGroup._id;
    } else {
      fishGroupId = await ctx.db.insert("optionGroups", {
        name: fishGroupName,
        description: "Select a regular or large fish.",
        selectionMode: "single",
        minSelections: 1,
        maxSelections: 1,
        isAvailable: true,
        sortOrder: 1,
        options: [
          { id: "regular", name: "Regular", description: "$25 size", price: 0, isAvailable: true, sortOrder: 1 },
          { id: "large", name: "Large", description: "$30 size", price: 500, isAvailable: true, sortOrder: 2 },
        ],
        createdAt: now,
        updatedAt: now,
      });
      groupsInserted++;
    }

    for (const [index, entry] of catalog.entries()) {
      const existing = existingItems.find(
        (row) => normalized(row.name) === normalized(entry.name),
      );
      const optionGroupIds = entry.optionGroup === fishGroupName ? [fishGroupId] : [];
      if (existing) {
        const patch: Record<string, unknown> = {};
        if (
          !existing.imageStorageId &&
          entry.imageUrl &&
          (!existing.imageUrl || !/^https?:/i.test(existing.imageUrl))
        )
          patch.imageUrl = entry.imageUrl;
        if (
          entry.optionGroup &&
          (!existing.optionGroupIds?.length || existing.showsStartingPrice === undefined)
        ) {
          Object.assign(patch, {
            optionGroupIds: existing.optionGroupIds?.length
              ? existing.optionGroupIds
              : optionGroupIds,
            showsStartingPrice:
              existing.showsStartingPrice ?? entry.showsStartingPrice ?? false,
          });
        }
        if (Object.keys(patch).length) {
          await ctx.db.patch(existing._id, { ...patch, updatedAt: now });
          if (patch.imageUrl) itemImagesBackfilled++;
        }
        continue;
      }
      await ctx.db.insert("menuItems", {
        name: entry.name,
        category: entry.category,
        description: entry.description,
        price: entry.price,
        imageUrl: entry.imageUrl,
        isAvailable: true,
        isFeatured: entry.featured ?? false,
        isDrinkOfNight: false,
        isCustomDrink: false,
        isBottleService: entry.catering ?? false,
        showsStartingPrice: entry.showsStartingPrice ?? false,
        optionGroupIds,
        sortOrder: index + 1,
        addOns: [],
        createdAt: now,
        updatedAt: now,
      });
      itemsInserted++;
    }

    return {
      categoriesInserted,
      itemsInserted,
      itemImagesBackfilled,
      groupsInserted,
      existingItemsPreserved: existingItems.length,
    };
  },
});

// Applies owner-approved authentic imagery to known dishes and clears old
// generic/placeholder imagery from items that do not have a truthful match.
// Existing uploaded files are left intact in storage, but are no longer shown.
export const applyBrandedMenuImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingItems = await ctx.db.query("menuItems").collect();
    let updated = 0;

    for (const item of existingItems) {
      const entry = catalog.find(
        (candidate) => normalized(candidate.name) === normalized(item.name),
      );
      if (!entry) continue;
      if (
        item.imageUrl === entry.imageUrl &&
        item.imageStorageId === undefined
      )
        continue;

      await ctx.db.patch(item._id, {
        imageUrl: entry.imageUrl,
        imageStorageId: undefined,
        updatedAt: now,
      });
      updated++;
    }

    return { updated, matched: existingItems.length };
  },
});

// Replaces only the placeholder/reused photos identified for this image pass.
// Existing menu photography and all non-image item fields remain untouched.
export const applyGeneratedMenuImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingItems = await ctx.db.query("menuItems").collect();
    let updated = 0;

    for (const item of existingItems) {
      if (!generatedImageItemNames.has(normalized(item.name))) continue;
      const entry = catalog.find(
        (candidate) => normalized(candidate.name) === normalized(item.name),
      );
      if (!entry?.imageUrl) continue;
      if (
        item.imageUrl === entry.imageUrl &&
        item.imageStorageId === undefined
      )
        continue;

      await ctx.db.patch(item._id, {
        imageUrl: entry.imageUrl,
        imageStorageId: undefined,
        updatedAt: now,
      });
      updated++;
    }

    return { updated, targeted: generatedImageItemNames.size };
  },
});

// Creates one reusable, food-only side choice and attaches it to every Main
// and Lunch Box meal.
// Safe to run repeatedly: existing item choices are preserved and the side
// group is updated in place when the current Sides catalog changes.
export const ensureMealSideAddOns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const items = await ctx.db.query("menuItems").collect();
    const groups = await ctx.db.query("optionGroups").collect();
    const sideItems = items
      .filter(
        (item) =>
          normalized(item.category) === "sides" &&
          normalized(item.name) !== "demo order (training only)",
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);

    if (!sideItems.length)
      throw new Error("No side items are available to group.");

    const groupName = "Would you like a side?";
    const values = {
      name: groupName,
      description: "Choose one optional side to add to your meal.",
      selectionMode: "single" as const,
      minSelections: 0,
      maxSelections: 1,
      isAvailable: true,
      sortOrder: 2,
      options: sideItems.map((side, index) => ({
        id: optionId(side.name),
        name: side.name,
        description: side.description,
        price: side.price,
        isAvailable: side.isAvailable,
        sortOrder: index + 1,
      })),
    };

    const existingGroup = groups.find(
      (group) => normalized(group.name) === normalized(groupName),
    );
    let groupId: Id<"optionGroups">;
    if (existingGroup) {
      await ctx.db.patch(existingGroup._id, { ...values, updatedAt: now });
      groupId = existingGroup._id;
    } else {
      groupId = await ctx.db.insert("optionGroups", {
        ...values,
        createdAt: now,
        updatedAt: now,
      });
    }

    const meals = items.filter(
      (item) =>
        ["mains", "lunch boxes"].includes(normalized(item.category)) &&
        item.isBottleService !== true,
    );
    let mealsUpdated = 0;
    for (const item of meals) {
      const currentIds = item.optionGroupIds || [];
      if (currentIds.some((id) => String(id) === String(groupId))) continue;
      await ctx.db.patch(item._id, {
        optionGroupIds: [...currentIds, groupId],
        updatedAt: now,
      });
      mealsUpdated++;
    }

    return {
      groupId,
      sides: sideItems.map((side) => side.name),
      meals: meals.map((item) => item.name),
      mealsUpdated,
    };
  },
});
