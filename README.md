# Paystream Agent Allowance Demo

A runnable code sample showing how Solana Native Subscriptions and Allowances can power metered AI-agent API access.

The demo models a user who gives an autonomous research agent a short-lived USDC budget. The agent calls several paid API services through a gateway. Each call is settled against the allowance and returns a receipt. When the agent tries to spend beyond the approved cap, the gateway rejects the call before the service executes.

## Why This Exists

Solana's subscriptions program supports fixed delegations, recurring delegations, and subscription plans. Fixed delegations are a natural fit for AI agents: the user can approve a bounded budget once, then let the agent operate without signing every request.

This repository focuses on one use case:

- A user grants `maple-research-agent.sol` a `0.25 USDC` fixed allowance for 30 minutes.
- The agent buys small metered API calls from a pay-as-you-go gateway.
- The gateway produces itemized receipts and refuses over-budget work.
- The same boundary can be wired to the official `@solana/subscriptions` client.

## Run It

Requirements: Node.js 20 or newer.

```bash
npm test
npm run demo
```

Expected demo shape:

```text
Paystream Agent Allowance Demo
================================
Authority: sa_...
Delegation: fixed_...
Budget: 0.25 USDC

Settled metered calls:
- signal.canada-market: 0.07 USDC; remaining 0.18 USDC
- llm.technical-brief: 0.06 USDC; remaining 0.12 USDC
- doc.render: 0.08 USDC; remaining 0.04 USDC

Denied over-cap call:
- ALLOWANCE_CAP_EXCEEDED: 0.05 USDC requested; 0.04 USDC remaining
```

## Files

- `src/ledger.js` implements the allowance state machine: authority setup, fixed delegation, charge settlement, cap checks, expiry checks, and receipts.
- `src/gateway.js` shows how a metered API gateway can authorize payment before running a service.
- `src/scenario.js` runs the end-to-end agent workflow.
- `test/ledger.test.js` verifies successful settlement, over-cap rejection, expiry rejection, and missing-authority rejection.
- `docs/ONCHAIN_MAPPING.md` maps the local harness to Solana's native subscriptions program and client methods.
- `examples/subscriptions-sdk-flow.ts` sketches the adapter boundary for replacing the local ledger with `@solana/subscriptions`.

## Solana Mapping

The local demo method names intentionally mirror the native flow:

| Demo | Native subscriptions concept |
| --- | --- |
| `enableAuthority()` | initialize the Subscription Authority PDA for `(user, mint)` |
| `createFixedDelegation()` | grant a delegate a capped allowance with optional expiry |
| `chargeAllowance()` | settle one metered request through the fixed delegation |
| `ALLOWANCE_CAP_EXCEEDED` | prevent the agent from exceeding the user-approved budget |
| `ALLOWANCE_EXPIRED` | prevent spending after the authorization window closes |

The official program supports SPL Token and Token-2022, fixed delegations, recurring delegations, and merchant subscription plans. The program ID published by the Solana subscriptions repository is:

```text
De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44
```

## Canadian Angle

The example uses a Canadian market-signal service because this bounty is sponsored by Superteam Canada. The same pattern could be used by Canadian API providers, developer-tooling companies, or AI workflow products that want to sell stablecoin-metered services without custom billing infrastructure.

## Extension Ideas

- Replace the local ledger with the official TypeScript client and devnet token accounts.
- Add recurring delegations for monthly agent spend limits.
- Add subscription plans for flat-fee API tiers.
- Index on-chain events into a merchant dashboard for receipts and reconciliation.
- Add pay.sh discovery metadata so agents can find and pay for services automatically.
