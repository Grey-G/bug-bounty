# Demo Output

Captured on 2026-06-10 with Node.js 20+.

## Tests

```text
> paystream-agent-allowance-demo@0.1.0 test
> node --test

✔ settles metered service calls against a fixed allowance
✔ rejects a charge that would exceed the user-approved cap
✔ rejects an expired allowance
✔ requires authority setup before delegation creation

tests 4
pass 4
fail 0
```

## Scenario

```text
Paystream Agent Allowance Demo
================================
Authority: sa_69a8ba92f6c7e606
Delegation: fixed_67ba9ad29090f9d5
Budget: 0.25 USDC

Settled metered calls:
- signal.canada-market: 0.07 USDC; remaining 0.18 USDC
  Mapped three Canadian builder angles for Solana native subscriptions.
- llm.technical-brief: 0.06 USDC; remaining 0.12 USDC
  Explained allowance-bounded agent spend for bounded agent API spend.
- doc.render: 0.08 USDC; remaining 0.04 USDC
  Rendered investor-ready markdown for pay-as-you-go API report.

Denied over-cap call:
- ALLOWANCE_CAP_EXCEEDED: 0.05 USDC requested; 0.04 USDC remaining

Event log:
1. authority.enabled
2. fixed_delegation.created
3. charge.settled
4. charge.settled
5. charge.settled
6. charge.denied
```
