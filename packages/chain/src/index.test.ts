import { describe, expect, test } from "bun:test";
import type { Order, Quote } from "@suitrustpay/shared";
import { buildPaymentIntent, decodeTransactionJson } from "./index";

const order: Order = {
  id: "ord_test",
  merchantId: "mch_test",
  amount: "10.00",
  settlementCurrency: "USDC",
  status: "pending",
  checkoutUrl: "http://localhost:5173/checkout/ord_test",
  protectionWindow: "24h",
  protectionDeadline: "2026-05-19T00:00:00.000Z",
  expiresAt: "2026-05-18T00:30:00.000Z",
  createdAt: "2026-05-18T00:00:00.000Z",
  metadata: { sku: "test" },
};

const quote: Quote = {
  id: "qt_test",
  orderId: "ord_test",
  inputToken: "USDC",
  targetToken: "USDC",
  inputAmount: "10.000000",
  targetAmount: "10.00",
  minimumOutput: "9.95",
  slippageBps: 50,
  route: ["USDC", "Escrow Vault"],
  expiresAt: "2026-05-18T00:02:00.000Z",
  gasSponsored: true,
};

describe("SuiTrustPay PTB builder", () => {
  test("builds create_order and lock_escrow Move calls", () => {
    const intent = buildPaymentIntent(order, quote);
    const decoded = decodeTransactionJson(intent.transactionBytes) as {
      transactions: Array<{ kind: string; target: string; typeArguments: string[] }>;
    };

    expect(intent.transactionKind).toBe("sui-transaction-json");
    expect(intent.moveCalls).toEqual([
      "0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547::trust_protocol::create_order",
      "0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547::trust_protocol::lock_escrow<0x2::sui::SUI>",
    ]);
    expect(decoded.transactions.map((transaction) => transaction.kind)).toEqual([
      "MoveCall",
      "SplitCoins",
      "MoveCall",
      "TransferObjects",
    ]);
    expect(decoded.transactions[0]?.target).toContain("trust_protocol::create_order");
    expect(decoded.transactions[2]?.target).toContain("trust_protocol::lock_escrow");
    expect(decoded.transactions[2]?.typeArguments).toEqual(["0x2::sui::SUI"]);
  });
});
