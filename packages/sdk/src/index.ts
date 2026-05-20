import {
  createOrderSchema,
  createDisputeSchema,
  disputeSchema,
  orderSchema,
  quoteRequestSchema,
  quoteSchema,
  submitEvidenceSchema,
  evidenceSchema,
  type CreateDisputeInput,
  type CreateOrderInput,
  type Dispute,
  type Evidence,
  type Order,
  type Quote,
  type QuoteRequest,
  type SubmitEvidenceInput,
} from "@suitrustpay/shared";

export interface TrustPayOptions {
  apiKey: string;
  baseUrl?: string;
}

export class TrustPay {
  readonly orders: {
    create: (input: CreateOrderInput) => Promise<Order>;
    retrieve: (id: string) => Promise<Order>;
  };

  readonly quotes: {
    create: (input: QuoteRequest) => Promise<Quote>;
  };

  readonly disputes: {
    create: (input: CreateDisputeInput) => Promise<Dispute>;
    submitEvidence: (input: SubmitEvidenceInput) => Promise<Evidence>;
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: TrustPayOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "http://localhost:8787";
    this.orders = {
      create: (input) => this.post("/v1/orders", createOrderSchema.parse(input), orderSchema),
      retrieve: (id) => this.get(`/v1/orders/${id}`, orderSchema),
    };
    this.quotes = {
      create: (input) => this.post("/v1/quotes", quoteRequestSchema.parse(input), quoteSchema),
    };
    this.disputes = {
      create: (input) => this.post("/v1/disputes", createDisputeSchema.parse(input), disputeSchema),
      submitEvidence: (input) => this.post("/v1/evidence", submitEvidenceSchema.parse(input), evidenceSchema),
    };
  }

  private async get<T>(path: string, schema: { parse: (value: unknown) => T }): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(),
    });
    return this.parseResponse(response, schema);
  }

  private async post<T>(
    path: string,
    body: unknown,
    schema: { parse: (value: unknown) => T },
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...this.headers(),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return this.parseResponse(response, schema);
  }

  private headers(): HeadersInit {
    return {
      authorization: `Bearer ${this.apiKey}`,
      "x-suitrustpay-version": "2026-05-mvp",
    };
  }

  private async parseResponse<T>(
    response: Response,
    schema: { parse: (value: unknown) => T },
  ): Promise<T> {
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message ?? `TrustPay request failed with ${response.status}`);
    }
    return schema.parse(payload);
  }
}

export { TrustPay as SuiTrustPay };
