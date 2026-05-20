# SuiTrustPay

## One-Liner

SuiTrustPay is an on-chain trusted commerce protocol that combines escrow, DAO-style dispute resolution, Walrus evidence records, and universal settlement on Sui.

## Short Description

SuiTrustPay upgrades crypto checkout from a simple payment gateway into a trusted commerce layer. Buyers pay through a hosted checkout, funds are locked in an on-chain escrow object, and each order has a protection window before settlement. If something goes wrong, the buyer can open a refund proposal, attach Walrus evidence references, and route the dispute through a transparent jury workflow.

Merchants still get a Stripe-like developer experience: create an order through an SDK or API, send the buyer to hosted checkout, track orders in a dashboard, and receive webhooks. Under the hood, Sui object ownership and Move state transitions make the payment, escrow, dispute, evidence, and reputation surfaces auditable.

## Track Fit

Primary track: **Payments & Wallets**

SuiTrustPay builds real payment rails for Sui commerce:

- hosted checkout
- wallet execution on Sui testnet
- on-chain escrow custody
- settlement abstractions
- merchant SDK/API
- dashboard and webhook projection

Secondary fit: **Walrus**

The dispute system is designed around evidence files stored off-chain with verifiable references:

- evidence file goes to Walrus
- blob ID is recorded in the dispute object
- content hash is recorded on-chain
- accepted evidence cost can be reimbursed during judgment

## Problem

Crypto payments are easy to send but hard to trust.

For buyers, paying a merchant on-chain usually means immediate finality with limited recourse. For merchants, accepting crypto creates operational complexity around wallets, chain state, token conversion, disputes, refunds, and customer support. Existing checkout products focus on receiving funds, but commerce often needs more than payment: it needs protection, evidence, settlement, and reputation.

## Solution

SuiTrustPay provides a commerce protocol with four layers:

1. **Universal Checkout**: merchants create orders through API/SDK and buyers pay through a hosted checkout.
2. **On-Chain Escrow**: payment is locked in a Move `Escrow<T>` object instead of going directly to the merchant.
3. **Dispute Court**: buyers can open refund proposals, submit Walrus evidence references, and enter a jury voting workflow.
4. **Reputation Layer**: merchant, buyer, and juror profiles expose public commerce reputation.

## What Is Built

### Move Protocol

Located in `packages/protocol`.

Implemented objects:

- `Order`
- `Escrow<T>`
- `Dispute`
- `Evidence`
- `MerchantProfile`
- `BuyerProfile`
- `JurorProfile`

Implemented protocol transitions:

- create order
- lock escrow with a real `Coin<T>`
- release escrow after protection window
- open dispute
- submit evidence metadata
- start voting
- cast votes
- resolve dispute and return settlement coin to buyer or merchant path

### Chain Builder

Located in `packages/chain`.

Builds a real Sui `Transaction` JSON containing:

- `trust_protocol::create_order`
- `SplitCoins`
- `trust_protocol::lock_escrow<0x2::sui::SUI>`
- transfer of created order and escrow objects to payer

The current testnet mode uses SUI as the settlement coin and splits from the connected wallet gas coin so judges can run the flow immediately on testnet.

### API

Located in `apps/api`.

Implemented endpoints:

- `POST /v1/orders`
- `GET /v1/orders`
- `GET /v1/orders/:id`
- `POST /v1/quotes`
- `POST /v1/payments/intent`
- `POST /v1/payments/confirm`
- `POST /v1/disputes`
- `GET /v1/disputes`
- `POST /v1/evidence`
- `GET /v1/checkout/config`
- `GET /v1/dashboard/summary`

### Frontend

Located in:

- `apps/checkout`
- `apps/dashboard`

Checkout supports:

- Sui wallet connect
- token selection
- quote preview
- PTB preview
- real testnet wallet signing/execution through dapp-kit
- escrow confirmation with digest

Dashboard supports:

- order list
- escrow projection
- dispute projection
- reputation panel
- webhook event projection
- API key and settlement wallet panels

### SDK

Located in `packages/sdk`.

Merchant-facing API:

```ts
import { SuiTrustPay } from "@suitrustpay/sdk";

const trustpay = new SuiTrustPay({
  apiKey: "sk_test_xxx",
  baseUrl: "http://localhost:8791",
});

const order = await trustpay.orders.create({
  amount: 10,
  currency: "USDC",
  protectionWindow: "24h",
});
```

## Testnet Deployment

- Network: Sui testnet
- Package: `0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547`
- Shared `ProtocolConfig`: `0xc157aa52e56e8cb4c6bf685d0efe20266f3a1c424d241cbb5961d504540cfb9a`
- Publish digest: `75mqZBodZBEzZ4p29M6u8t4ufjm26m3os2e9GjgTnN8d`
- Deployment metadata: `deployments/testnet.json`

## Technical Architecture

```txt
Merchant Site
  -> SDK/API
  -> Hosted Checkout
  -> Sui Wallet
  -> Sui Move Protocol
      -> Order Registry
      -> Escrow Vault
      -> Dispute Court
      -> Evidence Registry
      -> Reputation Profiles
  -> API Projection / Dashboard / Webhooks
```

## Why Sui

Sui is a strong fit because Sui objects map naturally to commerce state:

- orders are objects
- escrows are custody objects
- disputes are stateful objects
- evidence records are auditable objects
- reputation profiles are composable public objects

Move's resource semantics help prevent accidental duplication or double-spend style mistakes in escrow handling.

## Why Walrus

Dispute evidence should not live directly on-chain. SuiTrustPay stores evidence file references as:

- Walrus blob ID
- content hash
- submitter
- storage cost
- accepted flag

This keeps the chain state compact while preserving verifiability.

## Demo Flow

1. Start API, checkout, and dashboard.
2. Create a protected order from the dashboard or API.
3. Open hosted checkout.
4. Connect Sui testnet wallet.
5. Select `SUI`.
6. Generate quote and PTB.
7. Sign and execute transaction.
8. Show order moved into escrow.
9. Open dashboard and show escrow/order/webhook projection.
10. Show Move package and testnet deployment metadata.

## What Makes It Different

Most crypto checkout products optimize for payment acceptance. SuiTrustPay optimizes for trusted commerce:

- buyer protection
- merchant protection
- on-chain escrow
- dispute evidence
- jury resolution
- public reputation
- developer-friendly checkout and SDK

## Current Limitations

- Testnet demo settlement uses SUI as a stand-in settlement coin for immediate execution.
- Real USDC settlement requires configuring a USDC coin type/object and connecting the swap leg.
- Gasless sponsored transactions are designed but not yet implemented with a production sponsor signer.
- API persistence is currently an in-memory projection; production should use Postgres plus an indexer.
- Walrus upload helper is represented by schema and evidence objects; full upload UI/service is next.

## Roadmap

### Next 2 Weeks

- Add hosted deployment for API and frontends.
- Add real Walrus upload helper.
- Add indexer for Move events.
- Add USDC settlement coin configuration.

### Next 1-2 Months

- Add sponsor transaction service.
- Add Aftermath swap integration.
- Add dispute jury randomization.
- Add merchant onboarding and API key management.

### Longer Term

- Reputation-weighted jury selection.
- Evidence fee reimbursement executor.
- Subscription and usage-metered billing.
- Multi-chain merchant abstraction while keeping Sui as the trust protocol layer.

## Verification

Commands run:

```bash
bun run typecheck
bun run test:chain
bun run test:protocol
bun run build
```

Testnet dry-run succeeded for the checkout PTB and created two objects.

## Team Notes

This repository is structured as a Bun monorepo with Vite React apps and a Sui Move protocol package.

The project is ready for a hackathon demo, technical review, and follow-up deployment.
