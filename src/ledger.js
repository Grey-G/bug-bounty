import crypto from "node:crypto";
import { assertPositiveUnits, formatUsdc } from "./money.js";

export class AllowanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AllowanceError";
    this.code = code;
    this.details = details;
  }
}

function shortHash(...parts) {
  const hash = crypto.createHash("sha256");
  for (const part of parts) {
    hash.update(String(part));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

function toDate(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
  return date;
}

export class AllowanceLedger {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.authorities = new Map();
    this.delegations = new Map();
    this.events = [];
  }

  enableAuthority({ owner, mint, payer = owner }) {
    const id = `sa_${shortHash(owner, mint)}`;
    const authority = { id, owner, mint, payer, createdAt: this.clock().toISOString() };
    this.authorities.set(`${owner}:${mint}`, authority);
    this.#record("authority.enabled", { authorityId: id, owner, mint, payer });
    return authority;
  }

  createFixedDelegation({ owner, delegate, mint, capUnits, expiresAt, label }) {
    assertPositiveUnits(capUnits, "capUnits");
    const authority = this.authorities.get(`${owner}:${mint}`);
    if (!authority) {
      throw new AllowanceError(
        "SUBSCRIPTION_AUTHORITY_MISSING",
        "Enable a subscription authority before creating an allowance.",
        { owner, mint }
      );
    }

    const expiry = toDate(expiresAt, "expiresAt");
    const id = `fixed_${shortHash(owner, delegate, mint, capUnits, expiry.toISOString(), this.events.length)}`;
    const delegation = {
      id,
      authorityId: authority.id,
      owner,
      delegate,
      mint,
      capUnits: BigInt(capUnits),
      spentUnits: 0n,
      expiresAt: expiry,
      label: label || "agent fixed allowance",
      createdAt: this.clock().toISOString()
    };
    this.delegations.set(id, delegation);
    this.#record("fixed_delegation.created", {
      delegationId: id,
      authorityId: authority.id,
      owner,
      delegate,
      mint,
      cap: formatUsdc(delegation.capUnits),
      expiresAt: expiry.toISOString()
    });
    return this.#publicDelegation(delegation);
  }

  chargeAllowance({ delegationId, amountUnits, service, merchant, memo = "", timestamp = this.clock() }) {
    assertPositiveUnits(amountUnits, "amountUnits");
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new AllowanceError("DELEGATION_NOT_FOUND", "Delegation does not exist.", { delegationId });
    }

    const at = toDate(timestamp, "timestamp");
    if (at.getTime() > delegation.expiresAt.getTime()) {
      const details = {
        delegationId,
        service,
        attemptedAmount: formatUsdc(amountUnits),
        expiresAt: delegation.expiresAt.toISOString(),
        timestamp: at.toISOString()
      };
      this.#record("charge.denied", { reason: "expired", ...details });
      throw new AllowanceError("ALLOWANCE_EXPIRED", "The allowance has expired.", details);
    }

    const amount = BigInt(amountUnits);
    const remaining = delegation.capUnits - delegation.spentUnits;
    if (amount > remaining) {
      const details = {
        delegationId,
        service,
        attemptedAmount: formatUsdc(amount),
        remaining: formatUsdc(remaining)
      };
      this.#record("charge.denied", { reason: "cap_exceeded", ...details });
      throw new AllowanceError("ALLOWANCE_CAP_EXCEEDED", "The charge exceeds the remaining allowance.", details);
    }

    delegation.spentUnits += amount;
    const receipt = {
      receiptId: `rcpt_${shortHash(delegationId, service, amount, delegation.spentUnits, this.events.length)}`,
      delegationId,
      owner: delegation.owner,
      delegate: delegation.delegate,
      merchant,
      service,
      amount: formatUsdc(amount),
      remaining: formatUsdc(delegation.capUnits - delegation.spentUnits),
      memo,
      timestamp: at.toISOString()
    };
    this.#record("charge.settled", receipt);
    return receipt;
  }

  remainingUnits(delegationId) {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new AllowanceError("DELEGATION_NOT_FOUND", "Delegation does not exist.", { delegationId });
    }
    return delegation.capUnits - delegation.spentUnits;
  }

  snapshot() {
    return {
      authorities: [...this.authorities.values()],
      delegations: [...this.delegations.values()].map((delegation) => this.#publicDelegation(delegation)),
      events: this.events
    };
  }

  #record(type, payload) {
    this.events.push({
      type,
      payload,
      sequence: this.events.length + 1,
      recordedAt: this.clock().toISOString()
    });
  }

  #publicDelegation(delegation) {
    return {
      id: delegation.id,
      authorityId: delegation.authorityId,
      owner: delegation.owner,
      delegate: delegation.delegate,
      mint: delegation.mint,
      cap: formatUsdc(delegation.capUnits),
      spent: formatUsdc(delegation.spentUnits),
      remaining: formatUsdc(delegation.capUnits - delegation.spentUnits),
      expiresAt: delegation.expiresAt.toISOString(),
      label: delegation.label,
      createdAt: delegation.createdAt
    };
  }
}
