import type {
  CastVoteInput,
  Dispute,
  Escrow,
  Merchant,
  Order,
  Payment,
  ReputationProfile,
  ResolveDisputeInput,
  StartVotingInput,
  SubmitEvidenceInput,
  Evidence,
  WebhookEvent,
} from "@suitrustpay/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export interface DashboardSummary {
  merchant: Merchant;
  totalOrders: number;
  escrowedOrders: number;
  disputedOrders: number;
  escrowedVolume: string;
  orders: Order[];
  payments: Payment[];
  escrows: Escrow[];
  disputes: Dispute[];
  reputation: ReputationProfile[];
  webhooks: WebhookEvent[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${apiBaseUrl}/v1/dashboard/summary`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Failed to load dashboard");
  }
  return payload as DashboardSummary;
}

export async function createDemoOrder(amount: number): Promise<Order> {
  const response = await fetch(`${apiBaseUrl}/v1/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amount,
      currency: "USDC",
      protectionWindow: "24h",
      metadata: { source: "dashboard", category: "saas" },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Failed to create order");
  }
  return payload as Order;
}

export async function createTestnetDaoCase(): Promise<Dispute> {
  return post("/v1/dao/testnet-case", {});
}

export async function submitEvidence(input: SubmitEvidenceInput): Promise<Evidence> {
  return post("/v1/evidence", input);
}

export async function startVoting(input: StartVotingInput): Promise<Dispute> {
  return post("/v1/disputes/start-voting", input);
}

export async function castVote(input: CastVoteInput): Promise<Dispute> {
  return post("/v1/disputes/vote", input);
}

export async function resolveDispute(input: ResolveDisputeInput): Promise<Dispute> {
  return post("/v1/disputes/resolve", input);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed");
  }
  return payload as T;
}
