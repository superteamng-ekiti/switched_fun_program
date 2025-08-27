use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
};

use crate::{errors::SwitchedError, state::GlobalState};

#[derive(Accounts)]
pub struct AdminWithdrawal<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,


    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = global_state,
        associated_token::token_program = token_program,

        constraint = global_state.plaftorm_fee_account.key() == treasury_account.key() @SwitchedError::TreasuryError
    )]
    pub treasury_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = receiving_ata.mint == global_state.supported_tokens_mint.key() @SwitchedError::InvalidMintAddress
    )]
    pub receiving_ata: InterfaceAccount<'info, TokenAccount>,

     #[account(
       constraint = token_mint.key() == global_state.supported_tokens_mint.key() 
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


impl<'info> AdminWithdrawal<'info> {
    pub fn handle_admin_fee_withdraw(&mut self, params: AdminWithdrawParams) -> Result<()> {
        require!(self.signer.key() == self.global_state.admin.key(), SwitchedError::Unauthorized);
        require!(params.amount <= self.treasury_account.amount, SwitchedError::InsufficientVaultBalance);

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"global_state",
            &[self.global_state.bump]
        ]];


        let withdraw_accounts =  TransferChecked {
            authority: self.global_state.to_account_info(),
            from: self.treasury_account.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.receiving_ata.to_account_info()
        };

        let cpi_context = CpiContext::new_with_signer(self.token_program.to_account_info(), withdraw_accounts, signer_seeds);

        transfer_checked(cpi_context, params.amount, self.token_mint.decimals)?;
        Ok(())
    }

    pub fn handle_withdraw_all(&mut self) ->  Result<()> {
        require!(self.signer.key() == self.global_state.admin.key(), SwitchedError::Unauthorized);

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"global_state",
            &[self.global_state.bump]
        ]];

        let all_balance = self.treasury_account.amount;

        let withdraw_accounts =  TransferChecked {
            authority: self.global_state.to_account_info(),
            from: self.treasury_account.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.receiving_ata.to_account_info()
        };

        let cpi_context = CpiContext::new_with_signer(self.token_program.to_account_info(), withdraw_accounts, signer_seeds);

        transfer_checked(cpi_context, all_balance, self.token_mint.decimals)?;
        Ok(())
    }
}


#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct AdminWithdrawParams {
    pub amount: u64
}