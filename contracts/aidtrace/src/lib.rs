#![no_std]
//! AidTrace campaign funding and disbursement contract (PRD Deliverable 2, "Recommended Soroban contract
//! responsibilities").
//!
//! The contract holds testnet USDC per campaign, records the allocations an authorized administrator approved, and
//! pays each allocation out exactly once. Beneficiary eligibility is decided off-chain; the contract only stores
//! the minimum needed to authorize and verify payments: a privacy-safe beneficiary reference, a wallet and an
//! amount. Names, documents and contact details never touch the ledger.
//!
//! SCAFFOLD: types, storage layout, errors, events and the public interface are defined; function bodies are
//! `todo!()` until the Soroban developer implements them against `test.rs`.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

mod events;
#[cfg(test)]
mod test;

// --- Types ---------------------------------------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CampaignState {
    Active,
    Closed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    /// Public campaign reference ("AT-2026-0012"), shared with the backend and the public ledger.
    pub reference: String,
    /// The organization's authorized administrator wallet. Every write for this campaign requires its auth.
    pub admin: Address,
    /// Funding target in USDC stroops (informational; funding beyond it is allowed).
    pub target: i128,
    /// Maximum allocation per beneficiary, in stroops.
    pub max_allocation: i128,
    /// Total USDC received (stroops).
    pub raised: i128,
    /// Sum of open (allocated, unpaid) allocations.
    pub allocated: i128,
    /// Total confirmed payouts.
    pub disbursed: i128,
    pub state: CampaignState,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AllocationState {
    /// Authorized and waiting for payout.
    Allocated,
    /// Paid out; can never be paid again.
    Paid,
    /// Cancelled by the administrator before payout; its amount returns to the available balance.
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Allocation {
    /// The only beneficiary identifier on chain ("BEN-0042").
    pub beneficiary_ref: String,
    pub wallet: Address,
    pub amount: i128,
    pub state: AllocationState,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The USDC token contract (Stellar Asset Contract for Circle's Testnet USDC). Instance storage.
    Token,
    /// Next campaign id. Instance storage.
    NextCampaignId,
    /// Campaign by id. Persistent storage.
    Campaign(u64),
    /// Allocation by (campaign id, beneficiary reference). Persistent storage.
    Allocation(u64, String),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    CampaignNotFound = 3,
    CampaignClosed = 4,
    /// Amount ≤ 0, or above the campaign's maximum allocation.
    InvalidAmount = 5,
    /// The beneficiary reference already has an open or paid allocation.
    AllocationExists = 6,
    AllocationNotFound = 7,
    /// Duplicate payout attempt.
    AlreadyPaid = 8,
    AllocationCancelled = 9,
    /// Allocations or payouts would exceed the campaign's available balance.
    InsufficientFunds = 10,
}

// --- Interface -----------------------------------------------------------------------------------------------------

#[contract]
pub struct AidTrace;

#[contractimpl]
impl AidTrace {
    /// One-time setup with the USDC token contract address.
    pub fn init(env: Env, token: Address) -> Result<(), Error> {
        let _ = (env, token);
        todo!("store DataKey::Token; fail with AlreadyInitialized on a second call")
    }

    /// Registers a campaign under `admin` (requires `admin` auth). Returns the campaign id. (Responsibility 1)
    pub fn register_campaign(env: Env, admin: Address, reference: String, target: i128, max_allocation: i128) -> Result<u64, Error> {
        let _ = (env, admin, reference, target, max_allocation);
        todo!("validate amounts, store Campaign, emit events::campaign_registered")
    }

    /// Transfers `amount` USDC from `from` into the contract for this campaign (requires `from` auth).
    /// (Responsibilities 2, 3, 8)
    pub fn fund(env: Env, campaign_id: u64, from: Address, amount: i128) -> Result<(), Error> {
        let _ = (env, campaign_id, from, amount);
        todo!("token transfer from → contract, raised += amount, emit events::funded")
    }

    /// Authorizes a payout of `amount` to `wallet` for an approved beneficiary (requires campaign admin auth).
    /// Fails if it exceeds `max_allocation` or the unallocated balance. (Responsibilities 4, 5, 6)
    pub fn allocate(env: Env, campaign_id: u64, beneficiary_ref: String, wallet: Address, amount: i128) -> Result<(), Error> {
        let _ = (env, campaign_id, beneficiary_ref, wallet, amount);
        todo!("check admin auth, limits and available = raised - disbursed - allocated; store Allocation; emit events::allocated")
    }

    /// Cancels an unpaid allocation (requires campaign admin auth).
    pub fn cancel_allocation(env: Env, campaign_id: u64, beneficiary_ref: String) -> Result<(), Error> {
        let _ = (env, campaign_id, beneficiary_ref);
        todo!("Allocated → Cancelled, allocated -= amount, emit events::allocation_cancelled")
    }

    /// Pays an allocation to its wallet exactly once (requires campaign admin auth). State is updated only together
    /// with the token transfer, so a failed transfer leaves the campaign unchanged. (Responsibilities 5, 7, 8, 9, 10)
    pub fn disburse(env: Env, campaign_id: u64, beneficiary_ref: String) -> Result<(), Error> {
        let _ = (env, campaign_id, beneficiary_ref);
        todo!("Allocated → Paid, token transfer contract → wallet, allocated -= amount, disbursed += amount, emit events::disbursed")
    }

    /// Closes a campaign to new funding and allocations (requires campaign admin auth).
    pub fn close_campaign(env: Env, campaign_id: u64) -> Result<(), Error> {
        let _ = (env, campaign_id);
        todo!("state = Closed, emit events::campaign_closed")
    }

    // --- Reads (reconciliation, Responsibility 10) ---------------------------------------------------------------

    pub fn campaign(env: Env, campaign_id: u64) -> Result<Campaign, Error> {
        let _ = (env, campaign_id);
        todo!()
    }

    pub fn allocation(env: Env, campaign_id: u64, beneficiary_ref: String) -> Result<Allocation, Error> {
        let _ = (env, campaign_id, beneficiary_ref);
        todo!()
    }

    /// raised − disbursed: what the contract holds for this campaign.
    pub fn balance(env: Env, campaign_id: u64) -> Result<i128, Error> {
        let _ = (env, campaign_id);
        todo!()
    }
}
