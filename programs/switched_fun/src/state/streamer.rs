use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Streamer {
    pub user_wallet: Pubkey,
    pub user_token_account: Pubkey,
    pub bump: u8,
}
