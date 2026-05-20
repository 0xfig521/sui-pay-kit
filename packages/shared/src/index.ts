import { z } from "zod";

export const orderStatusSchema = z.enum([
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

export const tokenSymbolSchema = z.enum(["SUI", "USDC", "WAL", "CETUS", "DEEP", "NS"]);

export const protectionWindowSchema = z.enum(["15m", "1h", "24h", "72h"]);

export const disputeStatusSchema = z.enum(["proposed", "evidence", "voting", "resolved"]);

export const jurorRoleSchema = z.enum(["buyer", "merchant", "neutral"]);

export const merchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  walletAddress: z.string(),
  webhookUrl: z.string().url().optional(),
  apiKeyPreview: z.string(),
});

export const createOrderSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.literal("USDC").default("USDC"),
  protectionWindow: protectionWindowSchema.default("24h"),
  merchantId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).default({}),
});

export const orderSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  amount: z.string(),
  settlementCurrency: z.literal("USDC"),
  status: orderStatusSchema,
  checkoutUrl: z.string().url(),
  protectionWindow: protectionWindowSchema,
  protectionDeadline: z.string(),
  escrowId: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
  txDigest: z.string().optional(),
  quoteId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).default({}),
});

export const quoteRequestSchema = z.object({
  orderId: z.string(),
  inputToken: tokenSymbolSchema,
  slippageBps: z.number().int().min(1).max(1000).default(50),
  payer: z.string().optional(),
});

export const quoteSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  inputToken: tokenSymbolSchema,
  targetToken: z.literal("USDC"),
  inputAmount: z.string(),
  targetAmount: z.string(),
  minimumOutput: z.string(),
  slippageBps: z.number(),
  route: z.array(z.string()),
  expiresAt: z.string(),
  gasSponsored: z.boolean(),
});

export const paymentIntentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  quoteId: z.string(),
  sponsored: z.boolean(),
  ptbKind: z.literal("swap-escrow-receipt"),
  steps: z.array(z.string()),
  transactionBytes: z.string(),
  transactionKind: z.literal("sui-transaction-json").default("sui-transaction-json"),
  moveCalls: z.array(z.string()).default([]),
});

export const confirmPaymentSchema = z.object({
  orderId: z.string(),
  quoteId: z.string(),
  payer: z.string(),
  txDigest: z.string().optional(),
});

export const paymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  inputToken: tokenSymbolSchema,
  inputAmount: z.string(),
  settledAmount: z.string(),
  txDigest: z.string(),
  payer: z.string(),
  createdAt: z.string(),
});

export const escrowSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  amountUsdc: z.string(),
  buyer: z.string(),
  merchant: z.string(),
  status: z.enum(["locked", "released", "refunded", "disputed"]),
  releaseTime: z.string(),
});

export const evidenceSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  submitter: z.string(),
  walrusBlobId: z.string(),
  contentHash: z.string(),
  storageCost: z.string(),
  accepted: z.boolean(),
  createdAt: z.string(),
});

export const disputeSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  escrowId: z.string(),
  status: disputeStatusSchema,
  reason: z.string(),
  refundVotes: z.number(),
  merchantVotes: z.number(),
  jury: z.array(
    z.object({
      address: z.string(),
      role: jurorRoleSchema,
      reputationScore: z.number(),
    }),
  ),
  evidence: z.array(evidenceSchema),
  createdAt: z.string(),
});

export const createDisputeSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(8),
  buyer: z.string(),
});

export const submitEvidenceSchema = z.object({
  disputeId: z.string(),
  submitter: z.string(),
  walrusBlobId: z.string(),
  contentHash: z.string(),
  storageCost: z.string(),
});

export const reputationProfileSchema = z.object({
  owner: z.string(),
  role: z.enum(["merchant", "buyer", "juror"]),
  stake: z.string(),
  totalOrders: z.number(),
  refundRate: z.number(),
  majorityRate: z.number().optional(),
  reputationScore: z.number(),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.enum(["order.escrowed", "order.disputed", "order.refunded", "order.released"]),
  orderId: z.string(),
  amount: z.string(),
  currency: z.literal("USDC"),
  signature: z.string(),
  delivered: z.boolean(),
  createdAt: z.string(),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type TokenSymbol = z.infer<typeof tokenSymbolSchema>;
export type Merchant = z.infer<typeof merchantSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type Order = z.infer<typeof orderSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Escrow = z.infer<typeof escrowSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Dispute = z.infer<typeof disputeSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type SubmitEvidenceInput = z.infer<typeof submitEvidenceSchema>;
export type ReputationProfile = z.infer<typeof reputationProfileSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

export const supportedTokens: TokenSymbol[] = ["SUI", "USDC", "WAL", "CETUS", "DEEP", "NS"];

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}
