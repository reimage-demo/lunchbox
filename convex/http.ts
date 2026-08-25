import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifySquareSignature } from "./squareShared.js";

const http = httpRouter();

http.route({
  path: "/square-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
    const notificationUrl =
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ||
      `${process.env.CONVEX_SITE_URL}/square-webhook`;
    const valid = await verifySquareSignature({
      body,
      notificationUrl,
      signature,
      signatureKey,
    });
    if (!valid) return new Response("Invalid signature", { status: 403 });

    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (!["payment.created", "payment.updated"].includes(event?.type))
      return new Response("ok", { status: 200 });

    const payment = event?.data?.object?.payment;
    if (!payment?.id || !payment?.order_id || !payment?.location_id || !payment?.status)
      return new Response("ok", { status: 200 });
    await ctx.runMutation(internal.square.applyPaymentWebhook, {
      squareOrderId: payment.order_id,
      squarePaymentId: payment.id,
      locationId: payment.location_id,
      status: payment.status,
      ...(Number.isSafeInteger(payment.total_money?.amount)
        ? { amount: payment.total_money.amount }
        : {}),
      ...(typeof payment.total_money?.currency === "string"
        ? { currency: payment.total_money.currency }
        : {}),
    });
    return new Response("ok", { status: 200 });
  }),
});

export default http;
