use anchor_lang::prelude::*;

#[error_code]
pub enum SwitchedError {
    #[msg("The project is already initialized.")]
    AlreadyInitialized,
    #[msg("The project is not initialized.")]
    NotInitialized,
    #[msg("Not your Turn")]
    WrongOwner,
    #[msg("Unauthorized access, cannot withdraw on user's behalf")]
    Unauthorized,
    #[msg("Invalid Treasury Account")]
    TreasuryError,
    #[msg("Invalid Parameter percentage bps.")]
    BasePointError,
    #[msg("Invalid Tip Amount")]
    InvalidAmount,
    #[msg("Insufficient Vault Amount")]
    InsufficientVaultBalance,
    #[msg("Token Decimal should be 6")]
    InvalidMint,
    #[msg("You provided a wrong mint Address")]
    InvalidMintAddress,
    #[msg("Multiplication overflow")]
    MultiplicationOverflow,
    #[msg("Division overflow")]
    DivisionOverflow,
}
