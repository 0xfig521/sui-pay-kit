# Demo Script

Target length: 2-3 minutes.

## Setup

Run:

```bash
PORT=8791 CHECKOUT_BASE_URL=http://localhost:5180 bun run dev:api
VITE_API_BASE_URL=http://localhost:8791 bun run --cwd apps/checkout dev -- --host 0.0.0.0 --port 5180 --strictPort
VITE_API_BASE_URL=http://localhost:8791 bun run --cwd apps/dashboard dev -- --host 0.0.0.0 --port 5181 --strictPort
```

Open:

- Dashboard: `http://localhost:5181`
- Checkout: created order URL from dashboard or API

## Narration

### 0:00-0:20 Problem

"Crypto checkout today is mostly irreversible payment acceptance. That is not enough for real commerce. Buyers need protection, merchants need fair settlement, and both sides need transparent dispute handling."

### 0:20-0:45 Product

"SuiTrustPay is an on-chain trusted commerce protocol for Sui. It combines hosted checkout, escrow, dispute resolution, Walrus evidence references, and public reputation."

Show dashboard overview.

### 0:45-1:10 Create Order

Click `Create protected order`.

Say:

"A merchant can create a protected order through the dashboard, API, or SDK. The merchant does not need to understand Move, PTBs, wallets, or escrow."

Open the checkout link.

### 1:10-1:45 Checkout

Connect Sui testnet wallet.

Select `SUI`.

Say:

"The buyer sees a simple checkout. Under the hood, the API builds a Sui transaction that creates an on-chain order and locks settlement into escrow."

Click `Pay and lock escrow`.

Approve in wallet.

### 1:45-2:10 On-Chain Result

Show success digest.

Say:

"This transaction executes against the Sui testnet package. The protocol creates an order object and an escrow object. Funds are not immediately released to the merchant."

### 2:10-2:35 Dashboard Projection

Return to dashboard.

Show order status, escrow panel, ledger, and webhook event.

Say:

"The service layer projects protocol state into the merchant dashboard and webhooks. This is how merchants get a Stripe-like experience without managing chain details."

### 2:35-3:00 Dispute and Walrus

Show architecture or code for evidence.

Say:

"If the buyer opens a refund proposal, evidence files are stored on Walrus, and the Move protocol records blob ID, content hash, submitter, and storage cost. A future jury module can resolve the dispute and release escrow to the buyer or merchant."

## Backup API Demo

Create order:

```bash
curl -sS -X POST http://127.0.0.1:8791/v1/orders \
  -H 'content-type: application/json' \
  -d '{"amount":1,"currency":"USDC","protectionWindow":"15m","metadata":{"source":"demo"}}'
```

Create payment intent:

```bash
curl -sS -X POST http://127.0.0.1:8791/v1/payments/intent \
  -H 'content-type: application/json' \
  -d '{"orderId":"REPLACE_ORDER_ID","inputToken":"SUI","slippageBps":50,"payer":"REPLACE_WALLET_ADDRESS"}'
```

Verify package:

```bash
SSL_CERT_FILE=/opt/homebrew/etc/openssl@3/cert.pem \
sui client object 0xf63c56f580f19106921e01e06366e02b14a91aa7ced82380c3e515ef3e150547 --json
```
