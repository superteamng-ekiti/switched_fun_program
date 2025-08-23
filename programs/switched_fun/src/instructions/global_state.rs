use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{errors::SwitchedError, state::GlobalState};

#[derive(Accounts)]
pub struct InitializeGlobalState<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = GlobalState::DISCRIMINATOR.len() + GlobalState::INIT_SPACE,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = token_mint,
        associated_token::authority = global_state,
        associated_token::token_program = token_program
    )]
    pub treasury_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = token_mint.decimals == 6 @SwitchedError::InvalidMint
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> InitializeGlobalState<'info> {
    pub fn handle_initialize(
        &mut self,
        params: InitializeParams,
        bumps: &InitializeGlobalStateBumps,
    ) -> Result<()> {
        require!(
            !self.global_state.initialized,
            SwitchedError::AlreadyInitialized
        );

        self.global_state.set_inner(GlobalState {
            admin: self.signer.key(),
            platform_fee_bps: params.fee_bps,
            plaftorm_fee_account: self.treasury_account.key(),
            supported_tokens_mint: self.token_mint.key(),
            bump: bumps.global_state,
            initialized: true,
        });

        Ok(())
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct InitializeParams {
    pub fee_bps: u16,
}
