import {
  createId,
  type ConfirmPaymentInput,
  type CreateDisputeInput,
  type CastVoteInput,
  type Dispute,
  type Escrow,
  type Evidence,
  type Merchant,
  type Order,
  type Payment,
  type Quote,
  type ReputationProfile,
  type ResolveDisputeInput,
  type SubmitEvidenceInput,
  type StartVotingInput,
  type WebhookEvent,
} from "@suitrustpay/shared";

const checkoutBaseUrl = process.env.CHECKOUT_BASE_URL ?? "http://localhost:5173";

export const seedMerchant: Merchant = {
  id: "mch_demo",
  name: "SuiTrustPay Demo Merchant",
  walletAddress: "0x9f0f_demo_merchant_escrow_settlement_wallet",
  webhookUrl: "https://merchant.example/webhooks/suitrustpay",
  apiKeyPreview: "sk_live_...demo",
};

const orders = new Map<string, Order>();
const quotes = new Map<string, Quote>();
const payments = new Map<string, Payment>();
const escrows = new Map<string, Escrow>();
const disputes = new Map<string, Dispute>();
const webhooks = new Map<string, WebhookEvent>();

const protectionDurationsMs = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "72h": 72 * 60 * 60 * 1000,
};

export function createOrder(input: {
  amount: number;
  merchantId?: string;
  protectionWindow: "15m" | "1h" | "24h" | "72h";
  metadata: Record<string, string>;
}): Order {
  const id = createId("ord");
  const now = new Date();
  const protectionDeadline = new Date(now.getTime() + protectionDurationsMs[input.protectionWindow]);
  const order: Order = {
    id,
    merchantId: input.merchantId ?? seedMerchant.id,
    amount: input.amount.toFixed(2),
    settlementCurrency: "USDC",
    status: "pending",
    checkoutUrl: `${checkoutBaseUrl}/checkout/${id}`,
    protectionWindow: input.protectionWindow,
    protectionDeadline: protectionDeadline.toISOString(),
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
    metadata: input.metadata,
  };
  orders.set(id, order);
  return order;
}

export function listOrders(): Order[] {
  return [...orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id);
}

export function updateOrder(order: Order): Order {
  orders.set(order.id, order);
  return order;
}

export function saveQuote(quote: Quote): Quote {
  quotes.set(quote.id, quote);
  const order = getOrder(quote.orderId);
  if (order) {
    updateOrder({ ...order, quoteId: quote.id });
  }
  return quote;
}

export function getQuote(id: string): Quote | undefined {
  return quotes.get(id);
}

export function listPayments(): Payment[] {
  return [...payments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listEscrows(): Escrow[] {
  return [...escrows.values()].sort((a, b) => b.releaseTime.localeCompare(a.releaseTime));
}

export function listDisputes(): Dispute[] {
  return [...disputes.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function confirmPayment(input: ConfirmPaymentInput, quote: Quote): Payment {
  const order = getOrder(input.orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const payment: Payment = {
    id: createId("pay"),
    orderId: input.orderId,
    inputToken: quote.inputToken,
    inputAmount: quote.inputAmount,
    settledAmount: quote.targetAmount,
    txDigest: input.txDigest ?? `0x${createId("tx").replace("tx_", "")}`,
    payer: input.payer,
    createdAt: new Date().toISOString(),
  };

  payments.set(payment.id, payment);
  const escrow: Escrow = {
    id: createId("esc"),
    orderId: order.id,
    amountUsdc: quote.targetAmount,
    buyer: input.payer,
    merchant: seedMerchant.walletAddress,
    status: "locked",
    releaseTime: order.protectionDeadline,
  };
  escrows.set(escrow.id, escrow);
  updateOrder({
    ...order,
    status: "escrowed",
    txDigest: payment.txDigest,
    quoteId: quote.id,
    escrowId: escrow.id,
  });
  saveWebhookEvent("order.escrowed", order.id, order.amount);
  return payment;
}

export function createDispute(input: CreateDisputeInput): Dispute {
  const order = getOrder(input.orderId);
  if (!order || !order.escrowId) {
    throw new Error("Escrowed order not found");
  }
  const dispute: Dispute = {
    id: createId("dsp"),
    orderId: order.id,
    escrowId: order.escrowId,
    status: "evidence",
    reason: input.reason,
    refundVotes: 0,
    merchantVotes: 0,
    jury: [
      ...Array.from({ length: 5 }, (_, index) => ({
        address: `0xuser_juror_${index + 1}`,
        role: "buyer" as const,
        reputationScore: 82 - index,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        address: `0xmerchant_juror_${index + 1}`,
        role: "merchant" as const,
        reputationScore: 78 - index,
      })),
      { address: "0xneutral_juror_1", role: "neutral", reputationScore: 91 },
    ],
    evidence: [],
    createdAt: new Date().toISOString(),
  };
  disputes.set(dispute.id, dispute);
  escrows.set(order.escrowId, { ...escrows.get(order.escrowId)!, status: "disputed" });
  updateOrder({ ...order, status: "disputed" });
  saveWebhookEvent("order.disputed", order.id, order.amount);
  return dispute;
}

export function submitEvidence(input: SubmitEvidenceInput): Evidence {
  const dispute = disputes.get(input.disputeId);
  if (!dispute) {
    throw new Error("Dispute not found");
  }
  const evidence: Evidence = {
    id: createId("evd"),
    disputeId: input.disputeId,
    submitter: input.submitter,
    walrusBlobId: input.walrusBlobId,
    contentHash: input.contentHash,
    storageCost: input.storageCost,
    accepted: true,
    createdAt: new Date().toISOString(),
  };
  disputes.set(dispute.id, { ...dispute, evidence: [...dispute.evidence, evidence] });
  return evidence;
}

export function startVoting(input: StartVotingInput): Dispute {
  const dispute = disputes.get(input.disputeId);
  if (!dispute) {
    throw new Error("Dispute not found");
  }
  if (dispute.status !== "evidence") {
    throw new Error(`Dispute is ${dispute.status}`);
  }
  const updated = { ...dispute, status: "voting" as const };
  disputes.set(dispute.id, updated);
  return updated;
}

export function castVote(input: CastVoteInput): Dispute {
  const dispute = disputes.get(input.disputeId);
  if (!dispute) {
    throw new Error("Dispute not found");
  }
  if (dispute.status !== "voting") {
    throw new Error(`Dispute is ${dispute.status}`);
  }
  if (!dispute.jury.some((juror) => juror.address === input.juror)) {
    throw new Error("Juror is not assigned to this dispute");
  }
  const updated = {
    ...dispute,
    refundVotes: dispute.refundVotes + (input.vote === "refund" ? 1 : 0),
    merchantVotes: dispute.merchantVotes + (input.vote === "merchant" ? 1 : 0),
  };
  disputes.set(dispute.id, updated);
  return updated;
}

export function resolveDispute(input: ResolveDisputeInput): Dispute {
  const dispute = disputes.get(input.disputeId);
  if (!dispute) {
    throw new Error("Dispute not found");
  }
  if (dispute.status !== "voting") {
    throw new Error(`Dispute is ${dispute.status}`);
  }
  const order = getOrder(dispute.orderId);
  if (!order?.escrowId) {
    throw new Error("Escrowed order not found");
  }
  const refundWins = dispute.refundVotes > dispute.merchantVotes;
  const updated = { ...dispute, status: "resolved" as const };
  disputes.set(dispute.id, updated);
  escrows.set(order.escrowId, {
    ...escrows.get(order.escrowId)!,
    status: refundWins ? "refunded" : "released",
  });
  updateOrder({ ...order, status: refundWins ? "refunded" : "released" });
  saveWebhookEvent(refundWins ? "order.refunded" : "order.released", order.id, order.amount);
  return updated;
}

export function createTestnetDaoCase(): Dispute {
  const order = createOrder({
    amount: 3,
    protectionWindow: "15m",
    metadata: { source: "dao-court", caseType: "testnet-dispute" },
  });
  const payment: Payment = {
    id: createId("pay"),
    orderId: order.id,
    inputToken: "SUI",
    inputAmount: "0.714286",
    settledAmount: order.amount,
    txDigest: `0xtestnet_${createId("tx").replace("tx_", "")}`,
    payer: "0xbuyer_testnet_dao_case",
    createdAt: new Date().toISOString(),
  };
  const escrow: Escrow = {
    id: createId("esc"),
    orderId: order.id,
    amountUsdc: order.amount,
    buyer: payment.payer,
    merchant: seedMerchant.walletAddress,
    status: "disputed",
    releaseTime: order.protectionDeadline,
  };
  payments.set(payment.id, payment);
  escrows.set(escrow.id, escrow);
  updateOrder({
    ...order,
    status: "escrowed",
    txDigest: payment.txDigest,
    escrowId: escrow.id,
  });
  saveWebhookEvent("order.escrowed", order.id, order.amount);
  return createDispute({
    orderId: order.id,
    buyer: payment.payer,
    reason: "Buyer opened a refund proposal for an undelivered testnet service.",
  });
}

export function listReputationProfiles(): ReputationProfile[] {
  return [
    {
      owner: seedMerchant.walletAddress,
      role: "merchant",
      stake: "2500",
      totalOrders: orders.size,
      refundRate: 3.2,
      reputationScore: 94,
    },
    {
      owner: "0xcheckout_demo_payer",
      role: "buyer",
      stake: "0",
      totalOrders: payments.size,
      refundRate: 0,
      reputationScore: 88,
    },
    {
      owner: "0xneutral_juror_1",
      role: "juror",
      stake: "500",
      totalOrders: 41,
      refundRate: 0,
      majorityRate: 92,
      reputationScore: 91,
    },
  ];
}

export function saveWebhookEvent(type: WebhookEvent["type"], orderId: string, amount: string): WebhookEvent {
  const payload = `${type}:${orderId}:${amount}:USDC`;
  const event: WebhookEvent = {
    id: createId("evt"),
    type,
    orderId,
    amount,
    currency: "USDC",
    signature: signWebhookPayload(payload),
    delivered: false,
    createdAt: new Date().toISOString(),
  };
  webhooks.set(event.id, event);
  return event;
}

export function listWebhookEvents(): WebhookEvent[] {
  return [...webhooks.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function signWebhookPayload(payload: string): string {
  const secret = process.env.WEBHOOK_SECRET ?? "dev_webhook_secret";
  const data = new TextEncoder().encode(`${payload}:${secret}`);
  return Array.from(new Bun.CryptoHasher("sha256").update(data).digest("hex")).join("");
}

createOrder({ amount: 10, protectionWindow: "15m", metadata: { plan: "ai-api" } });
createOrder({ amount: 49, protectionWindow: "24h", metadata: { plan: "saas" } });
