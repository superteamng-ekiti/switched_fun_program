import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwitchedFun } from "../target/types/switched_fun";
import { getMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

import first_user from "./accounts/first_user.json";
import second_user from "./accounts/second_user.json";
import treasury from "./accounts/treasury.json";

const firstUserSecretKey = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(first_user)
);

const secondUserSecretKey = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(second_user)
);

const treasuryAccount = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(treasury)
);

const treasury_account = treasuryAccount.publicKey;

console.log(treasury_account.toBase58());
console.log("first_account", firstUserSecretKey.publicKey.toBase58());
console.log("second_account", secondUserSecretKey.publicKey.toBase58());

const token_mint = new anchor.web3.PublicKey(
  "6mWfrWzYf5ot4S8Bti5SCDRnZWA5ABPH1SNkSq4mNN1C"
);

describe("switched_fun", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  // const s_tokenAccount = await getOrCreateAssociatedTokenAccount(
  //   provider.connection,
  //   firstUserSecretKey,
  //   token_mint,
  //   secondUserSecretKey.publicKey
  // );

  // const f_tokenAccount = await getOrCreateAssociatedTokenAccount(
  //   provider.connection,
  //   secondUserSecretKey,
  //   token_mint,
  //   firstUserSecretKey.publicKey
  // );

  // console.log("second_token_account", s_tokenAccount.address.toBase58());
  // console.log("first_token_account", f_tokenAccount.address.toBase58());

  const program = anchor.workspace.switchedFun as Program<SwitchedFun>;
  // it("should initialize", async () => {

  //   const tx = await program.methods
  //     .initialize(treasury_account, 100)
  //     .accounts({ signer: firstUserSecretKey.publicKey })
  //     .signers([firstUserSecretKey])
  //     .rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it("should tip a user", async () => {
    const mintInfo = await getMint(provider.connection, token_mint);
    const decimals = mintInfo.decimals;

    const amount = 3.3;
    const lamports = amount * 10 ** decimals;

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      secondUserSecretKey,
      token_mint,
      secondUserSecretKey.publicKey
    );
    console.log("new_token_account", tokenAccount.address.toBase58());
    const tx = await program.methods
      .tipUser(new anchor.BN(lamports))
      .accounts({
        recipient: firstUserSecretKey.publicKey,
        tipper: secondUserSecretKey.publicKey,
        tipperTokenAccount: tokenAccount.address.toBase58(),
        tokenMint: token_mint
      })
      .signers([secondUserSecretKey])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("should withdraw tips to an account", async () => {
    const mintInfo = await getMint(provider.connection, token_mint);
    const decimals = mintInfo.decimals;

    const amount = 1.3;
    const lamports = amount * 10 ** decimals;

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      firstUserSecretKey,
      token_mint,
      firstUserSecretKey.publicKey
    );

    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      firstUserSecretKey,
      token_mint,
      treasury_account
    );
    console.log("new_token_account", tokenAccount.address.toBase58());
    const tx = await program.methods
      .withdraw(new anchor.BN(lamports))
      .accounts({
        recipient: firstUserSecretKey.publicKey,
        recipientTokenAccount: tokenAccount.address.toBase58(),
        treasuryTokenAccount: treasuryTokenAccount.address.toBase58()
      })
      .signers([firstUserSecretKey])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("should fetch the user tip PDA (recipient_state_account)", async () => {
    const [recipientStatePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("recipient_state"), firstUserSecretKey.publicKey.toBuffer()],
      program.programId
    );

    const recipientStateAccount = await program.account.userAccount.fetch(
      recipientStatePDA
    );

    console.log("Recipient State PDA:", recipientStatePDA.toBase58());
    console.log("Recipient State Data:", recipientStateAccount);
  });

  it("should show all tokens the user has", async () => {
    const tokenAccounts =
      await provider.connection.getParsedTokenAccountsByOwner(
        firstUserSecretKey.publicKey,
        {
          programId: new anchor.web3.PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ) // SPL Token program
        }
      );

    console.log("Token Accounts:");
    for (const { pubkey, account } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info;
      const mint = parsedInfo.mint;
      const amount = parsedInfo.tokenAmount.uiAmountString;

      console.log(`- Token Account: ${pubkey.toBase58()}`);
      console.log(`  Mint: ${mint}`);
      console.log(`  Balance: ${amount}`);
    }
  });
});
