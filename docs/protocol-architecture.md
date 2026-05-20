# SuiTrustPay Protocol Architecture

SuiTrustPay separates protocol truth from product convenience.

## On-Chain Responsibilities

The Move package in `packages/protocol` owns the trusted commerce state:

- `Order`: merchant, buyer, USDC amount, metadata hash, protection deadline, status.
- `Escrow`: USDC amount, buyer, merchant, release time, lock/release/refund state.
- `Dispute`: refund proposal state, jury, refund votes, merchant votes.
- `Evidence`: Walrus blob ID, content hash, submitter, storage cost, accepted flag.
- `MerchantProfile`, `BuyerProfile`, `JurorProfile`: reputation surfaces.

The Move module now uses generic coin custody. After the swap, the PTB passes the exact settlement coin into `trust_protocol::lock_escrow<T>`, which stores the coin as `Balance<T>` inside `Escrow<T>`.

```txt
Input Token
  -> Aftermath Router
  -> USDC
  -> trust_protocol::lock_escrow<Coin<USDC>>
  -> Escrow<USDC> custody object
```

Release/refund functions consume `Escrow<T>` and return `Coin<T>`, so the PTB executor decides whether to transfer the returned coin to the merchant or buyer.

`packages/chain` now builds a real Sui `Transaction` object for the checkout path. The MVP serializes the transaction JSON into the payment intent so the API/UI can inspect the Move calls before sponsor/user signing. Production execution should switch this serialization to BCS transaction bytes after object references, gas owner, gas payment, and sponsor budget are fully resolved.

## Off-Chain Responsibilities

The service layer exists only to make the protocol usable:

- Hosted Checkout
- Merchant Dashboard
- SDK/API
- Webhook delivery
- Indexer projection
- Notifications
- Walrus upload helper

The API store is an MVP projection of what an indexer would read from Sui events.

## Dispute Flow

```txt
escrowed order
  -> buyer opens refund proposal within protection window
  -> evidence phase records Walrus blob IDs and hashes
  -> voting phase accepts juror votes
  -> resolution releases escrow to buyer or merchant
```

The jury model follows the PRD target of 5 buyer-side jurors, 5 merchant-side jurors, and 1 neutral juror. The MVP API seeds this deterministically; the Move module accepts the selected jury vector so a future random selection module can be plugged in.

## Walrus Evidence Contract

Evidence payloads should not be stored directly on-chain.

Store on Walrus:

- file bytes
- content metadata
- optional encrypted bundle

Store on-chain:

- `walrus_blob_id`
- `content_hash`
- `storage_cost`
- `submitter`
- `accepted`

Fee rule:

```txt
submitter pays first
losing party reimburses accepted evidence cost after judgment
```

The Move module includes `storage_cost` and `accepted` fields so the reimbursement executor can be added without changing evidence identity.

## Current Verification

- TypeScript service/apps: `bun run typecheck`
- Production frontend/API build: `bun run build`
- Chain PTB builder tests: `bun run test:chain`
- Move protocol: `sui move build` from `packages/protocol`
- Move protocol tests: `sui move test` from `packages/protocol`
