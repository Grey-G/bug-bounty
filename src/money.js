const USDC_SCALE = 1_000_000n;

export function parseUsdc(value) {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,6})?$/.test(text)) {
    throw new Error(`Invalid USDC amount: ${value}`);
  }

  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(6, "0"));
}

export function formatUsdc(units) {
  const value = BigInt(units);
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / USDC_SCALE;
  const fraction = String(abs % USDC_SCALE).padStart(6, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""} USDC`;
}

export function assertPositiveUnits(units, label) {
  if (BigInt(units) <= 0n) {
    throw new Error(`${label} must be greater than zero`);
  }
}
