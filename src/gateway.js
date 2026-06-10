import { AllowanceError } from "./ledger.js";
import { parseUsdc } from "./money.js";

export function createDefaultServices() {
  return new Map([
    [
      "signal.canada-market",
      {
        priceUnits: parseUsdc("0.070000"),
        summary: "Canadian startup and crypto-market signal brief",
        run: ({ topic }) => `Mapped three Canadian builder angles for ${topic}.`
      }
    ],
    [
      "llm.technical-brief",
      {
        priceUnits: parseUsdc("0.060000"),
        summary: "LLM-generated technical brief with cited constraints",
        run: ({ topic }) => `Explained allowance-bounded agent spend for ${topic}.`
      }
    ],
    [
      "doc.render",
      {
        priceUnits: parseUsdc("0.080000"),
        summary: "Markdown report rendering and receipt export",
        run: ({ topic }) => `Rendered investor-ready markdown for ${topic}.`
      }
    ],
    [
      "data.enrich",
      {
        priceUnits: parseUsdc("0.050000"),
        summary: "Premium enrichment call intentionally used to show cap rejection",
        run: ({ topic }) => `Enriched ${topic} with premium data.`
      }
    ]
  ]);
}

export class MeteredAgentGateway {
  constructor({ ledger, delegationId, merchant, services = createDefaultServices() }) {
    this.ledger = ledger;
    this.delegationId = delegationId;
    this.merchant = merchant;
    this.services = services;
  }

  call(serviceId, input) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new AllowanceError("SERVICE_NOT_FOUND", "Unknown metered service.", { serviceId });
    }

    const receipt = this.ledger.chargeAllowance({
      delegationId: this.delegationId,
      amountUnits: service.priceUnits,
      service: serviceId,
      merchant: this.merchant,
      memo: service.summary
    });

    return {
      serviceId,
      output: service.run(input),
      receipt
    };
  }
}
