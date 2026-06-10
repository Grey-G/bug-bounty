import { fileURLToPath } from "node:url";
import { MeteredAgentGateway } from "./gateway.js";
import { AllowanceLedger, AllowanceError } from "./ledger.js";
import { parseUsdc } from "./money.js";

export function runScenario() {
  const now = new Date("2026-06-10T14:00:00.000Z");
  const ledger = new AllowanceLedger({ clock: () => now });

  const user = "alice.sol";
  const agent = "maple-research-agent.sol";
  const merchant = "paystream-api.example";
  const mint = "devnet-usdc";

  const authority = ledger.enableAuthority({ owner: user, mint });
  const delegation = ledger.createFixedDelegation({
    owner: user,
    delegate: agent,
    mint,
    capUnits: parseUsdc("0.250000"),
    expiresAt: "2026-06-10T14:30:00.000Z",
    label: "30 minute AI research budget"
  });
  const gateway = new MeteredAgentGateway({
    ledger,
    delegationId: delegation.id,
    merchant
  });

  const calls = [
    gateway.call("signal.canada-market", { topic: "Solana native subscriptions" }),
    gateway.call("llm.technical-brief", { topic: "bounded agent API spend" }),
    gateway.call("doc.render", { topic: "pay-as-you-go API report" })
  ];

  let denied;
  try {
    gateway.call("data.enrich", { topic: "extra premium enrichment" });
  } catch (error) {
    if (!(error instanceof AllowanceError)) {
      throw error;
    }
    denied = {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  return {
    authority,
    delegation: ledger.snapshot().delegations[0],
    calls,
    denied,
    events: ledger.snapshot().events
  };
}

function printScenario(result) {
  console.log("Paystream Agent Allowance Demo");
  console.log("================================");
  console.log(`Authority: ${result.authority.id}`);
  console.log(`Delegation: ${result.delegation.id}`);
  console.log(`Budget: ${result.delegation.cap}`);
  console.log("");
  console.log("Settled metered calls:");
  for (const call of result.calls) {
    console.log(`- ${call.serviceId}: ${call.receipt.amount}; remaining ${call.receipt.remaining}`);
    console.log(`  ${call.output}`);
  }
  console.log("");
  console.log("Denied over-cap call:");
  console.log(`- ${result.denied.code}: ${result.denied.details.attemptedAmount} requested; ${result.denied.details.remaining} remaining`);
  console.log("");
  console.log("Event log:");
  for (const event of result.events) {
    console.log(`${event.sequence}. ${event.type}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printScenario(runScenario());
}
