# Judge Notes

## What To Look At First

1. Move protocol: `packages/protocol/sources/trust_protocol.move`
2. Testnet deployment: `deployments/testnet.json`
3. Chain PTB builder: `packages/chain/src/index.ts`
4. Checkout wallet execution: `apps/checkout/src/App.tsx`
5. Dashboard projection: `apps/dashboard/src/App.tsx`

## Commands

```bash
bun install
bun run typecheck
bun run test:chain
bun run test:protocol
bun run build
```

## Testnet Package

```txt
0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547
```

## Why This Is More Than A Payment Gateway

A normal payment gateway has a narrow state machine:

```txt
created -> paid -> settled
```

SuiTrustPay models commerce:

```txt
created -> escrowed -> released
                  |
                  -> disputed -> evidence -> voting -> refunded/released
```

That state lives in Move objects, not just in a private database.

## Sui-Specific Technical Points

- `Escrow<T>` stores `Balance<T>`, so custody is controlled by the protocol object.
- Settlement is generic over coin type.
- Dispute evidence records Walrus blob IDs and hashes rather than raw files.
- Move tests cover release and refund paths.
- The checkout PTB builds real Sui transaction JSON and executes through dapp-kit.

## Known MVP Tradeoffs

- SUI is used as the testnet settlement coin for easy judging.
- USDC settlement and Aftermath swap are next integration steps.
- Sponsored gas is designed but not shipped with a production sponsor signer.
- API projection is in memory; production path is indexer + Postgres.

## Suggested Evaluation Framing

Score this project on:

- usefulness for real-world Sui commerce
- quality of Move object modeling
- completeness of merchant-facing UX
- evidence/dispute architecture
- path from hackathon prototype to production
