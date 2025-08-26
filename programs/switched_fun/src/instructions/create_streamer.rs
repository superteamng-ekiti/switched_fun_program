use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::errors::SwitchedError;
use crate::state::{GlobalState, Streamer};

#[derive(Accounts)]
pub struct CreateStreamer<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub broadcaster: Signer<'info>,

    #[account(
        init,
        payer = broadcaster,
        space = Streamer::DISCRIMINATOR.len() + Streamer::INIT_SPACE,
        seeds = [b"user", signer.key().as_ref()],
        bump
    )]
    pub streamer_state: Account<'info, Streamer>,

    #[account(
        constraint = token_mint.key() == global_state.supported_tokens_mint.key() @ SwitchedError::InvalidMintAddress
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = broadcaster,
        associated_token::mint = token_mint,
        associated_token::authority = streamer_state,
    )]
    pub streamer_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CreateStreamer<'info> {
    pub fn handle_create_stream(&mut self, bumps: &CreateStreamerBumps) -> Result<()> {
        self.streamer_state.set_inner(Streamer {
            user_wallet: self.signer.key(),
            user_token_account: self.streamer_ata.key(),
            bump: bumps.streamer_state,
        });
        Ok(())
    }
}
