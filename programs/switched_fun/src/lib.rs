use anchor_lang::prelude::*;

mod errors;
mod instructions;
mod state;

use errors::*;
use instructions::*;
use state::*;

declare_id!("swinS25mqCw6ExEAtLJFxp6HYcqMvoYxKz3by6FfbRD");

#[program]
pub mod switched_fun {

    use super::*;

    pub fn initialize(ctx: Context<InitializeGlobalState>, params: InitializeParams) -> Result<()> {
        ctx.accounts.handle_initialize(params, &ctx.bumps)
    }

    pub fn create_streamer(ctx: Context<CreateStreamer>) -> Result<()> {
        ctx.accounts.handle_create_stream(&ctx.bumps)
    }

    pub fn tip_user(ctx: Context<TipStreamer>, params: TipParams) -> Result<()> {
        ctx.accounts.handle_tip(params)
    }

    pub fn withdraw(ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
        ctx.accounts.handle_withdraw(params)
    }

    pub fn admin_withdraw_fees(
        ctx: Context<AdminWithdrawal>,
        params: AdminWithdrawParams,
    ) -> Result<()> {
        ctx.accounts.handle_admin_fee_withdraw(params)
    }

    pub fn admin_withdraw_fees_all(ctx: Context<AdminWithdrawal>) -> Result<()> {
        ctx.accounts.handle_withdraw_all()
    }
}
