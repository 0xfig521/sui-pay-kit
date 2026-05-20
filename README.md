# SuiTrustPay

On-chain trusted commerce protocol for Sui.

SuiTrustPay is not just a payment gateway. It is an Escrow + DAO arbitration + Universal Settlement protocol:

- Buyers can pay with supported Sui tokens.
- The protocol swaps to USDC and locks the settlement coin in on-chain escrow.
- Orders have a protection window before merchant release.
- Refund proposals can attach Walrus evidence references.
- DAO jurors resolve disputes and reputation updates are protocol-visible.
- Merchants still see a simple SDK, hosted checkout, dashboard, and webhooks.

## Structure

```txt
apps/
  api/        Hono API for orders, quotes, escrow, disputes, evidence, dashboard data
  checkout/   Hosted checkout Vite React app
  dashboard/  Merchant protocol console
packages/
  sdk/        Merchant TypeScript SDK
  chain/      Quote, PTB, sponsor, escrow, settlement boundaries
  db/         Drizzle schema for indexer/service layer
  protocol/   Sui Move protocol objects and state transitions
  shared/     Zod contracts and shared protocol types
  ui/         Shared React UI primitives
```

## Commands

```bash
bun install
bun run typecheck
bun run build
bun run test:chain
bun run build:protocol
bun run test:protocol
bun run dev:api
bun run dev:checkout
bun run dev:dashboard
```

## Testnet Deployment

The Sui Move protocol is published on testnet:

- Package: `0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547`
- Shared `ProtocolConfig`: `0xc157aa52e56e8cb4c6bf685d0efe20266f3a1c424d241cbb5961d504540cfb9a`
- Publish digest: `75mqZBodZBEzZ4p29M6u8t4ufjm26m3os2e9GjgTnN8d`

Deployment metadata is in `deployments/testnet.json`. Runtime overrides are documented in `.env.testnet.example`.

The default testnet chain config uses `0x2::sui::SUI` as the settlement coin and splits it from the connected wallet gas coin so the checkout PTB can be signed and executed immediately on testnet. For real USDC settlement testing, set `SUI_SETTLEMENT_COIN_TYPE` and `SUI_SETTLEMENT_COIN_OBJECT_ID` to a USDC coin object owned by the payer/sponsor flow.

Default local URLs:

- API: `http://localhost:8787`
- Checkout: `http://localhost:5173`
- Dashboard: `http://localhost:5174`

## MVP Flow

1. Merchant creates an order through `POST /v1/orders` or `@suitrustpay/sdk`.
2. User opens `/checkout/:orderId`.
3. Checkout fetches token options, quote, protection window, and protocol modules.
4. API builds a payment intent representing token input, Aftermath swap, USDC escrow lock, receipt, and sponsored execution.
5. User confirms payment and the order becomes `escrowed`.
6. During the protection window, a buyer can open a dispute.
7. Evidence can be submitted as Walrus `blob_id + content_hash`.
8. Dashboard/indexer views expose escrow state, disputes, webhook events, and reputation profiles.

## Protocol Objects Represented

- `Order`: merchant, buyer, amount, metadata hash, status, protection deadline
- `Escrow<T>`: order ID, USDC amount, buyer, merchant, release time, `Balance<T>` custody
- `Dispute`: refund proposal, jury, votes, state
- `Evidence`: Walrus blob ID, content hash, storage cost
- `ReputationProfile`: merchant, buyer, and juror reputation surfaces

## Protocol Tests

Current Move tests cover:

- Escrow locks a real `Coin<T>` and releases it after the protection window.
- A dispute can submit Walrus evidence, enter voting, resolve in favor of refund, and return the escrowed `Coin<T>`.

Current chain-layer tests cover:

- `packages/chain` builds a real Sui `Transaction` JSON containing `trust_protocol::create_order` and `trust_protocol::lock_escrow<T>` Move calls.

More detail: [protocol architecture](docs/protocol-architecture.md).
