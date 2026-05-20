# Pitch Outline

## Slide 1: Title

SuiTrustPay  
On-chain trusted commerce for Sui

## Slide 2: Problem

Crypto payment is final, but commerce is not.

- buyers need refund protection
- merchants need settlement and anti-abuse protection
- evidence and disputes are usually opaque
- developers do not want to manage wallets, swaps, gas, Move, or PTBs

## Slide 3: Insight

The missing primitive is not "checkout."  
The missing primitive is **trusted transaction state**.

## Slide 4: Solution

SuiTrustPay combines:

- universal checkout
- on-chain escrow
- protection windows
- Walrus evidence references
- DAO-style dispute court
- public reputation
- merchant SDK/API/dashboard

## Slide 5: Why Sui

Sui objects make commerce state first-class:

- `Order`
- `Escrow<T>`
- `Dispute`
- `Evidence`
- reputation profiles

Move makes custody explicit and auditable.

## Slide 6: Demo

Show:

- dashboard order creation
- checkout wallet connect
- testnet transaction execution
- escrow confirmation
- dashboard projection

## Slide 7: Architecture

```txt
SDK/API -> Checkout -> Wallet -> Move Protocol -> Indexer/API -> Dashboard/Webhooks
                           |
                           +-> Walrus evidence references
```

## Slide 8: Hackathon Build

Built in this repo:

- Bun monorepo
- Hono API
- Vite React checkout
- Vite React dashboard
- TypeScript SDK
- Sui Move protocol
- Sui testnet deployment
- PTB builder and tests

## Slide 9: Testnet Proof

- Package: `0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547`
- Config object: `0xc157aa52e56e8cb4c6bf685d0efe20266f3a1c424d241cbb5961d504540cfb9a`
- Publish digest: `75mqZBodZBEzZ4p29M6u8t4ufjm26m3os2e9GjgTnN8d`

## Slide 10: Roadmap

Next:

- hosted demo deployment
- Walrus upload helper
- event indexer
- USDC settlement
- sponsored transaction service
- Aftermath swap routing

## Closing

SuiTrustPay turns payment into trusted commerce.
