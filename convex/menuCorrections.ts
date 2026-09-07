import { internalMutation } from "./_generated/server";

// Owner-requested correction; preserve item IDs and existing order references.
export const restoreVegetarianLunchbox = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("menuItems").collect();
    const vegetarian = rows.find(row => ["vegetarian meal", "vegetarian lunchbox", "veggie lunch box"].includes(row.name.trim().toLowerCase()));
    if (!vegetarian) throw new Error("Existing vegetarian meal was not found");
    const now = Date.now();
    await ctx.db.patch(vegetarian._id, {
      name: "Vegetarian Lunchbox", category: "Lunch Boxes", price: 1500,
      description: "A hearty vegetarian meal of seasoned cabbage, rice and peas, and fried plantain.",
      isAvailable: true, sizes: [], optionGroupIds: [], addOns: [],
      showsStartingPrice: false, isCustomDrink: false, isBottleService: false, updatedAt: now,
    });
    const groups = await ctx.db.query("optionGroups").collect();
    const values = {
      name: "Choose your included side", description: "Rice and peas come with your box. Choose one extra side.",
      selectionMode: "single" as const, minSelections: 1, maxSelections: 1,
      isAvailable: true, sortOrder: 1,
      options: [
        {id:"cabbage",name:"Cabbage",description:"",price:0,isAvailable:true,sortOrder:1},
        {id:"plantain",name:"Fried plantain",description:"",price:0,isAvailable:true,sortOrder:2},
      ], updatedAt: now,
    };
    const existing = groups.find(group => group.name === values.name);
    const groupId = existing?._id ?? await ctx.db.insert("optionGroups", {...values,createdAt:now});
    if(existing) await ctx.db.patch(groupId,values);
    let updated = 1;
    for (const row of rows) {
      if(row._id === vegetarian._id || row.category !== "Lunch Boxes") continue;
      if(row.name === "Cabbage & Festival Meal") {
        await ctx.db.patch(row._id, {category:"Sides",price:1000,updatedAt:now});
        continue;
      }
      await ctx.db.patch(row._id, {price:1500,sizes:[],showsStartingPrice:false,isCustomDrink:false,addOns:[],optionGroupIds:row.name === "Callaloo Lunch Box" ? [] : [groupId],updatedAt:now});
      updated++;
    }
    return {updated,vegetarianName:"Vegetarian Lunchbox",lunchboxPrice:1500};
  },
});
