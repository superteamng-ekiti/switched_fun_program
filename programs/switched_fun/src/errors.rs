use anchor_lang::prelude::*;

#[error_code]
pub enum SwitchedError {
    #[msg("The project is already initialized.")]
    AlreadyInitialized,
    #[msg("The project is not initialized.")]
    NotInitialized,
    #[msg("Not your Turn")]
    NotTurn,
    #[msg("The task is not completed.")]
    TaskNotCompleted,
    #[msg("The caller is not a participant.")]
    NotAParticipant,
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Invalid Parameter Treasury.")]
    TreasuryError,
    #[msg("Invalid Parameter percentage bps.")]
    BasePointError,
    #[msg("Invalid Tip Amount")]
    InvalidAmount,
    #[msg("Insufficient Vault Amount")]
    InsufficientVaultBalance,
}
