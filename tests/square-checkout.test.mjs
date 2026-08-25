import assert from "node:assert/strict";
import test from "node:test";
import {
  publicCheckoutRedirect,
  SQUARE_API_VERSION,
  verifySquareSignature,
} from "../convex/squareShared.js";

test("Square API requests use the current pinned version", () => {
  assert.equal(SQUARE_API_VERSION, "2026-08-19");
});

test("checkout redirects remain on the configured public site", () => {
  const redirect = new URL(
    publicCheckoutRedirect(
      "https://reimage-demo.github.io/lunchbox",
      "success",
      "LB-20260825-ABC123&payment=failed",
    ),
  );
  assert.equal(redirect.origin, "https://reimage-demo.github.io");
  assert.equal(redirect.pathname, "/lunchbox/order-status.html");
  assert.equal(redirect.searchParams.get("payment"), "success");
  assert.equal(
    redirect.searchParams.get("order"),
    "LB-20260825-ABC123&payment=failed",
  );
});

test("Square webhook signatures cover the notification URL and raw body", async () => {
  const notificationUrl =
    "https://uncommon-bullfrog-641.convex.site/square-webhook";
  const signatureKey = "test-signature-key";
  const body = '{"type":"payment.updated"}';
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(notificationUrl + body),
  );
  const signature = Buffer.from(bytes).toString("base64");

  assert.equal(
    await verifySquareSignature({
      body,
      notificationUrl,
      signature,
      signatureKey,
    }),
    true,
  );
  assert.equal(
    await verifySquareSignature({
      body: `${body} `,
      notificationUrl,
      signature,
      signatureKey,
    }),
    false,
  );
});
