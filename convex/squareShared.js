export const SQUARE_API_VERSION = "2026-08-19";

export function publicCheckoutRedirect(publicSiteUrl, payment, orderNumber) {
  const url = new URL("order-status.html", ensureTrailingSlash(publicSiteUrl));
  url.searchParams.set("payment", payment);
  url.searchParams.set("order", orderNumber);
  return url.toString();
}

export async function verifySquareSignature({
  body,
  notificationUrl,
  signature,
  signatureKey,
}) {
  if (!body || !notificationUrl || !signature || !signatureKey) return false;
  let signatureBytes;
  try {
    signatureBytes = Uint8Array.from(atob(signature), (character) =>
      character.charCodeAt(0),
    );
  } catch {
    return false;
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(notificationUrl + body),
  );
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
