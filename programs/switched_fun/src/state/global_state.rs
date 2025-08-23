use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub platform_fee_bps: u16,
    pub plaftorm_fee_account: Pubkey,
    pub supported_tokens_mint: Pubkey,
    pub bump: u8,
    pub initialized: bool,
}
