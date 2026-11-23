//! Contract events (PRD Deliverable 2 "Contract events"). The backend indexer reads these to build the public ledger
//! and reconcile payouts; topics are stable, so change them only together with the indexer.
//!
//! Topics: (symbol, campaign_id[, beneficiary_ref]). Data: amounts in stroops plus the counterparty address.

#![allow(dead_code)]

use soroban_sdk::{symbol_short, Address, Env, String};

pub fn campaign_registered(env: &Env, campaign_id: u64, admin: &Address, reference: &String) {
    env.events().publish((symbol_short!("campaign"), campaign_id), (admin.clone(), reference.clone()));
}

pub fn funded(env: &Env, campaign_id: u64, from: &Address, amount: i128) {
    env.events().publish((symbol_short!("funded"), campaign_id), (from.clone(), amount));
}

pub fn allocated(env: &Env, campaign_id: u64, beneficiary_ref: &String, amount: i128) {
    env.events().publish((symbol_short!("allocated"), campaign_id, beneficiary_ref.clone()), amount);
}

pub fn allocation_cancelled(env: &Env, campaign_id: u64, beneficiary_ref: &String, amount: i128) {
    env.events().publish((symbol_short!("cancelled"), campaign_id, beneficiary_ref.clone()), amount);
}

pub fn disbursed(env: &Env, campaign_id: u64, beneficiary_ref: &String, wallet: &Address, amount: i128) {
    env.events().publish((symbol_short!("disbursed"), campaign_id, beneficiary_ref.clone()), (wallet.clone(), amount));
}

pub fn campaign_closed(env: &Env, campaign_id: u64) {
    env.events().publish((symbol_short!("closed"), campaign_id), ());
}
