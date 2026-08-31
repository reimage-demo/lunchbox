import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const CURRENT_LOCATION_KEY = "current";
const status = v.union(
  v.literal("open"),
  v.literal("opening-soon"),
  v.literal("moving"),
  v.literal("closed"),
);

const coordinateArgs = {
  latitude: v.number(),
  longitude: v.number(),
};
const GEOCODER_STATE_KEY = "nominatim";
const GEOCODER_MIN_INTERVAL_MS = 1_100;

function validateCoordinates(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error("The phone returned invalid map coordinates.");
}

function customerAddress(result: any) {
  const address = result?.address || {};
  const road =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.cycleway;
  const street = [address.house_number, road].filter(Boolean).join(" ");
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.county;
  const isoRegion = Object.entries(address).find(
    ([key, value]) =>
      key.startsWith("ISO3166-2-lvl") &&
      typeof value === "string" &&
      /^US-[A-Z]{2}$/.test(value),
  )?.[1];
  const region =
    typeof isoRegion === "string"
      ? isoRegion.slice(3)
      : address.state_code || address.state;
  const cityLine = [locality, [region, address.postcode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, cityLine].filter(Boolean).join(", ") || result?.display_name;
}

export const reverseGeocode = action({
  args: {
    sessionToken: v.string(),
    ...coordinateArgs,
  },
  handler: async (
    ctx,
    { sessionToken, latitude, longitude },
  ): Promise<{ address: string; attribution: string }> => {
    await ctx.runQuery(api.adminAuth.validate, { sessionToken });
    validateCoordinates(latitude, longitude);
    const coordinateKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const reservation: {
      cachedAddress?: string;
      cachedAttribution?: string;
    } = await ctx.runMutation(internal.truckLocations.reserveGeocoderLookup, {
      sessionToken,
      coordinateKey,
    });
    if (reservation.cachedAddress)
      return {
        address: reservation.cachedAddress,
        attribution:
          reservation.cachedAttribution ||
          "Address data © OpenStreetMap contributors",
      };

    const params = new URLSearchParams({
      format: "jsonv2",
      lat: latitude.toString(),
      lon: longitude.toString(),
      zoom: "18",
      addressdetails: "1",
      layer: "address",
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.8",
          Referer: "https://lunchboxct.com/",
          "User-Agent": "LunchBoxTruckCheckin/1.0 (https://lunchboxct.com)",
        },
      },
    );
    if (!response.ok)
      throw new Error("The address service is unavailable. Enter the address manually.");

    const result = await response.json();
    const address = customerAddress(result);
    if (!address)
      throw new Error("No street address was found for this pin. Enter the address manually.");

    const lookup = {
      address,
      attribution: "Address data © OpenStreetMap contributors",
    };
    await ctx.runMutation(internal.truckLocations.cacheGeocoderLookup, {
      coordinateKey,
      ...lookup,
    });
    return lookup;
  },
});

export const reserveGeocoderLookup = internalMutation({
  args: {
    sessionToken: v.string(),
    coordinateKey: v.string(),
  },
  handler: async (ctx, { sessionToken, coordinateKey }) => {
    await requireAdmin(ctx, sessionToken);
    const now = Date.now();
    const state = await ctx.db
      .query("geocoderState")
      .withIndex("by_key", (q) => q.eq("key", GEOCODER_STATE_KEY))
      .unique();
    if (state?.cachedCoordinateKey === coordinateKey && state.cachedAddress)
      return {
        cachedAddress: state.cachedAddress,
        cachedAttribution: state.cachedAttribution,
      };
    if (state && now - state.lastRequestAt < GEOCODER_MIN_INTERVAL_MS)
      throw new Error("Wait a moment before looking up the address again.");

    const values = {
      lastRequestAt: now,
      requestedCoordinateKey: coordinateKey,
      updatedAt: now,
    };
    if (state) await ctx.db.patch(state._id, values);
    else
      await ctx.db.insert("geocoderState", {
        key: GEOCODER_STATE_KEY,
        ...values,
        createdAt: now,
      });
    return {};
  },
});

export const cacheGeocoderLookup = internalMutation({
  args: {
    coordinateKey: v.string(),
    address: v.string(),
    attribution: v.string(),
  },
  handler: async (ctx, { coordinateKey, address, attribution }) => {
    const state = await ctx.db
      .query("geocoderState")
      .withIndex("by_key", (q) => q.eq("key", GEOCODER_STATE_KEY))
      .unique();
    if (!state || state.requestedCoordinateKey !== coordinateKey) return;
    await ctx.db.patch(state._id, {
      cachedCoordinateKey: coordinateKey,
      cachedAddress: address,
      cachedAttribution: attribution,
      updatedAt: Date.now(),
    });
  },
});

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
    if ((values.latitude === undefined) !== (values.longitude === undefined))
      throw new Error("The map coordinates are invalid.");
    if (values.latitude !== undefined && values.longitude !== undefined) {
      try {
        validateCoordinates(values.latitude, values.longitude);
      } catch {
        throw new Error("The map coordinates are invalid.");
      }
    }
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
