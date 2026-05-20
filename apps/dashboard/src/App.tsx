import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Panel, Stat } from "@suitrustpay/ui";
import { useState } from "react";
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  Gavel,
  KeyRound,
  Link2,
  Scale,
  ShieldCheck,
  WalletCards,
  Webhook,
} from "lucide-react";
import { castVote, createDemoOrder, getDashboardSummary, resolveDispute, startVoting, submitEvidence } from "./api";

export function App() {
  const queryClient = useQueryClient();
  const [evidenceByDispute, setEvidenceByDispute] = useState<Record<string, string>>({});
  const summaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: getDashboardSummary });
  const refreshSummary = () => queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  const createOrderMutation = useMutation({
    mutationFn: () => createDemoOrder(25),
    onSuccess: refreshSummary,
  });
  const evidenceMutation = useMutation({
    mutationFn: (disputeId: string) =>
      submitEvidence({
        disputeId,
        submitter: summary?.merchant.walletAddress ?? "0xmerchant_demo",
        walrusBlobId: evidenceByDispute[disputeId] || `walrus_demo_${disputeId}`,
        contentHash: `sha256_${disputeId}`,
        storageCost: "1000",
      }),
    onSuccess: refreshSummary,
  });
  const startVotingMutation = useMutation({
    mutationFn: (disputeId: string) => startVoting({ disputeId }),
    onSuccess: refreshSummary,
  });
  const voteMutation = useMutation({
    mutationFn: ({ disputeId, vote }: { disputeId: string; vote: "refund" | "merchant" }) =>
      castVote({ disputeId, juror: "0xneutral_juror_1", vote }),
    onSuccess: refreshSummary,
  });
  const resolveMutation = useMutation({
    mutationFn: (disputeId: string) => resolveDispute({ disputeId }),
    onSuccess: refreshSummary,
  });
  const summary = summaryQuery.data;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex max-w-7xl gap-6 px-5 py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                ST
              </div>
              <div>
                <p className="font-semibold">SuiTrustPay</p>
                <p className="text-sm text-slate-500">Trust Protocol Console</p>
              </div>
            </div>
            <nav className="mt-8 space-y-1 text-sm">
              {["Overview", "Orders", "Escrow", "Disputes", "Reputation", "Webhooks", "Developers"].map((item) => (
                <a className="flex rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-white" href={`#${item.toLowerCase()}`} key={item}>
                  {item}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-semibold">Trusted Commerce</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Escrow, DAO arbitration, Walrus evidence, and USDC settlement for merchants that do not want to manage Web3 primitives.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 hover:bg-slate-50"
                href="http://localhost:5180"
              >
                Checkout home
              </a>
              <a
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 hover:bg-slate-50"
                href="/docs"
              >
                Docs
              </a>
              <Button disabled={createOrderMutation.isPending} onClick={() => createOrderMutation.mutate()}>
                Create protected order
              </Button>
            </div>
          </header>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Stat label="Escrowed volume" tone="success" value={`$${summary?.escrowedVolume ?? "0.00"}`} />
            <Stat label="Escrowed orders" value={summary?.escrowedOrders ?? 0} />
            <Stat label="Open disputes" tone="warning" value={summary?.disputedOrders ?? 0} />
            <Stat label="Total orders" value={summary?.totalOrders ?? 0} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            <Panel id="orders">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Protected orders</h2>
                  <p className="mt-1 text-sm text-slate-500">Every checkout resolves into an on-chain order and escrow object.</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                    <tr>
                      <th className="py-3">Order</th>
                      <th className="py-3">Amount</th>
                      <th className="py-3">Protection</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Checkout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(summary?.orders ?? []).map((order) => (
                      <tr key={order.id}>
                        <td className="py-3 font-mono text-xs">{order.id}</td>
                        <td className="py-3">{order.amount} USDC</td>
                        <td className="py-3">{order.protectionWindow}</td>
                        <td className="py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <a className="inline-flex items-center gap-1 text-sky-700" href={order.checkoutUrl}>
                            Open <ExternalLink size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="space-y-6">
              <Panel id="developers">
                <div className="flex items-center gap-3">
                  <KeyRound size={20} />
                  <h2 className="text-lg font-semibold">API key</h2>
                </div>
                <div className="mt-4 rounded-md bg-slate-950 p-3 font-mono text-sm text-white">
                  {summary?.merchant.apiKeyPreview ?? "sk_live_..."}
                </div>
                <Button className="mt-4 w-full" variant="secondary">
                  <Copy size={16} /> Copy SDK snippet
                </Button>
              </Panel>

              <Panel>
                <div className="flex items-center gap-3">
                  <WalletCards size={20} />
                  <h2 className="text-lg font-semibold">Settlement wallet</h2>
                </div>
                <p className="mt-3 break-all font-mono text-sm text-slate-600">
                  {summary?.merchant.walletAddress ?? "0x..."}
                </p>
              </Panel>

              <Panel id="reputation">
                <div className="flex items-center gap-3">
                  <BadgeCheck size={20} />
                  <h2 className="text-lg font-semibold">Reputation</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {(summary?.reputation ?? []).map((profile) => (
                    <div className="rounded-md border border-slate-200 p-3 text-sm" key={`${profile.role}-${profile.owner}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{profile.role}</span>
                        <span className="font-semibold">{profile.reputationScore}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-slate-500">{profile.owner}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel id="escrow">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} />
                <h2 className="text-lg font-semibold">Escrow vault</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {(summary?.escrows ?? []).map((escrow) => (
                  <div className="rounded-md border border-slate-200 p-4 text-sm" key={escrow.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs">{escrow.id}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{escrow.status}</span>
                    </div>
                    <p className="mt-2">{escrow.amountUsdc} USDC locked until {new Date(escrow.releaseTime).toLocaleString()}</p>
                  </div>
                ))}
                {summary?.escrows.length === 0 ? <p className="text-sm text-slate-500">No escrowed funds yet.</p> : null}
              </div>
            </Panel>

            <Panel id="disputes">
              <div className="flex items-center gap-3">
                <Gavel size={20} />
                <h2 className="text-lg font-semibold">DAO court</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {(summary?.disputes ?? []).map((dispute) => (
                  <div className="rounded-md border border-slate-200 p-4 text-sm" key={dispute.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs">{dispute.id}</span>
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">{dispute.status}</span>
                    </div>
                    <p className="mt-2 text-slate-600">{dispute.reason}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-slate-50 p-2">
                        <p className="text-slate-500">Evidence</p>
                        <p className="mt-1 font-semibold">{dispute.evidence.length}</p>
                      </div>
                      <div className="rounded-md bg-emerald-50 p-2">
                        <p className="text-emerald-700">Refund</p>
                        <p className="mt-1 font-semibold">{dispute.refundVotes}</p>
                      </div>
                      <div className="rounded-md bg-sky-50 p-2">
                        <p className="text-sky-700">Merchant</p>
                        <p className="mt-1 font-semibold">{dispute.merchantVotes}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Jury: 5 buyers, 5 merchants, 1 neutral</p>

                    {dispute.status === "evidence" ? (
                      <div className="mt-3 space-y-2">
                        <input
                          className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                          onChange={(event) =>
                            setEvidenceByDispute((current) => ({ ...current, [dispute.id]: event.target.value }))
                          }
                          placeholder="Walrus blob ID"
                          value={evidenceByDispute[dispute.id] ?? ""}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            disabled={evidenceMutation.isPending}
                            onClick={() => evidenceMutation.mutate(dispute.id)}
                            variant="secondary"
                          >
                            Submit evidence
                          </Button>
                          <Button
                            disabled={startVotingMutation.isPending || dispute.evidence.length === 0}
                            onClick={() => startVotingMutation.mutate(dispute.id)}
                          >
                            Start voting
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {dispute.status === "voting" ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <Button
                          disabled={voteMutation.isPending}
                          onClick={() => voteMutation.mutate({ disputeId: dispute.id, vote: "refund" })}
                          variant="secondary"
                        >
                          Vote refund
                        </Button>
                        <Button
                          disabled={voteMutation.isPending}
                          onClick={() => voteMutation.mutate({ disputeId: dispute.id, vote: "merchant" })}
                          variant="secondary"
                        >
                          Vote merchant
                        </Button>
                        <Button disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate(dispute.id)}>
                          Execute ruling
                        </Button>
                      </div>
                    ) : null}

                    {dispute.evidence.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {dispute.evidence.map((evidence) => (
                          <div className="rounded-md bg-slate-50 p-2 text-xs" key={evidence.id}>
                            <p className="font-mono text-slate-700">{evidence.walrusBlobId}</p>
                            <p className="mt-1 text-slate-500">{evidence.contentHash}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {summary?.disputes.length === 0 ? <p className="text-sm text-slate-500">No refund proposals opened.</p> : null}
              </div>
              {(evidenceMutation.error || startVotingMutation.error || voteMutation.error || resolveMutation.error) ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {evidenceMutation.error?.message ||
                    startVotingMutation.error?.message ||
                    voteMutation.error?.message ||
                    resolveMutation.error?.message}
                </div>
              ) : null}
            </Panel>
          </div>

          <Panel className="mt-6" id="payments">
            <div className="flex items-center gap-3">
              <Scale size={20} />
              <h2 className="text-lg font-semibold">Protocol ledger</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {(summary?.payments ?? []).map((payment) => (
                <div className="grid gap-2 rounded-md border border-slate-200 p-4 text-sm md:grid-cols-4" key={payment.id}>
                  <span className="font-mono text-xs">{payment.id}</span>
                  <span>
                    {payment.inputAmount} {payment.inputToken}
                  </span>
                  <span>{payment.settledAmount} USDC escrowed</span>
                  <span className="truncate font-mono text-xs text-slate-500">{payment.txDigest}</span>
                </div>
              ))}
              {summary?.payments.length === 0 ? <p className="text-sm text-slate-500">No escrow transactions yet.</p> : null}
            </div>
          </Panel>

          <Panel className="mt-6" id="webhooks">
            <div className="flex items-center gap-3">
              <Webhook size={20} />
              <h2 className="text-lg font-semibold">Webhook events</h2>
            </div>
            <p className="mt-3 break-all text-sm text-slate-600">{summary?.merchant.webhookUrl ?? "Not configured"}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(summary?.webhooks ?? []).map((event) => (
                <div className="rounded-md border border-slate-200 p-3 text-sm" key={event.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.type}</span>
                    <Link2 size={14} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">{event.signature.slice(0, 24)}...</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
