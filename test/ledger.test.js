import test from "node:test";
import assert from "node:assert/strict";
import { MeteredAgentGateway } from "../src/gateway.js";
import { AllowanceLedger, AllowanceError } from "../src/ledger.js";
import { parseUsdc, formatUsdc } from "../src/money.js";

test("settles metered service calls against a fixed allowance", () => {
  const ledger = new AllowanceLedger({ clock: () => new Date("2026-06-10T14:00:00.000Z") });
  ledger.enableAuthority({ owner: "alice", mint: "usdc" });
  const delegation = ledger.createFixedDelegation({
    owner: "alice",
    delegate: "agent",
    mint: "usdc",
    capUnits: parseUsdc("0.250000"),
    expiresAt: "2026-06-10T14:30:00.000Z"
  });

  const gateway = new MeteredAgentGateway({
    ledger,
    delegationId: delegation.id,
    merchant: "paystream-api.example"
  });
  const result = gateway.call("signal.canada-market", { topic: "Solana" });

  assert.equal(result.receipt.amount, "0.07 USDC");
  assert.equal(formatUsdc(ledger.remainingUnits(delegation.id)), "0.18 USDC");
});

test("rejects a charge that would exceed the user-approved cap", () => {
  const ledger = new AllowanceLedger({ clock: () => new Date("2026-06-10T14:00:00.000Z") });
  ledger.enableAuthority({ owner: "alice", mint: "usdc" });
  const delegation = ledger.createFixedDelegation({
    owner: "alice",
    delegate: "agent",
    mint: "usdc",
    capUnits: parseUsdc("0.100000"),
    expiresAt: "2026-06-10T14:30:00.000Z"
  });

  const gateway = new MeteredAgentGateway({
    ledger,
    delegationId: delegation.id,
    merchant: "paystream-api.example"
  });
  gateway.call("signal.canada-market", { topic: "Solana" });

  assert.throws(
    () => gateway.call("llm.technical-brief", { topic: "Solana" }),
    (error) => error instanceof AllowanceError && error.code === "ALLOWANCE_CAP_EXCEEDED"
  );
});

test("rejects an expired allowance", () => {
  const ledger = new AllowanceLedger({ clock: () => new Date("2026-06-10T15:00:00.000Z") });
  ledger.enableAuthority({ owner: "alice", mint: "usdc" });
  const delegation = ledger.createFixedDelegation({
    owner: "alice",
    delegate: "agent",
    mint: "usdc",
    capUnits: parseUsdc("0.250000"),
    expiresAt: "2026-06-10T14:30:00.000Z"
  });

  assert.throws(
    () =>
      ledger.chargeAllowance({
        delegationId: delegation.id,
        amountUnits: parseUsdc("0.010000"),
        service: "late.call",
        merchant: "paystream-api.example"
      }),
    (error) => error instanceof AllowanceError && error.code === "ALLOWANCE_EXPIRED"
  );
});

test("requires authority setup before delegation creation", () => {
  const ledger = new AllowanceLedger({ clock: () => new Date("2026-06-10T14:00:00.000Z") });

  assert.throws(
    () =>
      ledger.createFixedDelegation({
        owner: "alice",
        delegate: "agent",
        mint: "usdc",
        capUnits: parseUsdc("0.250000"),
        expiresAt: "2026-06-10T14:30:00.000Z"
      }),
    (error) => error instanceof AllowanceError && error.code === "SUBSCRIPTION_AUTHORITY_MISSING"
  );
});
