# 中文材料

## 项目一句话

SuiTrustPay 是一个基于 Sui 的链上可信商业协议，通过 Escrow、争议仲裁、Walrus 证据和通用结算，让普通用户和商家无需理解 Web3，也能完成可审查、可退款、可仲裁的可信交易。

## 30 秒介绍

现在大多数 crypto checkout 只解决“收款”，但真实商业交易需要的不只是付款，还需要买家保护、商家保护、证据、退款、仲裁和信誉。SuiTrustPay 把这些商业状态做成 Sui 上的 Move 对象：订单、托管资金、争议、证据和信誉都可审查。商家仍然只需要 SDK/API 和 Dashboard，用户只需要打开 Hosted Checkout 连接钱包付款。

## 2 分钟讲稿

SuiTrustPay 的核心判断是：Web3 支付的下一步不是再做一个收款网关，而是做可信交易协议。

在传统电商里，用户付款之后还有退款、争议、证据和仲裁流程。但在链上，很多支付是一笔转账直接结束，用户缺少保护，商家也缺少公开的信用和防恶意退款机制。

所以我们在 Sui 上实现了一个可信商业协议。商家通过 API 创建订单，用户进入 Hosted Checkout，用钱包在 Sui testnet 上签名交易。资金不会直接进入商家钱包，而是进入链上的 Escrow 对象。每个订单有保护期，如果没有争议，资金可以释放给商家；如果用户发起退款争议，可以提交 Walrus 证据引用，并进入陪审团投票流程。

这个项目利用了 Sui 的对象模型：Order、Escrow、Dispute、Evidence、Reputation 都是清晰的链上对象。Move 的资源语义也非常适合资金托管，因为 Escrow 持有真实的 `Balance<T>`，释放或退款都需要经过协议状态转换。

目前我们已经完成了 Move 协议、testnet 发布、Checkout、Dashboard、API、SDK 和 PTB builder。测试网版本为了方便评审直接跑通，暂时使用 SUI 作为 settlement coin；下一步会接入 USDC、Aftermath swap、Walrus 上传服务和 sponsored transaction。

一句话总结：SuiTrustPay 把支付升级成可信商业，把链上转账升级成可保护、可仲裁、可审查的交易协议。

## 推文 / X 文案

### 短版

Building SuiTrustPay for Sui Overflow 2026.

Not another payment gateway.

It is an on-chain trusted commerce protocol:

- hosted checkout
- escrow
- dispute resolution
- Walrus evidence
- public reputation
- universal settlement

Payment should be trusted commerce.

### 长版

Most crypto checkout products stop at "payment received."

Real commerce needs more:

- buyer protection
- merchant protection
- refund windows
- evidence
- arbitration
- reputation

SuiTrustPay turns those states into Sui Move objects.

Orders, escrows, disputes, evidence, and reputation become auditable protocol state, while merchants still get a Stripe-like SDK, hosted checkout, dashboard, and webhooks.

Built for Sui Overflow 2026.

## 评审亮点

- 不是单纯 checkout，而是可信商业协议。
- 充分利用 Sui object model。
- Escrow 使用真实 `Balance<T>` 托管资产。
- Walrus 作为证据层，链上记录 blob ID 和 hash。
- 同时覆盖 Payments & Wallets 和 Walrus 叙事。
- 已发布 Sui testnet。
- 有可运行的 Checkout、Dashboard、API 和 SDK。

## 中文 Demo 顺序

1. 展示 Dashboard 创建订单。
2. 打开 Checkout。
3. 连接 Sui testnet 钱包。
4. 选择 SUI。
5. 展示 quote 和 PTB preview。
6. 钱包签名执行。
7. 展示 tx digest。
8. 回到 Dashboard 看订单、托管资金、webhook 和信誉。
9. 打开 `deployments/testnet.json` 展示 testnet package。
10. 打开 Move 合约说明 Escrow / Dispute / Evidence。
