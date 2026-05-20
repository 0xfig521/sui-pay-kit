import { jsonb, numeric, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "pending",
  "escrowed",
  "released",
  "disputed",
  "evidence",
  "voting",
  "refunded",
  "failed",
  "expired",
]);

export const escrowStatus = pgEnum("escrow_status", ["locked", "released", "refunded", "disputed"]);
export const disputeStatus = pgEnum("dispute_status", ["proposed", "evidence", "voting", "resolved"]);

export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  walletAddress: text("wallet_address").notNull(),
  webhookUrl: text("webhook_url"),
  apiKeyHash: text("api_key_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id")
    .notNull()
    .references(() => merchants.id),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  settlementCurrency: text("settlement_currency").default("USDC").notNull(),
  status: orderStatus("status").default("pending").notNull(),
  txDigest: text("tx_digest"),
  quoteId: text("quote_id"),
  protectionWindow: text("protection_window").default("24h").notNull(),
  protectionDeadline: timestamp("protection_deadline", { withTimezone: true }).notNull(),
  escrowId: text("escrow_id"),
  metadata: jsonb("metadata").$type<Record<string, string>>().default({}).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const escrows = pgTable("escrows", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  amountUsdc: numeric("amount_usdc", { precision: 18, scale: 6 }).notNull(),
  buyer: text("buyer").notNull(),
  merchant: text("merchant").notNull(),
  status: escrowStatus("status").default("locked").notNull(),
  releaseTime: timestamp("release_time", { withTimezone: true }).notNull(),
});

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  escrowId: text("escrow_id")
    .notNull()
    .references(() => escrows.id),
  status: disputeStatus("status").default("evidence").notNull(),
  reason: text("reason").notNull(),
  refundVotes: numeric("refund_votes", { precision: 18, scale: 0 }).default("0").notNull(),
  merchantVotes: numeric("merchant_votes", { precision: 18, scale: 0 }).default("0").notNull(),
  jury: jsonb("jury").$type<Array<{ address: string; role: string; reputationScore: number }>>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(),
  disputeId: text("dispute_id")
    .notNull()
    .references(() => disputes.id),
  submitter: text("submitter").notNull(),
  walrusBlobId: text("walrus_blob_id").notNull(),
  contentHash: text("content_hash").notNull(),
  storageCost: numeric("storage_cost", { precision: 18, scale: 6 }).notNull(),
  accepted: text("accepted").default("true").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  route: jsonb("route").$type<string[]>().notNull(),
  inputToken: text("input_token").notNull(),
  inputAmount: numeric("input_amount", { precision: 30, scale: 12 }).notNull(),
  slippageBps: text("slippage_bps").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  inputToken: text("input_token").notNull(),
  inputAmount: numeric("input_amount", { precision: 30, scale: 12 }).notNull(),
  settledAmount: numeric("settled_amount", { precision: 18, scale: 6 }).notNull(),
  txDigest: text("tx_digest").notNull(),
  payer: text("payer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
