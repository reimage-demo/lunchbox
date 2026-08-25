import { internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const menu = [
  ["Jerk Chicken Lunch Box", "Lunch Boxes", "Smoky jerk chicken with rice, cabbage and plantain.", 1800, "Customer favorite", "/assets/images/lunch-box/branded-jerk-chicken-box.webp"],
  ["Curry Chicken Lunch Box", "Lunch Boxes", "Slow-cooked curry chicken served with rice and a seasonal side.", 1800, "Comfort food", "/assets/images/lunch-box/branded-curry-chicken-box.webp"],
  ["Escovitch Fish Lunch Box", "Lunch Boxes", "Seasoned fish finished with bright pickled peppers and vegetables.", 2400, "Made fresh", "/assets/images/lunch-box/branded-escovitch-fish.webp"],
  ["Steamed Fish Lunch Box", "Lunch Boxes", "Whole fish steamed with herbs, peppers and garden vegetables.", 2600, "Cooked to order", undefined],
  ["Soup", "Starters", "A comforting bowl of today's freshly prepared soup.", 500, "Starter", undefined],
  ["Jerk Chicken", "Mains", "Chicken seasoned with our bold jerk spices and cooked until tender.", 1000, "Main", "/assets/images/lunch-box/branded-jerk-chicken.webp"],
  ["Jerk Pork", "Mains", "Tender pork seasoned with our bold jerk spices.", 1000, "Main", undefined],
  ["Fish", "Mains", "Freshly prepared fish in your choice of size.", 2500, "Starting at $25", undefined],
  ["Rice & Peas Meal", "Mains", "A hearty meal built around seasoned rice and peas.", 1500, "Meal", undefined],
  ["Callaloo", "Sides", "Tender greens cooked with fresh vegetables and island seasoning.", 700, "Fresh", undefined],
  ["Fried Dumplings", "Sides", "Golden, crisp outside and soft inside. Three per order.", 600, "House made", undefined],
  ["Festival", "Sides", "Sweet Jamaican fried dough with a golden outside and soft center.", 500, "Side", "/assets/images/lunch-box/branded-festival.webp"],
  ["Fried Plantain", "Sides", "Sweet ripe plantain fried until caramelized.", 500, "Side", undefined],
  ["Strawberry Pineapple", "Natural Drinks", "A refreshing natural strawberry and pineapple drink.", 1000, "Natural drink", undefined],
  ["To The World", "Natural Drinks", "The house natural drink blend featured on our menu.", 1000, "Natural drink", undefined],
  ["Beetroot", "Natural Drinks", "A vibrant natural beetroot drink.", 1000, "Natural drink", undefined],
  ["Irish Moss", "Natural Drinks", "A rich, creamy Caribbean-style Irish moss drink.", 1000, "Natural drink", undefined],
  ["Cucumber", "Natural Drinks", "A cool and refreshing natural cucumber drink.", 1000, "Natural drink", undefined],
  ["Carrot", "Natural Drinks", "A smooth natural carrot drink with island flavor.", 1000, "Natural drink", undefined],
  ["Other Natural Drink", "Natural Drinks", "Ask about today's additional natural drink flavor.", 1000, "Natural drink", undefined],
] as const;

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
          isAvailable: true,
          isFeatured: index < 2,
          sortOrder: index + 1,
          addOns: [],
          createdAt: now,
          updatedAt: now,
        });
        menuInserted++;
      }
    }
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
