/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/switched_fun.json`.
 */
export type SwitchedFun = {
  "address": "68SNbqCu7s3PUN3oj5nHdwNyHL8b9wSQZo9NTTWaoWXr",
  "metadata": {
    "name": "switchedFun",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "treasury",
          "type": "pubkey"
        },
        {
          "name": "percentageBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "tipUser",
      "discriminator": [
        52,
        201,
        192,
        44,
        149,
        248,
        9,
        110
      ],
      "accounts": [
        {
          "name": "tipper",
          "writable": true,
          "signer": true
        },
        {
          "name": "tipperTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "recipientStateAccount"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "recipientStateAccount"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "recipientStateAccount",
          "docs": [
            "This account is unique per recipient and can store metadata, but doesn’t need to track token balances"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  105,
                  112,
                  105,
                  101,
                  110,
                  116,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "recipient"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "recipient",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipientStateAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  105,
                  112,
                  105,
                  101,
                  110,
                  116,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "recipientStateAccount"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "recipientStateAccount"
              }
            ]
          }
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "globalState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "globalState",
      "discriminator": [
        163,
        46,
        74,
        168,
        216,
        123,
        133,
        98
      ]
    },
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadyInitialized",
      "msg": "The project is already initialized."
    },
    {
      "code": 6001,
      "name": "notInitialized",
      "msg": "The project is not initialized."
    },
    {
      "code": 6002,
      "name": "notTurn",
      "msg": "Not your Turn"
    },
    {
      "code": 6003,
      "name": "taskNotCompleted",
      "msg": "The task is not completed."
    },
    {
      "code": 6004,
      "name": "notAParticipant",
      "msg": "The caller is not a participant."
    },
    {
      "code": 6005,
      "name": "unauthorized",
      "msg": "Unauthorized access."
    },
    {
      "code": 6006,
      "name": "treasuryError",
      "msg": "Invalid Parameter Treasury."
    },
    {
      "code": 6007,
      "name": "basePointError",
      "msg": "Invalid Parameter percentage bps."
    },
    {
      "code": 6008,
      "name": "invalidAmount",
      "msg": "Invalid Tip Amount"
    },
    {
      "code": 6009,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient Vault Amount"
    }
  ],
  "types": [
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "treasuryCutBps",
            "type": "u16"
          },
          {
            "name": "isInitialized",
            "type": "bool"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
