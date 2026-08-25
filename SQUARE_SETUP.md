# Lunch Box Square setup

## Current production state

- Payment provider label: Square
- Online checkout: enabled
- Payment backend action: implemented with Square-hosted Checkout
- Payment webhook: implemented at `/square-webhook`
- Production Square credentials: stored only in Convex
- Production webhook subscription: enabled for `payment.created` and `payment.updated`
- Previous payment-provider code and webhook: removed

The production application, location, hosted checkout action and signed webhook
subscription are configured. The remaining launch validation is a small real
purchase and refund performed by the business owner.

## Integration plan

### Online orders

The selected experience is Square-hosted Checkout. The browser sends cart IDs,
selected option IDs and pickup details to the `square:createCheckout` Convex
action. Convex recalculates the price from trusted live menu and coupon data,
creates an unpaid pending order, and calls Square's `CreatePaymentLink` endpoint
with a retry-safe idempotency key. The browser receives only the hosted checkout
URL; the production access token never reaches browser code.

The order becomes paid and visible to the kitchen only after Convex validates
Square's HMAC-SHA-256 webhook signature and matches the Square order, location,
currency and exact amount. Duplicate webhook deliveries do not duplicate the
order notification.

Required Convex production environment variables:

```text
SQUARE_ACCESS_TOKEN
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
SQUARE_WEBHOOK_NOTIFICATION_URL=https://uncommon-bullfrog-641.convex.site/square-webhook
SQUARE_API_BASE_URL=https://connect.squareup.com
PUBLIC_SITE_URL=https://lunchboxct.com/
```

### Physical reader

The correct integration depends on the hardware:

- Square Reader or Square Stand: use Square Mobile Payments SDK in a native iOS/Android app, or the Square Point of Sale API where supported.
- Square Terminal: pair it using Devices API and use Terminal API checkout requests plus signed webhook events.

A generic website cannot safely talk directly to a Bluetooth Square Reader without the supported Square mobile/POS integration.

## Production activation checklist

- Complete Sandbox payment, duplicate-delivery and cancellation tests.
- Verify webhook signatures and reject replayed events.
- Verify Square application and location IDs belong to Lunch Box.
- Store the production access token only in Convex production environment variables.
- Confirm no Patio payment credentials exist in Lunch Box.
- Deploy the Square backend and payment UI.
- Run one small production purchase and refund with the business owner present.
