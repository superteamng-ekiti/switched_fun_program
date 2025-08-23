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
import admin_file from "./accounts/treasury.json";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { BN } from "bn.js";

const first_user = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(first_user_file)
);
const second_user = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(second_user_file)
);
const admin = anchor.web3.Keypair.fromSecretKey(new Uint8Array(admin_file));

const token_mint_fail = new anchor.web3.PublicKey(
  "6mWfrWzYf5ot4S8Bti5SCDRnZWA5ABPH1SNkSq4mNN1C"
); // token with 9 decimals

const token_mint = new anchor.web3.PublicKey(
  "2o39Cm7hzaXmm9zGGGsa5ZiveJ93oMC2D6U7wfsREcCo"
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
        .signers([first_user])
        .accounts({
          signer: first_user.publicKey,
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

  it("should tip a user ", async () => {
    try {
      let streamer_state = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), first_user.publicKey.toBuffer()],
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
          streamerAccount: first_user.publicKey,
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
          "F5FEbATzKgDSwfXQ5tnETm249AxSDpSAw1k5gMT95JdQ" // wallet address to withdraw usdc to
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
});
