import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Panel } from "@suitrustpay/ui";
import type { TokenSymbol } from "@suitrustpay/shared";
import {
  confirmPayment,
  createPaymentIntent,
  createQuote,
  getCheckoutConfig,
  getOrder,
} from "./api";
import { useCheckoutStore } from "./store";

function orderIdFromPath(): string {
  const [, maybeCheckout, id] = window.location.pathname.split("/");
  if (maybeCheckout === "checkout" && id) {
    return id;
  }
  return "ord_demo";
}

export function App() {
  const orderId = orderIdFromPath();
  const account = useCurrentAccount();
  const selectedToken = useCheckoutStore((state) => state.selectedToken);
  const setSelectedToken = useCheckoutStore((state) => state.setSelectedToken);
  const signAndExecute = useSignAndExecuteTransaction();

  const configQuery = useQuery({ queryKey: ["checkout-config"], queryFn: getCheckoutConfig });
  const orderQuery = useQuery({ queryKey: ["order", orderId], queryFn: () => getOrder(orderId), retry: false });
  const quoteQuery = useQuery({
    queryKey: ["quote", orderId, selectedToken],
    queryFn: () => createQuote({ orderId, inputToken: selectedToken, slippageBps: 50 }),
    enabled: orderQuery.isSuccess,
  });
  const intentMutation = useMutation({
    mutationFn: () => createPaymentIntent({ orderId, inputToken: selectedToken, slippageBps: 50, payer: account?.address }),
  });
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!account?.address) {
        throw new Error("Connect a Sui testnet wallet before locking escrow.");
      }
      const intent = await intentMutation.mutateAsync();
      const result = await signAndExecute.mutateAsync({
        transaction: decodeTransactionJson(intent.transactionBytes),
        chain: "sui:testnet",
      });
      return confirmPayment({
        orderId,
        quoteId: intent.quoteId,
        payer: account.address,
        txDigest: result.digest,
      });
    },
  });

  const order = orderQuery.data;
  const quote = quoteQuery.data;
  const isEscrowed = confirmMutation.data || order?.status === "escrowed";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <p className="text-sm font-semibold uppercase tracking-normal text-sky-700">SuiTrustPay Protected Checkout</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Pay into escrow. Trade with public protection.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Your token is swapped to USDC, locked in Sui escrow, protected by a refund window, and reviewable by DAO jurors if a dispute opens.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">Universal token payment</div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">Escrow protection window</div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">Walrus evidence and DAO court</div>
          </div>
        </section>

        <Panel className="p-0">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Order</p>
                <p className="font-mono text-sm font-medium">{order?.id ?? orderId}</p>
              </div>
              <ConnectButton />
            </div>
          </div>

          <div className="space-y-5 p-5">
            {orderQuery.isError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Order not found. Create one from the API or dashboard first.
              </div>
            ) : null}

            <div className="rounded-lg bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Total due</p>
              <p className="mt-2 text-4xl font-semibold">{order?.amount ?? "0.00"} USDC</p>
              <p className="mt-3 text-sm text-slate-300">
                Funds lock in escrow until {order?.protectionWindow ?? "24h"} protection expires.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="font-medium">1. Pay</p>
                <p className="mt-1 text-slate-500">Swap to USDC</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="font-medium">2. Protect</p>
                <p className="mt-1 text-slate-500">Escrow window</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="font-medium">3. Resolve</p>
                <p className="mt-1 text-slate-500">Settle or dispute</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Pay with</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(configQuery.data?.supportedTokens ?? ["SUI", "USDC", "WAL", "CETUS", "DEEP", "NS"]).map((token) => (
                  <button
                    key={token}
                    className={`rounded-md border px-3 py-2 text-sm font-medium ${
                      selectedToken === token
                        ? "border-sky-500 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    onClick={() => setSelectedToken(token as TokenSymbol)}
                    type="button"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Quote</span>
                <span className="text-sm font-medium text-emerald-700">
                  {quote?.gasSponsored ? "Gas sponsored" : "Wallet gas on testnet"}
                </span>
              </div>
              <p className="mt-3 text-xl font-semibold">
                {quote ? `${quote.inputAmount} ${quote.inputToken}` : "Getting route..."}
              </p>
              <p className="mt-2 text-sm text-slate-600">{quote?.route.join(" -> ")}</p>
              <p className="mt-2 text-xs text-slate-500">Minimum output: {quote?.minimumOutput ?? "--"} USDC</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium">Trust guarantees</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Order status, escrow, dispute state, and votes are designed as on-chain objects.</li>
                <li>Evidence is stored in Walrus; blob ID and content hash are recorded on-chain.</li>
                <li>Invalid refund attempts and merchant misconduct both affect public reputation.</li>
              </ul>
            </div>

            {intentMutation.data ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium">PTB preview</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-600">
                  {intentMutation.data.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={!order || !account || confirmMutation.isPending || signAndExecute.isPending || Boolean(isEscrowed)}
              onClick={() => confirmMutation.mutate()}
            >
              {isEscrowed
                ? "Funds escrowed"
                : confirmMutation.isPending || signAndExecute.isPending
                  ? "Signing escrow transaction..."
                  : account
                    ? "Pay and lock escrow"
                    : "Connect wallet to pay"}
            </Button>

            {confirmMutation.data ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Escrow created on Sui: {confirmMutation.data.txDigest}
              </div>
            ) : null}

            {confirmMutation.error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {confirmMutation.error.message}
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function decodeTransactionJson(transactionBytes: string): string {
  return atob(transactionBytes);
}
