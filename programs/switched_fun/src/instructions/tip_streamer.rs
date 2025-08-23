use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::state::{GlobalState, Streamer};

#[derive(Accounts)]
#[instruction(params: TipParams)]
pub struct TipStreamer<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
       constraint =  signer_ata.mint == global_state.supported_tokens_mint.key(),
       constraint = signer_ata.owner == signer.key()
    )]
    pub signer_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
       constraint =  streamer_ata.mint == global_state.supported_tokens_mint.key(),
       constraint = streamer_ata.owner == streamer_state.key(),
       constraint = streamer_ata.key() == streamer_state.user_token_account.key()
    )]
    pub streamer_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
       constraint = token_mint.key() == global_state.supported_tokens_mint.key()
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [b"user", params.streamer_account.key().as_ref()],
        bump
    )]
    pub streamer_state: Account<'info, Streamer>,

    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> TipStreamer<'info> {
    pub fn handle_tip(&mut self, params: TipParams) -> Result<()> {
        let cpi_accounts = TransferChecked {
            authority: self.signer.to_account_info(),
            from: self.signer_ata.to_account_info(),
            to: self.streamer_ata.to_account_info(),
            mint: self.token_mint.to_account_info(),
        };

        let cpi_context = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);

        transfer_checked(cpi_context, params.amount, self.token_mint.decimals)?;

        Ok(())
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct TipParams {
    pub amount: u64,
    pub streamer_account: Pubkey,
}
