import { catalog, applyLunchBoxFocus } from "./menuCatalog";
import { internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const menu = catalog.map((entry) => [entry.name, entry.category, entry.description, entry.price, entry.unpublished ? "Unpublished" : entry.comingSoon ? "Coming soon" : "", entry.imageUrl] as const);

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let menuInserted = 0;
    let eventsInserted = 0;
    if (!(await ctx.db.query("menuItems").first())) {
      for (const [index, row] of menu.entries()) {
        await ctx.db.insert("menuItems", {
          name: row[0],
          category: row[1],
          description: row[2],
          price: row[3],
          accent: row[4],
          imageUrl: row[5],
          isAvailable: !["Coming soon", "Unpublished"].includes(row[4]),
          isComingSoon: row[4] === "Coming soon",
          isFeatured: index < 2,
          sortOrder: index + 1,
          addOns: [],
          createdAt: now,
          updatedAt: now,
        });
        menuInserted++;
      }
    }
    if (menuInserted) await applyLunchBoxFocus(ctx);
    if (!(await ctx.db.query("events").first())) {
      await ctx.db.insert("events", {
        title: "Lunch Box Pop-Up",
        date: "2026-09-05",
        startTime: "12:00 PM",
        endTime: "5:00 PM",
        description: "A sample announcement ready to replace with the next Lunch Box pop-up, special or catering date.",
        imageUrl: "/assets/images/lunch-box/garett-grilling.webp",
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      });
      eventsInserted++;
    }
    return { menuInserted, eventsInserted };
  },
});

// This retains the Patio schema's internal `isBottleService` field so the
// duplicated admin and ordering code remain compatible. In Lunch Box it means
// "catering item" everywhere customers and staff see it.
export const addCateringDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingItems = await ctx.db.query("menuItems").collect();
    const existingGroups = await ctx.db.query("optionGroups").collect();
    const definitions = [
      {
        name: "Choose your tray size",
        description: "Select the serving size for this tray.",
        selectionMode: "single" as const,
        minSelections: 1,
        maxSelections: 1,
        options: [
          ["half", "Half tray", "Confirm serving count before launch", 0],
          ["full", "Full tray", "Confirm serving count before launch", 6500],
        ],
      },
      {
        name: "Add catering sides",
        description: "Optional sides for the group.",
        selectionMode: "multiple" as const,
        minSelections: 0,
        maxSelections: 3,
        options: [
          ["rice", "Rice and peas", "Half tray", 4000],
          ["callaloo", "Callaloo", "Half tray", 4500],
          ["plantain", "Plantain", "Half tray", 4000],
        ],
      },
    ];

    const optionGroupIds: Id<"optionGroups">[] = [];
    let groupsInserted = 0;
    for (const [groupIndex, definition] of definitions.entries()) {
      const existing = existingGroups.find((group) => group.name === definition.name);
      if (existing) {
        optionGroupIds.push(existing._id);
        continue;
      }
      const id = await ctx.db.insert("optionGroups", {
        ...definition,
        isAvailable: true,
        sortOrder: 100 + groupIndex,
        options: definition.options.map(([id, name, description, price], index) => ({
          id: String(id),
          name: String(name),
          description: String(description),
          price: Number(price),
          isAvailable: true,
          sortOrder: index + 1,
        })),
        createdAt: now,
        updatedAt: now,
      });
      optionGroupIds.push(id);
      groupsInserted++;
    }

    const name = "Jerk Chicken Catering Tray";
    const existing = existingItems.find((item) => item.name === name);
    if (existing) {
      await ctx.db.patch(existing._id, {
        category: "Catering Trays",
        isBottleService: true,
        isCustomDrink: true,
        isAvailable: true,
        imageUrl: "/assets/images/lunch-box/branded-jerk-chicken.webp",
        optionGroupIds,
        updatedAt: now,
      });
      return { itemId: existing._id, itemInserted: 0, groupsInserted };
    }
    const itemId = await ctx.db.insert("menuItems", {
      name,
      category: "Catering Trays",
      description: "A party-ready tray of chopped jerk chicken with optional sides.",
      price: 8500,
      accent: "Catering",
      imageUrl: "/assets/images/lunch-box/branded-jerk-chicken.webp",
      isAvailable: true,
      isFeatured: false,
      isDrinkOfNight: false,
      isCustomDrink: true,
      isBottleService: true,
      showsStartingPrice: true,
      optionGroupIds,
      sortOrder: 1,
      addOns: [],
      createdAt: now,
      updatedAt: now,
    });
    return { itemId, itemInserted: 1, groupsInserted };
  },
});
