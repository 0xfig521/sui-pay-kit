import { Transaction } from "@mysten/sui/transactions";
import {
  createId,
  type Order,
  type PaymentIntent,
  type Quote,
  type QuoteRequest,
  type TokenSymbol,
} from "@suitrustpay/shared";

const tokenRates: Record<TokenSymbol, number> = {
  USDC: 1,
  SUI: 4.2,
  WAL: 0.48,
  CETUS: 0.12,
  DEEP: 0.08,
  NS: 0.7,
};

export interface ChainEnvironment {
  network: "testnet" | "mainnet";
  protocolPackageId: string;
  protocolConfigObjectId: string;
  merchantWallet: string;
  paymentRegistryPackageId?: string;
  disputeCourtPackageId?: string;
  settlementCoinType: string;
  settlementCoinObjectId?: string;
  payerAddress: string;
}

export const defaultChainEnvironment: ChainEnvironment = {
  network: "testnet",
  protocolPackageId: "0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547",
  protocolConfigObjectId: "0xc157aa52e56e8cb4c6bf685d0efe20266f3a1c424d241cbb5961d504540cfb9a",
  merchantWallet: "0x366c943c11a541396fe586f8179a6fd1c237064b9bfd44cb7efd7255dad91314",
  disputeCourtPackageId: "0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547",
  settlementCoinType: "0x2::sui::SUI",
  payerAddress: "0x366c943c11a541396fe586f8179a6fd1c237064b9bfd44cb7efd7255dad91314",
};

export function chainEnvironmentFromEnv(env: Record<string, string | undefined>): ChainEnvironment {
  return {
    network: env.SUI_NETWORK === "mainnet" ? "mainnet" : defaultChainEnvironment.network,
    protocolPackageId: env.SUI_PROTOCOL_PACKAGE_ID ?? defaultChainEnvironment.protocolPackageId,
    protocolConfigObjectId: env.SUI_PROTOCOL_CONFIG_OBJECT_ID ?? defaultChainEnvironment.protocolConfigObjectId,
    merchantWallet: env.SUI_MERCHANT_WALLET ?? defaultChainEnvironment.merchantWallet,
    paymentRegistryPackageId: env.SUI_PAYMENT_REGISTRY_PACKAGE_ID ?? defaultChainEnvironment.paymentRegistryPackageId,
    disputeCourtPackageId: env.SUI_DISPUTE_COURT_PACKAGE_ID ?? defaultChainEnvironment.disputeCourtPackageId,
    settlementCoinType: env.SUI_SETTLEMENT_COIN_TYPE ?? defaultChainEnvironment.settlementCoinType,
    settlementCoinObjectId: env.SUI_SETTLEMENT_COIN_OBJECT_ID ?? defaultChainEnvironment.settlementCoinObjectId,
    payerAddress: env.SUI_PAYER_ADDRESS ?? defaultChainEnvironment.payerAddress,
  };
}

export function createQuote(order: Order, request: QuoteRequest): Quote {
  const amount = Number(order.amount);
  const inputAmount = amount / tokenRates[request.inputToken];
  const minimumOutput = amount * (1 - request.slippageBps / 10_000);

  return {
    id: createId("qt"),
    orderId: order.id,
    inputToken: request.inputToken,
    targetToken: "USDC",
    inputAmount: inputAmount.toFixed(6),
    targetAmount: amount.toFixed(2),
    minimumOutput: minimumOutput.toFixed(2),
    slippageBps: request.slippageBps,
    route:
      request.inputToken === "USDC"
        ? ["USDC", "Escrow Vault"]
        : [request.inputToken, "Aftermath Router", "USDC", "Escrow Vault"],
    expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    gasSponsored: false,
  };
}

export function buildPaymentIntent(order: Order, quote: Quote, env = defaultChainEnvironment): PaymentIntent {
  const tx = buildEscrowTransaction(order, quote, env);
  const moveCalls = [
    `${env.protocolPackageId}::trust_protocol::create_order`,
    `${env.protocolPackageId}::trust_protocol::lock_escrow<${env.settlementCoinType}>`,
  ];

  const steps = [
    `take ${quote.inputAmount} ${quote.inputToken}`,
    quote.inputToken === "USDC" ? "skip swap" : "swap through Aftermath Router to USDC",
    `call trust_protocol::create_order for ${quote.targetAmount} USDC`,
    `call trust_protocol::lock_escrow<${env.settlementCoinType}> with settlement coin`,
    `set protection deadline from ${order.protectionWindow}`,
    "register payment for duplicate protection",
    "create Escrow<Coin<USDC>> custody object",
    "index order for dispute and reputation layers",
    "wallet signs and executes on Sui testnet",
  ];

  return {
    id: createId("pi"),
    orderId: order.id,
    quoteId: quote.id,
    sponsored: false,
    ptbKind: "swap-escrow-receipt",
    steps,
    transactionBytes: Buffer.from(tx.serialize()).toString("base64"),
    transactionKind: "sui-transaction-json",
    moveCalls,
  };
}

export function isQuoteExpired(quote: Quote): boolean {
  return Date.parse(quote.expiresAt) <= Date.now();
}

export function buildEscrowTransaction(order: Order, quote: Quote, env = defaultChainEnvironment): Transaction {
  const tx = new Transaction();
  const amountAtomic = usdcToAtomicUnits(quote.targetAmount);

  tx.setSenderIfNotSet(env.payerAddress);

  const createdOrder = tx.moveCall({
    target: `${env.protocolPackageId}::trust_protocol::create_order`,
    arguments: [
      tx.object(env.protocolConfigObjectId),
      tx.pure.address(env.merchantWallet),
      tx.pure.u64(amountAtomic),
      tx.pure.vector("u8", metadataHashBytes(order)),
      tx.pure.u64(protectionWindowMs(order.protectionWindow)),
      tx.object.clock(),
    ],
  });

  const settlementSource =
    env.settlementCoinObjectId && env.settlementCoinObjectId !== "gas"
      ? tx.object(env.settlementCoinObjectId)
      : tx.gas;

  const [settlementCoin] = tx.splitCoins(settlementSource, [tx.pure.u64(amountAtomic)]);

  const escrow = tx.moveCall({
    target: `${env.protocolPackageId}::trust_protocol::lock_escrow`,
    typeArguments: [env.settlementCoinType],
    arguments: [createdOrder, settlementCoin, tx.pure.address(env.payerAddress)],
  });

  tx.transferObjects([createdOrder, escrow], tx.pure.address(env.payerAddress));

  return tx;
}

export function decodeTransactionJson(transactionBytes: string): unknown {
  return JSON.parse(Buffer.from(transactionBytes, "base64").toString("utf8"));
}

function usdcToAtomicUnits(amount: string): string {
  const [wholePart, rawFraction = ""] = amount.split(".");
  const fraction = rawFraction.padEnd(6, "0").slice(0, 6);
  return (BigInt(wholePart) * 1_000_000n + BigInt(fraction)).toString();
}

function protectionWindowMs(window: Order["protectionWindow"]): string {
  switch (window) {
    case "15m":
      return String(15 * 60 * 1000);
    case "1h":
      return String(60 * 60 * 1000);
    case "24h":
      return String(24 * 60 * 60 * 1000);
    case "72h":
      return String(72 * 60 * 60 * 1000);
  }
}

function metadataHashBytes(order: Order): number[] {
  const metadata = JSON.stringify({
    orderId: order.id,
    merchantId: order.merchantId,
    metadata: order.metadata,
  });
  const bytes = new TextEncoder().encode(metadata);
  return Array.from(bytes.slice(0, 32));
}
