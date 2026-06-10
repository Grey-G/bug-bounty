/**
 * Illustrative adapter boundary for wiring this demo to the official
 * @solana/subscriptions client. It is intentionally kept out of the default
 * test command because RPC, wallet, mint, and token-account setup differ by
 * environment.
 */

import { SubscriptionsClient } from "@solana/subscriptions";

type PublicKeyLike = string;

type FixedAllowanceParams = {
  client: SubscriptionsClient;
  owner: PublicKeyLike;
  delegate: PublicKeyLike;
  mint: PublicKeyLike;
  amountBaseUnits: bigint;
  expiresAtUnixSeconds: bigint;
};

export async function openAgentFixedAllowance(params: FixedAllowanceParams) {
  const { client, owner, delegate, mint, amountBaseUnits, expiresAtUnixSeconds } = params;

  await client.initSubscriptionAuthority({
    owner,
    mint
  });

  return client.createFixedDelegation({
    owner,
    delegate,
    mint,
    amount: amountBaseUnits,
    expiresAt: expiresAtUnixSeconds
  });
}

type SettleMeteredCallParams = {
  client: SubscriptionsClient;
  delegation: PublicKeyLike;
  sourceTokenAccount: PublicKeyLike;
  merchantTokenAccount: PublicKeyLike;
  amountBaseUnits: bigint;
};

export async function settleMeteredCall(params: SettleMeteredCallParams) {
  const { client, delegation, sourceTokenAccount, merchantTokenAccount, amountBaseUnits } = params;

  return client.transferFixed({
    delegation,
    sourceTokenAccount,
    destinationTokenAccount: merchantTokenAccount,
    amount: amountBaseUnits
  });
}
