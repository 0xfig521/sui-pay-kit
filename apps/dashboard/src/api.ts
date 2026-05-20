import type { Dispute, Escrow, Merchant, Order, Payment, ReputationProfile, WebhookEvent } from "@suitrustpay/shared";

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
