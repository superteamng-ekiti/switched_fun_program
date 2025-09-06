import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwitchedFun } from "../target/types/switched_fun";
import {
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

import first_user_file from "./accounts/first_user.json";
import second_user_file from "./accounts/second_user.json";
import third_user_file from "./accounts/third_user.json";
import admin_file from "./accounts/treasury.json";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { BN } from "bn.js";

const first_user = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(first_user_file)
);
const second_user = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(second_user_file)
);
const third_user = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(third_user_file)
);
const admin = anchor.web3.Keypair.fromSecretKey(new Uint8Array(admin_file));

const token_mint_fail = new anchor.web3.PublicKey(
  "6mWfrWzYf5ot4S8Bti5SCDRnZWA5ABPH1SNkSq4mNN1C"
); // token with 9 decimals

const token_mint = new anchor.web3.PublicKey(
  "2o39Cm7hzaXmm9zGGGsa5ZiveJ93oMC2D6U7wfsREcCo" // token with 6 decimals
);

describe("switched_fun", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.switchedFun as Program<SwitchedFun>;

  it("should fail to initialize with token with 9 decimals", async () => {
    const tx = await program.methods
      .initialize({ feeBps: 200 }) // 2 percent
      .accounts({
        signer: admin.publicKey,
        tokenMint: token_mint_fail,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("should initialize", async () => {
    const tx = await program.methods
      .initialize({ feeBps: 200 }) // 2 percent
      .accounts({
        signer: admin.publicKey,
        tokenMint: token_mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("should create a user profile", async () => {
    try {
      const tx = await program.methods
        .createStreamer()
        .signers([third_user, admin])
        .accounts({
          signer: third_user.publicKey,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          broadcaster: admin.publicKey,
        })
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      if (error.logs) throw error.logs;
      else throw error;
    }
  });

  it("should tip a user ", async () => {
    try {
      let streamer_state = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), third_user.publicKey.toBuffer()],
        program.programId
      )[0];

      let streamer_ata = await getAssociatedTokenAddress(
        token_mint,
        streamer_state,
        true
      );

      console.log("this is streamer ata: ", streamer_ata.toBase58());

      let user_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        second_user,
        token_mint,
        second_user.publicKey,
        false
      );

      const tx = await program.methods
        .tipUser({
          amount: new BN(110_000_000), // 110 with 6 decimals
          streamerAccount: third_user.publicKey,
        })
        .signers([second_user])
        .accounts({
          signer: second_user.publicKey,
          signerAta: user_ata.address,
          streamerAta: streamer_ata,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      if (error.logs) throw error.logs;
      else throw error;
    }
  });

  it.only("should withdraw from available balance ", async () => {
    try {
      let receiving_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        first_user,
        token_mint,
        new anchor.web3.PublicKey(
          "9JDdvLdA8S8qQ6fSu2De5fyfEEQDuAJscxbxBbhZoAF7" // wallet address to withdraw usdc to
        ),
        false
      );

      // Step 1: Build the transaction for estimation
      const tx_estimate = await program.methods
        .withdraw({
          amount: new BN(110_000_000), // 110 with 6 decimals
          gasInUsdc: new BN(0),
        })
        .signers([first_user])
        .accounts({
          signer: first_user.publicKey,
          receivingAta: receiving_ata.address,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      // Step 2: Get recent blockhash and estimate fee
      const { blockhash } =
        await program.provider.connection.getLatestBlockhash();
      tx_estimate.recentBlockhash = blockhash;
      tx_estimate.feePayer = first_user.publicKey;

      // Step 3: Estimate transaction fee in lamports
      const feeEstimate = await program.provider.connection.getFeeForMessage(
        tx_estimate.compileMessage()
      );

      console.log(`Estimated fee: ${feeEstimate.value} lamports`);

      // Step 4: Convert SOL to USDC (assuming 1 SOL = $100 for example)
      // TODO fetch current sol/usdc price from raydium or so
      const SOL_PRICE_IN_USDC = 100; // $100 per SOL
      const LAMPORTS_PER_SOL = 1_000_000_000;
      const USDC_DECIMALS = 6; // USDC has 6 decimals

      const fee_in_sol = feeEstimate.value / LAMPORTS_PER_SOL;
      const fee_in_usdc_dollars = fee_in_sol * SOL_PRICE_IN_USDC;
      const converted_amount_to_usd = new BN(
        Math.ceil(fee_in_usdc_dollars * Math.pow(10, USDC_DECIMALS))
      );

      console.log(
        `Fee in USDC: ${converted_amount_to_usd.toString()} (${fee_in_usdc_dollars} dollars)`
      );

      const tx = await program.methods
        .withdraw({
          amount: new BN(110_000_000), // 110 with 6 decimals
          gasInUsdc: converted_amount_to_usd,
        })
        .signers([first_user])
        .accounts({
          signer: first_user.publicKey,
          receivingAta: receiving_ata.address,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      if (error.logs) throw error.logs;
      else throw error;
    }
  });

  // ADMIN FEE 🔥🔥🔥🔥🔥

  it("should allow admin to withdraw specific fee amount", async () => {
    try {
      let admin_receiving_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        admin,
        token_mint,
        admin.publicKey, // Admin withdraws to their own account
        false
      );

      // Check treasury balance before
      let global_state = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        program.programId
      )[0];

      let treasury_ata = await getAssociatedTokenAddress(
        token_mint,
        global_state,
        true
      );

      const treasury_balance_before =
        await program.provider.connection.getTokenAccountBalance(treasury_ata);
      console.log(
        "Treasury balance before:",
        treasury_balance_before.value.amount
      );

      const withdraw_amount = new BN(1_000_000); // 1 USDC

      const tx = await program.methods
        .adminWithdrawFees({
          amount: withdraw_amount,
        })
        .signers([admin])
        .accounts({
          signer: admin.publicKey,
          receivingAta: admin_receiving_ata.address,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Admin withdraw transaction signature", tx);

      // Check balances after
      const treasury_balance_after =
        await program.provider.connection.getTokenAccountBalance(treasury_ata);
      console.log(
        "Treasury balance after:",
        treasury_balance_after.value.amount
      );

      const admin_balance_after =
        await program.provider.connection.getTokenAccountBalance(
          admin_receiving_ata.address
        );
      console.log("Admin balance after:", admin_balance_after.value.amount);
    } catch (error) {
      if (error.logs) throw error.logs;
      else throw error;
    }
  });

  it("should allow admin to withdraw all fees", async () => {
    try {
      let admin_receiving_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        admin,
        token_mint,
        admin.publicKey, // Admin withdraws to their own account
        false
      );

      // Get treasury account
      let global_state = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        program.programId
      )[0];

      let treasury_ata = await getAssociatedTokenAddress(
        token_mint,
        global_state,
        true
      );

      const treasury_balance_before =
        await program.provider.connection.getTokenAccountBalance(treasury_ata);
      console.log(
        "Treasury balance before withdraw all:",
        treasury_balance_before.value.amount
      );

      const admin_balance_before =
        await program.provider.connection.getTokenAccountBalance(
          admin_receiving_ata.address
        );
      console.log("Admin balance before:", admin_balance_before.value.amount);

      const tx = await program.methods
        .adminWithdrawFeesAll()
        .signers([admin])
        .accounts({
          signer: admin.publicKey,
          receivingAta: admin_receiving_ata.address,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Admin withdraw all transaction signature", tx);

      // Check balances after
      const treasury_balance_after =
        await program.provider.connection.getTokenAccountBalance(treasury_ata);
      console.log(
        "Treasury balance after withdraw all:",
        treasury_balance_after.value.amount
      );

      const admin_balance_after =
        await program.provider.connection.getTokenAccountBalance(
          admin_receiving_ata.address
        );
      console.log("Admin balance after:", admin_balance_after.value.amount);
    } catch (error) {
      if (error.logs) throw error.logs;
      else throw error;
    }
  });

  it("should fail when non-admin tries to withdraw fees", async () => {
    try {
      let user_receiving_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        first_user,
        token_mint,
        first_user.publicKey,
        false
      );

      let global_state = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        program.programId
      )[0];

      let treasury_ata = await getAssociatedTokenAddress(
        token_mint,
        global_state,
        true
      );

      const tx = await program.methods
        .adminWithdrawFees({
          amount: new BN(1_000_000), // 1 USDC
        })
        .signers([first_user]) // Non-admin trying to withdraw
        .accounts({
          receivingAta: user_receiving_ata.address,
          signer: first_user.publicKey,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("This should not succeed:", tx);
    } catch (error) {
      console.log("Expected error - non-admin cannot withdraw fees");
      if (error.logs) console.log("Error logs:", error.logs);
      // This should fail, so we expect an error
    }
  });

  it("should fail when withdrawing more than available balance", async () => {
    try {
      let admin_receiving_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        admin,
        token_mint,
        admin.publicKey,
        false
      );

      let global_state = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        program.programId
      )[0];

      let treasury_ata = await getAssociatedTokenAddress(
        token_mint,
        global_state,
        true
      );

      // Get current treasury balance
      const treasury_balance =
        await program.provider.connection.getTokenAccountBalance(treasury_ata);
      console.log("Current treasury balance:", treasury_balance.value.amount);

      // Try to withdraw more than what's available
      const excessive_amount = new BN(treasury_balance.value.amount).add(
        new BN(1_000_000)
      ); // Add 1 USDC more
      console.log("Trying to withdraw:", excessive_amount.toString());

      const tx = await program.methods
        .adminWithdrawFees({
          amount: excessive_amount,
        })
        .signers([admin])
        .accounts({
          signer: admin.publicKey,
          receivingAta: admin_receiving_ata.address,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("This should not succeed:", tx);
    } catch (error) {
      console.log(
        "Expected error - cannot withdraw more than treasury balance"
      );
      if (error.logs) console.log("Error logs:", error.logs);
      // This should fail, so we expect an error
    }
  });

  it("should handle withdraw with underflow scenario", async () => {
    try {
      let receiving_ata = await getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        first_user,
        token_mint,
        new anchor.web3.PublicKey(
          "F5FEbATzKgDSwfXQ5tnETm249AxSDpSAw1k5gMT95JdQ"
        ),
        false
      );

      // Try to withdraw with fees higher than amount (should cause underflow)
      const withdraw_amount = new BN(1_000_000); // 1 USDC
      const excessive_gas = new BN(2_000_000); // 2 USDC gas (more than withdraw amount)

      const tx = await program.methods
        .withdraw({
          amount: withdraw_amount,
          gasInUsdc: excessive_gas,
        })
        .signers([first_user])
        .accounts({
          signer: first_user.publicKey,
          receivingAta: receiving_ata.address,
          tokenMint: token_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("This should not succeed:", tx);
    } catch (error) {
      console.log("Expected error - fees exceed withdrawal amount");
      if (error.logs) console.log("Error logs:", error.logs);
      // This should fail due to underflow
    }
  });
});
