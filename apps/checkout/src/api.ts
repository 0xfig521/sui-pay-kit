import type {
  ConfirmPaymentInput,
  Order,
  Payment,
  PaymentIntent,
  Quote,
  QuoteRequest,
  TokenSymbol,
} from "@suitrustpay/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export async function getCheckoutConfig(): Promise<{
  settlementCurrency: "USDC";
  supportedTokens: TokenSymbol[];
  sponsoredTransactions: boolean;
  protectionWindows: string[];
  protocolModules: string[];
}> {
  return get("/v1/checkout/config");
}

export async function getOrder(orderId: string): Promise<Order> {
  return get(`/v1/orders/${orderId}`);
}

export async function createQuote(input: QuoteRequest): Promise<Quote> {
  return post("/v1/quotes", input);
}

export async function createPaymentIntent(input: QuoteRequest): Promise<PaymentIntent> {
  return post("/v1/payments/intent", input);
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<Payment> {
  return post("/v1/payments/confirm", input);
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  return parse<T>(response);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse<T>(response);
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed");
  }
  return payload as T;
}
