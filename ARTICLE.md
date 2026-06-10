# Solana Subscriptions and Allowances: A Native Billing Layer for Bounded AI Agents

Solana's new Subscriptions and Allowances primitive is more than a recurring payments feature. It is a policy layer for delegated token movement: users can authorize bounded spending once, then let a merchant, application, wallet program, or AI agent execute payments inside that envelope without asking for a fresh signature every time.

That matters because the next useful payment surface is not only a human clicking "subscribe." It is also a command line tool buying an API call, a research agent paying for a data enrichment endpoint, a merchant pulling a monthly stablecoin invoice, or a software platform collecting usage based fees after the user has already agreed to the terms.

This writeup explains the architecture, the three supported models, how it fits agentic commerce and pay.sh-style API access, and where builders should be careful when taking it into production.

## Sources and Companion Demo

This article is based on the public Solana and subscriptions-program materials:

- Solana Foundation announcement: https://solana.com/news/subscriptions-and-allowances
- Solana subscriptions program repository: https://github.com/solana-foundation/subscriptions
- Solana developer docs for subscription plans: https://solana.com/docs/payments/subscriptions/subscription-plan
- Chainstack technical guide: https://docs.chainstack.com/docs/solana-subscriptions-and-allowances

Companion code sample:

- Repository branch: https://github.com/Grey-G/bug-bounty/tree/paystream-agent-allowance-demo
- Verified demo output: https://github.com/Grey-G/bug-bounty/blob/paystream-agent-allowance-demo/DEMO_OUTPUT.md

The demo models a user granting an AI research agent a short lived USDC allowance, then using that allowance to pay for metered API calls. It is intentionally local and deterministic so reviewers can run it without keys, devnet SOL, or a wallet.

## The Problem: Billing Needs Permission That Can Last

Most internet billing flows assume an account can be charged later. Credit cards make that easy because the user gives a merchant reusable payment credentials and the card network handles authorization, disputes, and settlement. On-chain wallets are usually the opposite: the user signs each transaction, and that signature authorizes exactly what the transaction says.

That is good for explicit consent. It is poor for recurring or metered commerce:

- A SaaS customer does not want to sign every monthly charge manually.
- A developer buying API usage does not want to sign every request.
- A merchant does not want to run an off-chain invoice system if the customer has stablecoins ready on-chain.
- An AI agent cannot be useful if it has to stop every few seconds for a human wallet prompt.

The obvious answer is delegation: let the user approve a spender up to a cap. Solana already has an SPL Token `Approve` instruction for that. The catch is that a token account has only one delegate. If a wallet sets one delegate for a subscription, then another delegate for a card-linked program, then a third delegate for an agent budget, each approval can conflict with the previous one.

Subscriptions and Allowances solves that by turning the one delegate into a shared authority and moving the real spending rules into separate program accounts.

## Core Architecture: One Subscription Authority, Many Policy Accounts

The central idea is a Subscription Authority PDA for each `(user, mint)` pair.

When a user initializes the authority for a token mint, the subscriptions program makes that PDA the single SPL Token delegate on the user's token account, with a very large approval. From the token program's point of view, there is still only one delegate, so the one-delegate limitation is respected.

But the Subscription Authority is not the business policy. It is the gateway.

Actual permissions live in other PDAs:

- Fixed delegation accounts for one-time allowances.
- Recurring delegation accounts for per-period spend limits.
- Subscription delegation accounts for merchant plans.

On every transfer, the subscriptions program checks the relevant policy account before moving tokens. The policy account determines who can pull, how much can be pulled, whether a cap has been reached, whether the window has expired, and whether the transfer fits the accepted plan terms.

This produces a useful separation:

- The SPL Token account sees one delegate.
- The subscriptions program sees many simultaneous arrangements.
- Each arrangement has its own cap, cadence, expiry, and authorized caller.
- The user can revoke or close specific arrangements without destroying every payment relationship.

That is the architectural unlock. The raw token approval becomes shared infrastructure; the program becomes the policy engine.

## The Three Models

The primitive currently exposes three payment shapes.

### 1. Fixed Delegation: A Bounded Allowance

Fixed delegation is the cleanest model for AI agents and one-off budgets.

A user authorizes a delegate to spend up to a total amount, optionally before an expiry timestamp. The cap is consumed as transfers occur. Once the cap is exhausted or the expiry passes, additional pulls fail.

Example use cases:

- Give a research agent a 5 USDC budget for the next hour.
- Let a command line tool buy up to 1 USDC of API calls during a build.
- Authorize a card program or wallet extension to spend up to a capped amount.
- Give a customer support agent a budget for paid lookups.

This is the model implemented in the companion demo. The user grants `0.25 USDC` to an AI research agent. The agent buys three metered API services, then a fourth call is rejected because only `0.04 USDC` remains and the service costs `0.05 USDC`.

The important product property is that the user approves a maximum loss. The agent gets autonomy inside the budget, not unlimited access.

### 2. Recurring Delegation: A Resetting Budget

Recurring delegation is similar to a fixed delegation, but the amount resets on a cadence.

That makes it a better fit for ongoing relationships where the counterparty is not selling a fixed subscription plan:

- Payroll or contractor payouts.
- Weekly agent budgets.
- Monthly operational allowances for a team wallet.
- Usage buckets that reset each billing period.

The key distinction is that the user controls the spending rule directly. The user says, for example, that a delegate may pull up to a given amount each period. The merchant is not publishing the full plan; the user's delegation is the plan.

This can be useful when the payer wants to preserve more control than a merchant-created subscription plan allows.

### 3. Subscription Plans: Merchant Published Billing Terms

Subscription plans are closer to SaaS billing.

A merchant creates a plan with pricing terms, period length, destinations, pullers, and metadata. A subscriber accepts the current plan terms. Later, the merchant or an approved puller can collect according to those terms.

The Solana docs show this lifecycle:

1. The merchant creates a plan.
2. The subscriber initializes a subscription authority if needed.
3. The subscriber subscribes to the plan.
4. The merchant or whitelisted puller collects.
5. The subscriber can cancel and later revoke.

Two details matter for production design.

First, existing subscribers keep the terms they accepted. If a merchant changes mutable plan fields later, new subscribers can accept the updated terms, but old subscribers are not silently moved into new terms.

Second, only the merchant or approved pullers can collect. That allows businesses to separate the plan owner from operational collection infrastructure, while still keeping collection bounded by the plan.

## Why This Fits pay.sh and Agentic Commerce

The Solana Foundation announcement frames pay.sh as a pay-as-you-go layer for APIs where providers expose endpoints and users or AI agents can discover, access, and pay for services directly in stablecoins.

Without allowances, an agentic API flow has a UX problem. If each API call needs a wallet signature, the agent is no longer autonomous. If the user hands the agent broad wallet control, the risk is too high. If the provider builds off-chain credits, the flow starts to look like a conventional prepaid account.

Subscriptions and Allowances creates a cleaner middle path:

1. The user grants an agent a fixed allowance in USDC.
2. The agent discovers a paid API endpoint.
3. The gateway checks that the requested call fits the remaining allowance.
4. The service executes.
5. The merchant settles the request and returns a receipt.
6. The allowance decreases.
7. Over-budget or expired requests fail before execution.

This is the pattern the companion demo calls a metered gateway. It is not a wallet replacement. It is a payment guardrail around autonomous software.

The same pattern can support subscription tiers:

- Fixed allowance for exploratory pay-per-call usage.
- Recurring delegation for monthly agent budgets.
- Subscription plans for flat-fee API tiers.

That makes pay.sh-style discovery more practical because the payment method can match the service model.

## A Concrete Architecture for a Metered API Gateway

A production gateway using this primitive needs five pieces.

### 1. Discovery Metadata

Agents need to know what a service costs before they call it. A provider should expose machine readable metadata:

```json
{
  "service": "market-signal.brief",
  "price": "0.07",
  "mint": "USDC",
  "settlement": "fixed_delegation",
  "maxLatencyMs": 5000
}
```

The user interface can show the same data to humans before the allowance is granted.

### 2. Allowance Verification

Before executing the paid service, the gateway should verify:

- The delegation exists.
- The caller is authorized.
- The mint matches.
- The allowance has not expired.
- The remaining cap covers the requested price.
- The source token account and destination token account are valid for the mint.

This check should happen before doing expensive work. If the payment cannot settle, the gateway should fail fast.

### 3. Service Execution

Once the payment policy is valid, the provider can run the service. For deterministic services, the provider can settle first. For services where output generation cost is high, the provider may reserve or preflight before generating output.

The exact ordering depends on the provider's trust model and refund policy.

### 4. Settlement

For a fixed delegation, settlement is a transfer authorized by the delegation policy. For a subscription plan, settlement is the plan collection flow. For recurring budgets, settlement decrements the current period's remaining amount.

The receipt should include:

- Service ID.
- Price.
- Mint.
- Payer.
- Merchant.
- Delegation or subscription account.
- Transaction signature.
- Remaining allowance, if applicable.
- Timestamp.

### 5. Indexing and Reconciliation

The program emits events for subscription and transfer actions. Providers still need an indexer or reconciliation process. A merchant dashboard should not rely only on a frontend wallet state. It should reconcile on-chain events against internal service logs.

This is where many production payment systems fail. The transaction can succeed while the service log fails, or vice versa. The correct design treats the on-chain transfer and the service execution as two records that must be reconciled.

## Tradeoffs and Risks

The primitive is useful, but it does not remove every hard part of billing.

### Program Risk Replaces Merchant Custody Risk

With off-chain credits, the merchant holds the customer's prepaid balance in a database. With subscriptions and allowances, the user keeps funds in their token account, but the program has delegated transfer authority subject to policy checks.

That is a better custody model for many users, but it shifts attention to program correctness, audits, upgrade authority, and integration discipline. Builders should treat the subscriptions program as critical payment infrastructure, not a convenience library.

### The User Still Has To Understand the Approval

A bounded allowance is safer than unlimited wallet access, but users still need clear UI.

Wallets and apps should explain:

- Who can pull.
- Which token mint is involved.
- The maximum spend.
- The expiry.
- Whether the cap resets.
- How to cancel or revoke.

For AI agents, the UI should be extra explicit because the user's counterparty is software that may make many decisions after approval.

### Rent and Account Lifecycle Matter

The subscriptions repository documents rent costs for authorities, plans, and delegation accounts. Rent is recoverable when accounts close, but it still affects setup UX and small-value flows.

For high-value SaaS billing, rent is usually noise. For microtransactions, the design must avoid creating too many short-lived accounts or must batch flows carefully.

### Token and Account Compatibility Is Not Free

The program supports SPL Token and Token-2022. That is valuable, especially for stablecoins and future privacy-oriented token extensions. But production systems must still handle associated token accounts, mint decimals, base units, and token program selection.

Every billing bug involving decimals is expensive. Builders should display human units, store base units, and test both 6-decimal stablecoins and other supported mints.

### Timing and Liquidity Can Break a Perfect Plan

A merchant can only collect if the user's token account has funds and the policy still permits collection. Subscription plans reduce billing friction; they do not guarantee liquidity.

Production systems need states such as:

- Payment collected.
- Payment failed due to insufficient funds.
- Payment failed due to expired or canceled subscription.
- Grace period active.
- Service suspended.

These states exist in card billing too. On-chain billing makes them more transparent, not magically absent.

### Social and Business Adoption Still Matter

The primitive provides the rails. Merchants still need pricing, support, analytics, invoices, tax handling, refunds, and customer education.

The biggest winners will probably be products where on-chain settlement is a native advantage, not a novelty. API gateways, agent tools, stablecoin-first SaaS, cross-border contractor payments, and wallet-native commerce are stronger fits than forcing every consumer subscription onto a wallet flow.

## Canadian Use Cases

Superteam Canada asked for Canadian relevance. The clearest near-term opportunity is not "replace every Canadian SaaS billing system." It is to identify where stablecoin-native or agent-native payments remove friction.

### Shopify App and Developer Ecosystem

Shopify is a Canadian commerce platform with a large app ecosystem. A direct Shopify core integration would be a major business decision, but the surrounding developer ecosystem is a strong thought experiment.

Many Shopify apps charge usage-based fees: product enrichment, support automation, translation, analytics, fraud checks, and content generation. A Solana allowance can let a merchant give an automation agent a bounded budget for those services:

- 10 USDC per day for product description generation.
- 25 USDC per week for fraud enrichment calls.
- 100 USDC per month for catalog cleanup jobs.

The merchant does not need to preload credits with every provider. Providers do not need to store card details. The agent can buy services as needed inside a clear cap.

### Hootsuite-Style Social and Marketing Automation

Hootsuite is a Canadian social media management company. Social scheduling and analytics products often rely on metered enrichment: audience reports, sentiment checks, competitive monitoring, content generation, and campaign summaries.

An allowance model fits marketing automation because spend should be bounded by campaign:

- A brand grants an agent a campaign budget.
- The agent buys analytics and content generation calls.
- Each call settles in stablecoins with a receipt.
- The budget expires after the campaign window.

This maps better to fixed or recurring delegations than to a conventional monthly subscription because spend can be tied to a campaign objective rather than a seat count.

### Lightspeed-Style Retail Operations

Lightspeed is a Canadian commerce and point-of-sale company serving retailers and restaurants. Retail operations have many small, repeated software actions: inventory lookup, demand forecasting, menu analysis, supplier reconciliation, and local promotion generation.

A merchant-facing AI assistant could operate with a weekly allowance:

- Pull inventory intelligence.
- Generate pricing suggestions.
- Pay for local demand data.
- Produce campaign assets.

The retailer can approve a bounded operational budget instead of giving the assistant broad payment access.

## Implementation Checklist

For builders turning this into production, I would use this checklist.

### Wallet and User Consent

- Show token mint, cap, delegate, expiry, and reset cadence.
- Explain whether the approval is fixed, recurring, or plan based.
- Show a revoke path from the same surface where the user granted approval.
- Avoid hiding base-unit conversion in ambiguous UI.

### Program Integration

- Initialize the subscription authority only when missing.
- Derive PDAs deterministically and display them in developer logs.
- Use base units for all program calls.
- Fetch live plan terms before subscription acceptance.
- Treat transaction signatures as payment evidence, not only frontend state.

### Gateway Policy

- Preflight the allowance before running expensive services.
- Bind service ID, price, merchant, and mint into the receipt.
- Reject over-cap and expired calls before execution.
- Persist both service execution logs and on-chain settlement references.

### Merchant Operations

- Index program events.
- Reconcile events to service logs.
- Handle insufficient funds, cancellation, expiry, and delayed collection.
- Provide CSV or API exports for accounting.
- Publish clear refund and dispute policies.

### Agent Safety

- Use fixed delegations for short tasks.
- Use recurring delegations for ongoing agents.
- Keep caps small until trust is established.
- Let users set per-service or per-category limits above the on-chain cap.
- Log every agent spend decision in human readable form.

## How This Changes Product Design

The most interesting shift is from "subscription as a website checkout" to "subscription as a composable permission."

In Web2, a subscription is usually trapped inside one merchant's account system. In this model, a subscription or allowance is a shared on-chain object. Wallets, agents, merchants, dashboards, and indexers can all observe the same payment relationship.

That enables new UX:

- A wallet can show every active allowance across services.
- An agent can choose vendors based on price and remaining budget.
- A merchant can expose machine readable pricing and receive stablecoin settlement.
- A user can revoke a permission without finding a hidden billing settings page.

The product challenge is to keep that power understandable. The best interfaces will make these permissions feel like labeled budgets, not raw blockchain approvals.

## Conclusion

Solana Subscriptions and Allowances turns delegated spending into reusable payment infrastructure. The architecture is simple in the right way: one Subscription Authority PDA handles the token-account delegate constraint, while separate policy accounts define the actual business rules.

Fixed delegations make bounded AI agents practical. Recurring delegations fit ongoing user-controlled budgets. Subscription plans fit merchant-published SaaS billing. Together they cover a large part of recurring, metered, and autonomous commerce.

The primitive will not eliminate the operational work of billing. Builders still need good consent screens, indexing, reconciliation, lifecycle states, and support policies. But it removes a major blocker: users can keep funds in their own token accounts while authorizing software to act within clear limits.

For Canadian builders, the strongest opportunities are around commerce tooling, marketing automation, retail operations, and API providers where agents need to buy small digital services on behalf of a business. That is exactly where a native allowance model can turn stablecoins from a settlement asset into a programmable operating budget.
