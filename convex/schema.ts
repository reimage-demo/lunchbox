import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const orderStatus = v.union(
  v.literal("received"),
  v.literal("in-progress"),
  v.literal("ready"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("refunded"),
);
const paymentStatus = v.union(
  v.literal("checkout-creating"),
  v.literal("checkout-created"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("checkout-error"),
);

export default defineSchema({
  menuCategories: defineTable({
    name: v.string(),
    kind: v.union(v.literal("menu"), v.literal("bottle")),
    isAvailable: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kind_sort", ["kind", "sortOrder"])
    .index("by_name", ["name"]),
  menuItems: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.string(),
    price: v.number(),
    accent: v.optional(v.string()),
    isAvailable: v.boolean(),
    isFeatured: v.optional(v.boolean()),
    isDrinkOfNight: v.optional(v.boolean()),
    isCustomDrink: v.optional(v.boolean()),
    isBottleService: v.optional(v.boolean()),
    showsStartingPrice: v.optional(v.boolean()),
    optionGroupIds: v.optional(v.array(v.id("optionGroups"))),
    sortOrder: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    addOns: v.array(
      v.object({
        name: v.string(),
        price: v.number(),
        isAvailable: v.boolean(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"])
    .index("by_category", ["category"])
    .index("by_available_sort", ["isAvailable", "sortOrder"]),
  optionGroups: defineTable({
    name: v.string(),
    description: v.string(),
    selectionMode: v.union(v.literal("single"), v.literal("multiple")),
    minSelections: v.number(),
    maxSelections: v.number(),
    isAvailable: v.boolean(),
    sortOrder: v.number(),
    options: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        price: v.number(),
        isAvailable: v.boolean(),
        sortOrder: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sort_order", ["sortOrder"]),
  coupons: defineTable({
    code: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    amount: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_code", ["code"]),
  events: defineTable({
    title: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_published_date", ["isPublished", "date"]),
  truckLocations: defineTable({
    key: v.string(),
    locationName: v.string(),
    address: v.string(),
    locationNotes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    serviceDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("opening-soon"),
      v.literal("moving"),
      v.literal("closed"),
    ),
    orderingOpen: v.boolean(),
    schedulingEnabled: v.boolean(),
    prepTimeMinutes: v.number(),
    doorDashUrl: v.optional(v.string()),
    uberEatsUrl: v.optional(v.string()),
    lastConfirmedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  geocoderState: defineTable({
    key: v.string(),
    lastRequestAt: v.number(),
    requestedCoordinateKey: v.string(),
    cachedCoordinateKey: v.optional(v.string()),
    cachedAddress: v.optional(v.string()),
    cachedAttribution: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  orders: defineTable({
    orderNumber: v.string(),
    customerName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    notes: v.string(),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        unitPrice: v.number(),
        quantity: v.number(),
        selectedAddOns: v.array(
          v.object({ name: v.string(), price: v.number() }),
        ),
      }),
    ),
    subtotal: v.number(),
    discount: v.optional(v.number()),
    couponCode: v.optional(v.string()),
    tip: v.optional(v.number()),
    total: v.number(),
    status: orderStatus,
    paid: v.boolean(),
    paymentStatus: v.optional(paymentStatus),
    clientRequestId: v.optional(v.string()),
    checkoutIdempotencyKey: v.optional(v.string()),
    checkoutAttemptedAt: v.optional(v.number()),
    squarePaymentLinkId: v.optional(v.string()),
    squareOrderId: v.optional(v.string()),
    squarePaymentId: v.optional(v.string()),
    paymentUpdatedAt: v.optional(v.number()),
    pickedUpAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    checkoutError: v.optional(v.string()),
    ageConfirmed: v.boolean(),
    fulfillmentType: v.optional(v.literal("pickup")),
    pickupTiming: v.optional(
      v.union(v.literal("asap"), v.literal("scheduled")),
    ),
    scheduledFor: v.optional(v.string()),
    pickupLocationName: v.optional(v.string()),
    pickupAddress: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_paid_created_at", ["paid", "createdAt"])
    .index("by_archived_paid_created_at", ["archivedAt", "paid", "createdAt"])
    .index("by_paid_status_created_at", ["paid", "status", "createdAt"])
    .index("by_archived_paid_status_created_at", [
      "archivedAt",
      "paid",
      "status",
      "createdAt",
    ])
    .index("by_status", ["status"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_order_number", ["orderNumber"])
    .index("by_client_request_id", ["clientRequestId"])
    .index("by_square_order_id", ["squareOrderId"])
    .index("by_square_payment_id", ["squarePaymentId"]),
  adminSessions: defineTable({
    token: v.string(),
    username: v.string(),
    expiresAt: v.number(),
    lastActivityAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_token", ["token"]),
  adminLoginSecurity: defineTable({
    key: v.string(),
    failedAttempts: v.number(),
    locked: v.boolean(),
    lockedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
