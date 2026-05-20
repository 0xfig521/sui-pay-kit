module suitrustpay::trust_protocol;

use sui::balance::Balance;
use sui::clock::{Self, Clock};
use sui::coin::Coin;
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::TxContext;

const STATUS_PENDING: u8 = 0;
const STATUS_ESCROWED: u8 = 1;
const STATUS_RELEASED: u8 = 2;
const STATUS_DISPUTED: u8 = 3;
const STATUS_REFUNDED: u8 = 4;

const DISPUTE_EVIDENCE: u8 = 1;
const DISPUTE_VOTING: u8 = 2;
const DISPUTE_RESOLVED: u8 = 3;

const VOTE_REFUND: u8 = 1;
const VOTE_MERCHANT: u8 = 2;

const JUROR_BUYER: u8 = 1;
const JUROR_MERCHANT: u8 = 2;
const JUROR_NEUTRAL: u8 = 3;

const EInvalidAmount: u64 = 1;
const EInvalidState: u64 = 2;
const EProtectionActive: u64 = 3;
const ENotParticipant: u64 = 4;
const EInvalidVote: u64 = 5;

public struct TRUST_PROTOCOL has drop {}

#[test_only]
public struct TEST_USDC has drop {}

public struct AdminCap has key, store {
    id: UID,
}

public struct ProtocolConfig has key {
    id: UID,
    admin: address,
    total_orders: u64,
    total_disputes: u64,
    evidence_fee_reimbursement_enabled: bool,
}

public struct Order has key, store {
    id: UID,
    merchant: address,
    buyer: address,
    amount_usdc: u64,
    status: u8,
    metadata_hash: vector<u8>,
    created_at: u64,
    protection_deadline: u64,
}

public struct Escrow<phantom T> has key, store {
    id: UID,
    order_id: ID,
    amount_usdc: u64,
    buyer: address,
    merchant: address,
    status: u8,
    release_time: u64,
    balance: Balance<T>,
}

public struct Dispute has key, store {
    id: UID,
    order_id: ID,
    escrow_id: ID,
    status: u8,
    refund_votes: u64,
    merchant_votes: u64,
    jury: vector<address>,
}

public struct Evidence has key, store {
    id: UID,
    dispute_id: ID,
    submitter: address,
    walrus_blob_id: vector<u8>,
    content_hash: vector<u8>,
    storage_cost: u64,
    accepted: bool,
}

public struct MerchantProfile has key, store {
    id: UID,
    owner: address,
    stake: u64,
    total_orders: u64,
    refund_rate: u64,
    reputation_score: u64,
}

public struct BuyerProfile has key, store {
    id: UID,
    owner: address,
    total_orders: u64,
    dispute_loss_rate: u64,
    reputation_score: u64,
}

public struct JurorProfile has key, store {
    id: UID,
    owner: address,
    role: u8,
    stake: u64,
    majority_rate: u64,
    reputation_score: u64,
}

public struct OrderCreated has copy, drop {
    order_id: ID,
    merchant: address,
    amount_usdc: u64,
    protection_deadline: u64,
}

public struct EscrowLocked has copy, drop {
    order_id: ID,
    escrow_id: ID,
    buyer: address,
    merchant: address,
    amount_usdc: u64,
}

public struct DisputeOpened has copy, drop {
    dispute_id: ID,
    order_id: ID,
    escrow_id: ID,
    buyer: address,
}

public struct EvidenceSubmitted has copy, drop {
    evidence_id: ID,
    dispute_id: ID,
    submitter: address,
    storage_cost: u64,
}

public struct VoteCast has copy, drop {
    dispute_id: ID,
    juror: address,
    vote: u8,
}

public struct DisputeResolved has copy, drop {
    dispute_id: ID,
    order_id: ID,
    refund_wins: bool,
}

fun init(_: TRUST_PROTOCOL, ctx: &mut TxContext) {
    let admin = ctx.sender();
    let admin_cap = AdminCap { id: object::new(ctx) };
    let config = ProtocolConfig {
        id: object::new(ctx),
        admin,
        total_orders: 0,
        total_disputes: 0,
        evidence_fee_reimbursement_enabled: true,
    };

    transfer::transfer(admin_cap, admin);
    transfer::share_object(config);
}

public fun create_order(
    config: &mut ProtocolConfig,
    merchant: address,
    amount_usdc: u64,
    metadata_hash: vector<u8>,
    protection_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): Order {
    assert!(amount_usdc > 0, EInvalidAmount);

    let now = clock::timestamp_ms(clock);
    let protection_deadline = now + protection_ms;
    let order = Order {
        id: object::new(ctx),
        merchant,
        buyer: @0x0,
        amount_usdc,
        status: STATUS_PENDING,
        metadata_hash,
        created_at: now,
        protection_deadline,
    };

    config.total_orders = config.total_orders + 1;
    event::emit(OrderCreated {
        order_id: object::id(&order),
        merchant,
        amount_usdc,
        protection_deadline,
    });

    order
}

public fun lock_escrow<T>(order: &mut Order, payment: Coin<T>, buyer: address, ctx: &mut TxContext): Escrow<T> {
    assert!(order.status == STATUS_PENDING, EInvalidState);
    assert!(payment.value() == order.amount_usdc, EInvalidAmount);

    order.buyer = buyer;
    order.status = STATUS_ESCROWED;
    let escrow = Escrow {
        id: object::new(ctx),
        order_id: object::id(order),
        amount_usdc: order.amount_usdc,
        buyer,
        merchant: order.merchant,
        status: STATUS_ESCROWED,
        release_time: order.protection_deadline,
        balance: payment.into_balance(),
    };

    event::emit(EscrowLocked {
        order_id: object::id(order),
        escrow_id: object::id(&escrow),
        buyer,
        merchant: order.merchant,
        amount_usdc: order.amount_usdc,
    });

    escrow
}

public fun release_to_merchant<T>(order: &mut Order, escrow: Escrow<T>, clock: &Clock, ctx: &mut TxContext): Coin<T> {
    assert!(order.status == STATUS_ESCROWED, EInvalidState);
    assert!(escrow.status == STATUS_ESCROWED, EInvalidState);
    assert!(clock::timestamp_ms(clock) >= escrow.release_time, EProtectionActive);

    order.status = STATUS_RELEASED;
    escrow.into_coin(ctx)
}

public fun open_dispute<T>(
    config: &mut ProtocolConfig,
    order: &mut Order,
    escrow: &mut Escrow<T>,
    jury: vector<address>,
    clock: &Clock,
    ctx: &mut TxContext,
): Dispute {
    assert!(order.status == STATUS_ESCROWED, EInvalidState);
    assert!(escrow.status == STATUS_ESCROWED, EInvalidState);
    assert!(clock::timestamp_ms(clock) < order.protection_deadline, EProtectionActive);

    order.status = STATUS_DISPUTED;
    escrow.status = STATUS_DISPUTED;
    config.total_disputes = config.total_disputes + 1;

    let dispute = Dispute {
        id: object::new(ctx),
        order_id: object::id(order),
        escrow_id: object::id(escrow),
        status: DISPUTE_EVIDENCE,
        refund_votes: 0,
        merchant_votes: 0,
        jury,
    };

    event::emit(DisputeOpened {
        dispute_id: object::id(&dispute),
        order_id: object::id(order),
        escrow_id: object::id(escrow),
        buyer: order.buyer,
    });

    dispute
}

public fun submit_evidence(
    dispute: &Dispute,
    submitter: address,
    walrus_blob_id: vector<u8>,
    content_hash: vector<u8>,
    storage_cost: u64,
    ctx: &mut TxContext,
): Evidence {
    assert!(dispute.status == DISPUTE_EVIDENCE, EInvalidState);

    let evidence = Evidence {
        id: object::new(ctx),
        dispute_id: object::id(dispute),
        submitter,
        walrus_blob_id,
        content_hash,
        storage_cost,
        accepted: true,
    };

    event::emit(EvidenceSubmitted {
        evidence_id: object::id(&evidence),
        dispute_id: object::id(dispute),
        submitter,
        storage_cost,
    });

    evidence
}

public fun start_voting(dispute: &mut Dispute) {
    assert!(dispute.status == DISPUTE_EVIDENCE, EInvalidState);
    dispute.status = DISPUTE_VOTING;
}

public fun vote(dispute: &mut Dispute, vote: u8, ctx: &TxContext) {
    assert!(dispute.status == DISPUTE_VOTING, EInvalidState);
    assert!(vote == VOTE_REFUND || vote == VOTE_MERCHANT, EInvalidVote);
    assert!(contains_address(&dispute.jury, ctx.sender()), ENotParticipant);

    if (vote == VOTE_REFUND) {
        dispute.refund_votes = dispute.refund_votes + 1;
    } else {
        dispute.merchant_votes = dispute.merchant_votes + 1;
    };

    event::emit(VoteCast {
        dispute_id: object::id(dispute),
        juror: ctx.sender(),
        vote,
    });
}

public fun resolve_dispute<T>(order: &mut Order, escrow: Escrow<T>, dispute: &mut Dispute, ctx: &mut TxContext): (bool, Coin<T>) {
    assert!(order.status == STATUS_DISPUTED, EInvalidState);
    assert!(escrow.status == STATUS_DISPUTED, EInvalidState);
    assert!(dispute.status == DISPUTE_VOTING, EInvalidState);

    let refund_wins = dispute.refund_votes > dispute.merchant_votes;
    if (refund_wins) {
        order.status = STATUS_REFUNDED;
    } else {
        order.status = STATUS_RELEASED;
    };
    dispute.status = DISPUTE_RESOLVED;

    event::emit(DisputeResolved {
        dispute_id: object::id(dispute),
        order_id: object::id(order),
        refund_wins,
    });

    (refund_wins, escrow.into_coin(ctx))
}

public fun new_merchant_profile(owner: address, stake: u64, ctx: &mut TxContext): MerchantProfile {
    MerchantProfile {
        id: object::new(ctx),
        owner,
        stake,
        total_orders: 0,
        refund_rate: 0,
        reputation_score: 100,
    }
}

public fun new_buyer_profile(owner: address, ctx: &mut TxContext): BuyerProfile {
    BuyerProfile {
        id: object::new(ctx),
        owner,
        total_orders: 0,
        dispute_loss_rate: 0,
        reputation_score: 100,
    }
}

public fun new_juror_profile(owner: address, role: u8, stake: u64, ctx: &mut TxContext): JurorProfile {
    assert!(role == JUROR_BUYER || role == JUROR_MERCHANT || role == JUROR_NEUTRAL, EInvalidState);

    JurorProfile {
        id: object::new(ctx),
        owner,
        role,
        stake,
        majority_rate: 0,
        reputation_score: 100,
    }
}

public fun set_evidence_fee_reimbursement(_: &AdminCap, config: &mut ProtocolConfig, enabled: bool) {
    config.evidence_fee_reimbursement_enabled = enabled;
}

public fun admin(config: &ProtocolConfig): address {
    config.admin
}

public fun order_status(order: &Order): u8 {
    order.status
}

public fun escrow_status<T>(escrow: &Escrow<T>): u8 {
    escrow.status
}

public fun dispute_status(dispute: &Dispute): u8 {
    dispute.status
}

public fun is_juror(dispute: &Dispute, juror: address): bool {
    contains_address(&dispute.jury, juror)
}

fun contains_address(values: &vector<address>, target: address): bool {
    let mut index = 0;
    while (index < values.length()) {
        if (values[index] == target) {
            return true
        };
        index = index + 1;
    };
    false
}

fun into_coin<T>(escrow: Escrow<T>, ctx: &mut TxContext): Coin<T> {
    let Escrow {
        id,
        order_id: _,
        amount_usdc: _,
        buyer: _,
        merchant: _,
        status: _,
        release_time: _,
        balance,
    } = escrow;
    id.delete();
    balance.into_coin(ctx)
}

#[test_only]
fun new_config_for_testing(ctx: &mut TxContext): ProtocolConfig {
    ProtocolConfig {
        id: object::new(ctx),
        admin: ctx.sender(),
        total_orders: 0,
        total_disputes: 0,
        evidence_fee_reimbursement_enabled: true,
    }
}

#[test_only]
fun destroy_config_for_testing(config: ProtocolConfig) {
    let ProtocolConfig {
        id,
        admin: _,
        total_orders: _,
        total_disputes: _,
        evidence_fee_reimbursement_enabled: _,
    } = config;
    id.delete();
}

#[test_only]
fun destroy_order_for_testing(order: Order) {
    let Order {
        id,
        merchant: _,
        buyer: _,
        amount_usdc: _,
        status: _,
        metadata_hash: _,
        created_at: _,
        protection_deadline: _,
    } = order;
    id.delete();
}

#[test_only]
fun destroy_dispute_for_testing(dispute: Dispute) {
    let Dispute {
        id,
        order_id: _,
        escrow_id: _,
        status: _,
        refund_votes: _,
        merchant_votes: _,
        jury: _,
    } = dispute;
    id.delete();
}

#[test_only]
fun destroy_evidence_for_testing(evidence: Evidence) {
    let Evidence {
        id,
        dispute_id: _,
        submitter: _,
        walrus_blob_id: _,
        content_hash: _,
        storage_cost: _,
        accepted: _,
    } = evidence;
    id.delete();
}

#[test]
fun escrow_releases_after_protection_window() {
    use sui::clock;
    use sui::coin;
    use sui::tx_context;
    use std::unit_test::assert_eq;

    let mut ctx = tx_context::dummy();
    let mut clock = clock::create_for_testing(&mut ctx);
    let mut config = new_config_for_testing(&mut ctx);

    let mut order = create_order(
        &mut config,
        @0x2,
        1_000,
        b"metadata_hash",
        100,
        &clock,
        &mut ctx,
    );
    let payment = coin::mint_for_testing<TEST_USDC>(1_000, &mut ctx);
    let escrow = lock_escrow(&mut order, payment, @0x1, &mut ctx);

    assert_eq!(order_status(&order), STATUS_ESCROWED);
    assert_eq!(escrow_status(&escrow), STATUS_ESCROWED);

    clock.increment_for_testing(101);
    let released = release_to_merchant(&mut order, escrow, &clock, &mut ctx);

    assert_eq!(order_status(&order), STATUS_RELEASED);
    assert_eq!(released.value(), 1_000);

    coin::burn_for_testing(released);
    destroy_order_for_testing(order);
    destroy_config_for_testing(config);
    clock.destroy_for_testing();
}

#[test]
fun dispute_refund_returns_escrow_to_buyer() {
    use sui::clock;
    use sui::coin;
    use sui::tx_context;
    use std::unit_test::assert_eq;

    let mut ctx = tx_context::dummy();
    let clock = clock::create_for_testing(&mut ctx);
    let mut config = new_config_for_testing(&mut ctx);

    let mut order = create_order(
        &mut config,
        @0x2,
        2_500,
        b"metadata_hash",
        10_000,
        &clock,
        &mut ctx,
    );
    let payment = coin::mint_for_testing<TEST_USDC>(2_500, &mut ctx);
    let mut escrow = lock_escrow(&mut order, payment, @0x1, &mut ctx);
    let jury = vector[@0xA, @0xB, @0xC];
    let mut dispute = open_dispute(&mut config, &mut order, &mut escrow, jury, &clock, &mut ctx);
    let evidence = submit_evidence(
        &dispute,
        @0x1,
        b"walrus_blob_id",
        b"sha256_content_hash",
        42,
        &mut ctx,
    );

    assert_eq!(order_status(&order), STATUS_DISPUTED);
    assert_eq!(dispute_status(&dispute), DISPUTE_EVIDENCE);

    start_voting(&mut dispute);
    vote_as_for_testing(&mut dispute, VOTE_REFUND, @0xA);
    vote_as_for_testing(&mut dispute, VOTE_REFUND, @0xB);
    vote_as_for_testing(&mut dispute, VOTE_MERCHANT, @0xC);

    let (refund_wins, refunded) = resolve_dispute(&mut order, escrow, &mut dispute, &mut ctx);

    assert!(refund_wins);
    assert_eq!(order_status(&order), STATUS_REFUNDED);
    assert_eq!(refunded.value(), 2_500);

    coin::burn_for_testing(refunded);
    destroy_evidence_for_testing(evidence);
    destroy_dispute_for_testing(dispute);
    destroy_order_for_testing(order);
    destroy_config_for_testing(config);
    clock.destroy_for_testing();
}

#[test_only]
fun vote_as_for_testing(dispute: &mut Dispute, vote: u8, juror: address) {
    assert!(dispute.status == DISPUTE_VOTING, EInvalidState);
    assert!(vote == VOTE_REFUND || vote == VOTE_MERCHANT, EInvalidVote);
    assert!(contains_address(&dispute.jury, juror), ENotParticipant);

    if (vote == VOTE_REFUND) {
        dispute.refund_votes = dispute.refund_votes + 1;
    } else {
        dispute.merchant_votes = dispute.merchant_votes + 1;
    };

    event::emit(VoteCast {
        dispute_id: object::id(dispute),
        juror,
        vote,
    });
}
