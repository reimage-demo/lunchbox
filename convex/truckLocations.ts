import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const CURRENT_LOCATION_KEY = "current";
const status = v.union(
  v.literal("open"),
  v.literal("opening-soon"),
  v.literal("moving"),
  v.literal("closed"),
);

const publicLocation = (location: any) =>
  location
    ? {
        locationName: location.locationName,
        address: location.address,
        locationNotes: location.locationNotes,
        latitude: location.latitude,
        longitude: location.longitude,
        serviceDate: location.serviceDate,
        startTime: location.startTime,
        endTime: location.endTime,
        status: location.status,
        orderingOpen: location.orderingOpen,
        schedulingEnabled: location.schedulingEnabled,
        prepTimeMinutes: location.prepTimeMinutes,
        doorDashUrl: location.doorDashUrl,
        uberEatsUrl: location.uberEatsUrl,
        lastConfirmedAt: location.lastConfirmedAt,
      }
    : null;

export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const location = await ctx.db
      .query("truckLocations")
      .withIndex("by_key", (q) => q.eq("key", CURRENT_LOCATION_KEY))
      .unique();
    return publicLocation(location);
  },
});

export const getAdmin = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return ctx.db
      .query("truckLocations")
      .withIndex("by_key", (q) => q.eq("key", CURRENT_LOCATION_KEY))
      .unique();
  },
});

export const saveCurrent = mutation({
  args: {
    sessionToken: v.string(),
    locationName: v.string(),
    address: v.string(),
    locationNotes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    serviceDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status,
    orderingOpen: v.boolean(),
    schedulingEnabled: v.boolean(),
    prepTimeMinutes: v.number(),
    doorDashUrl: v.optional(v.string()),
    uberEatsUrl: v.optional(v.string()),
    confirmLocation: v.boolean(),
  },
  handler: async (ctx, { sessionToken, confirmLocation, ...values }) => {
    await requireAdmin(ctx, sessionToken);
    const locationName = values.locationName.trim();
    const address = values.address.trim();
    if (!locationName) throw new Error("Enter a location name.");
    if (!address) throw new Error("Enter the pickup address.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.serviceDate))
      throw new Error("Choose a valid service date.");
    if (!Number.isFinite(values.prepTimeMinutes) || values.prepTimeMinutes < 5)
      throw new Error("Prep time must be at least 5 minutes.");
    if (
      (values.latitude === undefined) !== (values.longitude === undefined) ||
      (values.latitude !== undefined &&
        (values.latitude < -90 ||
          values.latitude > 90 ||
          values.longitude! < -180 ||
          values.longitude! > 180))
    )
      throw new Error("The map coordinates are invalid.");
    for (const [label, url] of [
      ["DoorDash", values.doorDashUrl],
      ["Uber Eats", values.uberEatsUrl],
    ] as const) {
      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:") throw new Error();
        } catch {
          throw new Error(`${label} must use a complete https:// link.`);
        }
      }
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("truckLocations")
      .withIndex("by_key", (q) => q.eq("key", CURRENT_LOCATION_KEY))
      .unique();
    const record = {
      ...values,
      locationName,
      address,
      locationNotes: values.locationNotes?.trim() || undefined,
      doorDashUrl: values.doorDashUrl?.trim() || undefined,
      uberEatsUrl: values.uberEatsUrl?.trim() || undefined,
      prepTimeMinutes: Math.round(values.prepTimeMinutes),
      ...(confirmLocation ? { lastConfirmedAt: now } : {}),
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, record);
      return existing._id;
    }
    return ctx.db.insert("truckLocations", {
      key: CURRENT_LOCATION_KEY,
      ...record,
      createdAt: now,
    });
  },
});
