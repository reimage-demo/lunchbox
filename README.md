# Lunch Box ordering system

This is an independent Lunch Box rebrand of the proven Patio stack. It includes the responsive customer website, pickup cart and status board, a separate Convex backend, coupons, events/specials and the complete React admin dashboard. Square-hosted checkout is enabled and signed Square webhooks are the source of truth for paid orders.

No Patio secrets, database connection or live customer data were copied. Lunch Box has its own Convex project and production deployment at `https://uncommon-bullfrog-641.convex.cloud`.

## What is included

- Home, menu, specials, contact, order-status and policy pages
- Responsive black, white and red Lunch Box visual system
- Supplied logo and optimized WebP versions of all supplied food photography
- Pickup cart, item customization, tips and coupons
- Square-hosted checkout with signed, idempotent payment webhooks
- Live Convex menu, orders, order status and specials
- Separate admin portal for orders, menu/category management, Catering Trays, pricing/options, coupons and specials/events
- Secure admin sessions, login throttling and manual unlock
- Starter Lunch Box menu and catering data

The starter names, descriptions and prices are setup content only. Confirm every product, price, serving size, allergen statement and photo assignment before taking live orders.

## First-time setup

Install dependencies:

```bash
npm install
```

The separate **Lunch Box** Convex project is already configured. To update its development deployment while working on backend functions:

```bash
npx convex dev
```

The public `config.js` targets the Lunch Box production URL. Use `npx convex deploy` to publish backend changes to production.

Seed starter content:

```bash
npx convex run seed:run
```

Run the public site during development:

```bash
npx serve .
```

The admin source and production deployment live independently in
`reimage-demo/ADMIN-Lunchbox` at `https://admin.lunchboxct.com/`. The public
Lunch Box Pages workflow publishes only the customer-facing files.

Build and verify:

```bash
npm run public:build
```

## Admin credentials

Production uses the same credential protection as Patio: PBKDF2-HMAC-SHA-256
with 310,000 iterations, a unique random salt, a separate random server-side
pepper, and constant-time hash comparison. Store only these values in the
Lunch Box production Convex environment:

```text
ADMIN_USERNAME
ADMIN_PASSWORD_SALT
ADMIN_PASSWORD_HASH
ADMIN_PASSWORD_PEPPER
```

Never store an `ADMIN_PASSWORD` plaintext variable. The login locks after five
failed attempts. Unlock it from a trusted terminal with
`npx convex run adminAuth:unlock` (add `--prod` for production).

Admin sessions have a server-enforced 30-minute inactivity timeout and a
12-hour absolute lifetime. Deliberate admin interaction refreshes the idle
deadline; background data subscriptions do not. When either deadline is
reached, the server rejects the token and the admin portal clears the local
session and requires a fresh login.

## Square payments

The public configuration sets `paymentProvider: "square"` and
`paymentEnabled: true`. The secure Square-hosted Checkout action creates the
checkout session, while the signed payment webhook is the source of truth for
paid orders. A successful verified payment makes the order visible in the admin
portal and customer-facing status board.

Before enabling payments:

1. Create the Lunch Box Square seller account and link its business bank account.
2. Create a dedicated Lunch Box application in the Square Developer Console.
3. Configure the selected online experience:
   - Online website checkout: Square-hosted Checkout API (`CreatePaymentLink`).
   - In-person reader: Square Mobile Payments SDK or Point of Sale API for a Square Reader; Terminal API only if the purchased hardware is a Square Terminal.
4. Test online payment, refunds, webhooks, duplicate-payment protection and order creation in Square Sandbox.
5. Store production access tokens and webhook signature keys only in the Lunch Box Convex production environment. Never place secret tokens in `config.js`, HTML, JavaScript, or `VITE_` variables.
6. Enable checkout only after a successful end-to-end production test against the Lunch Box Square location.

Production Convex values are `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`,
`SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL`,
`SQUARE_API_BASE_URL`, and `PUBLIC_SITE_URL`. See `SQUARE_SETUP.md` for the
exact URLs and activation sequence.

## Notifications

Optional paid-order notifications use:

```text
PUSHOVER_API_TOKEN
PUSHOVER_USER_KEY
```

Test with `npx convex run notifications:sendTest`.

## Daily truck location and NFC check-in

The public site reads one current pickup location from Convex. In the admin
portal, open **Truck Location** to capture the parked truck's GPS coordinates,
confirm the customer-facing address and hours, set ordering availability, and
publish the stop. The public order bar, directions, pickup timing, checkout
summary, contact page and footers update from that record.

The Truck Location screen displays the protected check-in URL to encode on an
NFC tag kept inside the truck. The passive tag does not track the vehicle: it
opens the authenticated check-in screen, and the operator's phone supplies the
location after permission is granted. A fresh confirmation is required for
each service date; an older stop is not presented as today's active location.

DoorDash and Uber Eats storefront URLs can be added on the same screen. Until a
URL is supplied, its delivery button is shown as coming soon. Delivery payment,
fulfillment and tracking remain with the selected partner.

## Launch checklist

- Confirm the official business name and final logo usage.
- Add the restaurant address, phone, public email, pickup hours and pickup instructions.
- Add the production domain to metadata, `robots.txt`, `sitemap.xml` and `llms.txt`.
- Add verified Instagram/Facebook links.
- Review all starter menu names, prices, serving sizes, availability, photos and descriptions.
- Add dietary/allergen notices appropriate to the actual kitchen.
- Set unique Lunch Box production admin credentials with `npx convex env set --prod`.
- Create the Lunch Box Square account and dedicated Square application.
- Confirm the exact Square reader model and choose the matching in-person SDK/API.
- Connect only the Lunch Box Square location, then test payments and signed webhooks end to end before enabling checkout.
- Review privacy, terms, refund and accessibility copy with the business owner/legal adviser.
- Deploy Convex and publish the public root from this repository.
- Deploy the admin source and its `dist/` Pages artifact from `reimage-demo/ADMIN-Lunchbox`.
