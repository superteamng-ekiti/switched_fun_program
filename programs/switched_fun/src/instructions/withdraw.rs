use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked}};

use crate::{errors::SwitchedError, state::{GlobalState, Streamer}};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        constraint = signer.key() == streamer_state.user_wallet.key() @SwitchedError::Unauthorized
    )]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = receiving_ata.mint == token_mint.key()
    )]
    pub receiving_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint.key(),
        associated_token::authority = streamer_state,
        constraint = streamer_ata.key() == streamer_state.user_token_account.key()
    )]
    pub streamer_ata: InterfaceAccount<'info, TokenAccount>,

     #[account(
       constraint = token_mint.key() == global_state.supported_tokens_mint.key() 
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

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
        seeds = [b"user", signer.key().as_ref()],
        bump
    )]
    pub streamer_state: Account<'info, Streamer>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


impl<'info> Withdraw<'info> {
  

    pub fn handle_withdraw(&mut self, params: WithdrawParams) -> Result<()> {
          // make sure user is withdrawing appropriate amount
          let user_token_balance = self.streamer_ata.amount;
          let tx_fee_in_usdc = params.gas_in_usdc;

        // platform_fee = amount/10000 * platform_fee_bps

        let mut platform_fee = params.amount.checked_mul(self.global_state.platform_fee_bps as u64).ok_or(SwitchedError::MultiplicationOverflow)?;

        platform_fee = platform_fee.checked_div(10_000 as u64).ok_or(SwitchedError::DivisionOverflow)?;
          // user receives >>> amount - tx_fee_in_usdc - platform_fee

             // calculate fee and  subtract gas fee 
        let amount_user_receives = params.amount - tx_fee_in_usdc - platform_fee;
         let total_amount_platform_receives = tx_fee_in_usdc + platform_fee;

        require!(params.amount <= user_token_balance,
            
            SwitchedError::InsufficientVaultBalance);

         // build tx

         let tx_to_user_accounts = TransferChecked {
            from: self.streamer_ata.to_account_info(),
            authority: self.streamer_state.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.receiving_ata.to_account_info(),
         };

          let tx_to_treasury_accounts = TransferChecked {
            from: self.streamer_ata.to_account_info(),
            authority: self.streamer_state.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.treasury_account.to_account_info(),
         };

        let signer = &self.signer.key();
         let signer_seeds: &[&[&[u8]]] = &[&[
            b"user",
            signer.as_ref(),
            &[self.streamer_state.bump]
         ]];

         let tx_to_user_cpi = CpiContext::new_with_signer(self.token_program.to_account_info(), tx_to_user_accounts, signer_seeds);

         let tx_to_treasury_cpi = CpiContext::new_with_signer(self.token_program.to_account_info(), tx_to_treasury_accounts, signer_seeds);

        // send tx
        transfer_checked(tx_to_treasury_cpi, total_amount_platform_receives, self.token_mint.decimals)?;

        transfer_checked(tx_to_user_cpi, amount_user_receives, self.token_mint.decimals)?;

        Ok(())
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct WithdrawParams {
    pub gas_in_usdc: u64,
    pub amount: u64
}