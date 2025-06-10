use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

mod errors;
use errors::SwitchedError;

declare_id!("2nRFUpSks6sq5Tbku9FPivk2VruxJTG6e6K4H33NFaar");

#[program]
pub mod switched_fun {
    use anchor_spl::token_interface::spl_pod::option::Nullable;

    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        treasury: Pubkey,
        percentage_bps: u16,
    ) -> Result<()> {
        // msg!("Greetings from: {:?}", ctx.program_id);

        let global_state = &mut ctx.accounts.global_state;

        require!(
            !global_state.is_initialized,
            SwitchedError::AlreadyInitialized
        );
        require!(!treasury.is_none(), SwitchedError::TreasuryError);
        require!(
            percentage_bps > 0 && percentage_bps < 2000,
            SwitchedError::TreasuryError
        );

        global_state.owner = *ctx.accounts.signer.key;
        global_state.is_initialized = true;
        global_state.treasury_cut_bps = percentage_bps;
        global_state.treasury = treasury;

        Ok(())
    }

    pub fn tip_user(ctx: Context<TipUser>, amount: u64) -> Result<()> {
        require!(amount > 0, SwitchedError::InvalidAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.tipper_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.tipper.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, SwitchedError::InvalidAmount);
        let vault_token_account = &ctx.accounts.vault_token_account;
        let recepient_account = &ctx.accounts.recipient_state_account;

        // require!(
        //     vault_token_account.amount >= amount,
        //     SwitchedError::InsufficientVaultBalance
        // );

        let denoted_account = recepient_account.key();

        let fee_bps = ctx.accounts.global_state.treasury_cut_bps;
        let fee_amount = amount * fee_bps as u64 / 10_000;
        let payout_amount = amount - fee_amount;

        let seeds = &[
            b"vault_authority",
            denoted_account.as_ref(),
            &[ctx.bumps.vault_authority],
        ];

        // Transfer payout to recipient
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: vault_token_account.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            payout_amount,
        )?;

        // Transfer fee to treasury
        if fee_amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: vault_token_account.to_account_info(),
                        to: ctx.accounts.treasury_token_account.to_account_info(),
                        authority: ctx.accounts.vault_authority.to_account_info(),
                    },
                    &[seeds],
                ),
                fee_amount,
            )?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=signer, seeds=[b"global-state"], bump, space= 8 + GlobalState::INIT_SPACE)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub recipient: Signer<'info>,

    #[account(
        mut,
        seeds = [b"recipient_state", recipient.key().as_ref()],
        bump,
    )]
    pub recipient_state_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"vault", recipient_state_account.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"vault_authority", recipient_state_account.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA that owns the vault_token_account
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"global-state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// CHECK: Treasury token account must match global_state.treasury
    #[account(mut, constraint = treasury_token_account.owner == global_state.treasury)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TipUser<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,

    #[account(mut)]
    pub tipper_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        seeds = [b"vault", recipient_state_account.key().as_ref()],
        bump,
        payer = tipper,
        token::mint = token_mint,
        token::authority = vault_authority
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"vault_authority", recipient_state_account.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA that owns the vault_token_account
    pub vault_authority: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,

    /// This account is unique per recipient and can store metadata, but doesn’t need to track token balances
    #[account(
        init_if_needed,
        payer = tipper,
        seeds = [b"recipient_state", recipient.key().as_ref()],
        bump,
        space = 8 + UserAccount::INIT_SPACE
    )]
    pub recipient_state_account: Account<'info, UserAccount>,

    /// CHECK: Recipient is only used for seed derivation
    pub recipient: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// yeah i'm typicallyy wasting space here, i should have just used pub struct UserAccount {}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub creator: Pubkey,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct GlobalState {
    pub treasury: Pubkey,      // Treasury address
    pub treasury_cut_bps: u16, // Treasury cut in basis points (e.g., 100 = 1%)
    pub is_initialized: bool,  // Flag to check if the project is initialized
    pub owner: Pubkey,         // Owner of the program
}
