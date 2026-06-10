# On-chain Mapping

This demo is a deterministic local harness for a Solana Subscriptions and Allowances integration. It does not require keys, devnet SOL, or a running validator, so reviewers can run the scenario quickly and inspect the receipts. The same state transitions map directly to the native program flow.

## Official Primitive

Solana's native subscriptions program supports:

- Fixed delegation: a user pre-authorizes a delegate to spend up to a total cap before expiry.
- Recurring delegation: a cap that resets each period.
- Subscription plans: a merchant publishes fixed billing terms and pulls each cycle after a user subscribes.

The official program ID is:

```text
De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44
```

## Demo to Program Mapping

| Demo concept | Local code | Native subscriptions client |
| --- | --- | --- |
| User enables payment authority for a mint | `ledger.enableAuthority()` | `SubscriptionsClient.initSubscriptionAuthority()` |
| User grants an AI agent a budget | `ledger.createFixedDelegation()` | `SubscriptionsClient.createFixedDelegation()` |
| Agent calls a paid API endpoint | `gateway.call()` | Service executes after an allowance-backed request |
| Merchant settles one metered request | `ledger.chargeAllowance()` | `SubscriptionsClient.transferFixed()` |
| Over-budget request fails before execution | `ALLOWANCE_CAP_EXCEEDED` | Transfer fails because the delegation PDA cannot authorize the requested amount |
| Expired request fails before execution | `ALLOWANCE_EXPIRED` | Transfer fails because the delegation expiry has passed |

## Why This Is Useful

The demo targets a concrete agentic-commerce workflow:

1. A user gives an autonomous research agent a 30 minute USDC budget.
2. The agent calls several metered APIs through a pay-as-you-go gateway.
3. Each API call produces a receipt that includes amount, merchant, service, memo, and remaining budget.
4. The gateway refuses calls once the cap is reached or the allowance expires.

This pattern is useful for AI agents because the user does not need to sign every service call, while the agent cannot exceed the approved budget.

## Production Integration Notes

For a production implementation:

1. Replace `AllowanceLedger` with the official `@solana/subscriptions` TypeScript client.
2. Keep the same gateway policy: authorize before executing a metered service.
3. Persist on-chain transaction signatures instead of local event sequence numbers.
4. Index program events for merchant reconciliation and user-facing receipts.
5. Use recurring delegations for monthly agent spending limits and subscription plans for flat-fee API tiers.

The `examples/subscriptions-sdk-flow.ts` file shows the shape of the adapter boundary so the local gateway can be swapped for the official client without changing the metered-service code.
