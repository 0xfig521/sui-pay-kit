import { zValidator } from "@hono/zod-validator";
import { buildPaymentIntent, chainEnvironmentFromEnv, createQuote, isQuoteExpired } from "@suitrustpay/chain";
import {
  confirmPaymentSchema,
  createDisputeSchema,
  createOrderSchema,
  quoteRequestSchema,
  submitEvidenceSchema,
  supportedTokens,
} from "@suitrustpay/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  confirmPayment,
  createDispute,
  createOrder,
  getOrder,
  getQuote,
  listDisputes,
  listEscrows,
  listOrders,
  listPayments,
  listReputationProfiles,
  listWebhookEvents,
  saveQuote,
  seedMerchant,
  submitEvidence,
} from "./store";

const app = new Hono();
const chainEnvironment = chainEnvironmentFromEnv(process.env);

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, service: "suitrustpay-api" }));

app.post("/v1/orders", zValidator("json", createOrderSchema), (c) => {
  const input = c.req.valid("json");
  return c.json(
    createOrder({
      amount: input.amount,
      merchantId: input.merchantId,
      protectionWindow: input.protectionWindow,
      metadata: input.metadata,
    }),
    201,
  );
});

app.get("/v1/orders", (c) => c.json(listOrders()));

app.get("/v1/orders/:id", (c) => {
  const order = getOrder(c.req.param("id"));
  if (!order) {
    return c.json({ message: "Order not found" }, 404);
  }
  return c.json(order);
});

app.post("/v1/quotes", zValidator("json", quoteRequestSchema), (c) => {
  const input = c.req.valid("json");
  const order = getOrder(input.orderId);
  if (!order) {
    return c.json({ message: "Order not found" }, 404);
  }
  if (order.status !== "pending") {
    return c.json({ message: `Order is ${order.status}` }, 409);
  }
  return c.json(saveQuote(createQuote(order, input)), 201);
});

app.post("/v1/payments/intent", zValidator("json", quoteRequestSchema), (c) => {
  const input = c.req.valid("json");
  const order = getOrder(input.orderId);
  if (!order) {
    return c.json({ message: "Order not found" }, 404);
  }
  const quote = saveQuote(createQuote(order, input));
  return c.json(
    buildPaymentIntent(order, quote, {
      ...chainEnvironment,
      payerAddress: input.payer ?? chainEnvironment.payerAddress,
    }),
    201,
  );
});

app.post("/v1/payments/confirm", zValidator("json", confirmPaymentSchema), (c) => {
  const input = c.req.valid("json");
  const quote = getQuote(input.quoteId);
  if (!quote) {
    return c.json({ message: "Quote not found" }, 404);
  }
  if (isQuoteExpired(quote)) {
    return c.json({ message: "Quote expired" }, 409);
  }
  return c.json(confirmPayment(input, quote), 201);
});

app.post("/v1/disputes", zValidator("json", createDisputeSchema), (c) => {
  try {
    return c.json(createDispute(c.req.valid("json")), 201);
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "Unable to create dispute" }, 400);
  }
});

app.get("/v1/disputes", (c) => c.json(listDisputes()));

app.post("/v1/evidence", zValidator("json", submitEvidenceSchema), (c) => {
  try {
    return c.json(submitEvidence(c.req.valid("json")), 201);
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "Unable to submit evidence" }, 400);
  }
});

app.get("/v1/checkout/config", (c) =>
  c.json({
    settlementCurrency: "USDC",
    supportedTokens,
    sponsoredTransactions: false,
    protectionWindows: ["15m", "1h", "24h", "72h"],
    protocolModules: [
      "Order Registry",
      "Escrow Vault",
      "Payment Registry",
      "Dispute Court",
      "Jury Pool",
      "Reputation Layer",
      "Settlement Executor",
    ],
    chain: {
      network: chainEnvironment.network,
      protocolPackageId: chainEnvironment.protocolPackageId,
      protocolConfigObjectId: chainEnvironment.protocolConfigObjectId,
      settlementCoinType: chainEnvironment.settlementCoinType,
      payerAddress: chainEnvironment.payerAddress,
    },
  }),
);

app.get("/v1/dashboard/summary", (c) => {
  const orders = listOrders();
  const payments = listPayments();
  const escrowedVolume = payments.reduce((total, payment) => total + Number(payment.settledAmount), 0);
  return c.json({
    merchant: seedMerchant,
    totalOrders: orders.length,
    escrowedOrders: orders.filter((order) => order.status === "escrowed").length,
    disputedOrders: orders.filter((order) => order.status === "disputed").length,
    escrowedVolume: escrowedVolume.toFixed(2),
    orders,
    payments,
    escrows: listEscrows(),
    disputes: listDisputes(),
    reputation: listReputationProfiles(),
    webhooks: listWebhookEvents(),
  });
});

const port = Number(process.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`SuiTrustPay API listening on ${server.url}`);
