// FX rates relative to EUR — last updated Q1 2025.
// Update this table each quarter by checking ECB or xe.com for round numbers.
// TODO: Replace with a live ECB/exchangerate-api fetch when backend is ready.
//
// How the math works:
//   TO_EUR["USD"] = 0.920  →  1 USD = €0.920
//   convert(100 USD → GBP) = 100 × 0.920 / 0.855  ≈  107.6 GBP

const TO_EUR: Record<string, number> = {
  EUR: 1.0000,
  USD: 0.9200,   // US Dollar
  GBP: 1.1700,   // British Pound
  NOK: 0.0860,   // Norwegian Krone
  SEK: 0.0880,   // Swedish Krona
  DKK: 0.1340,   // Danish Krone
  CHF: 1.0500,   // Swiss Franc
  AUD: 0.5900,   // Australian Dollar
  CAD: 0.6750,   // Canadian Dollar
  JPY: 0.0061,   // Japanese Yen
  SGD: 0.6900,   // Singapore Dollar
  PLN: 0.2340,   // Polish Złoty
  CZK: 0.0397,   // Czech Koruna
  HUF: 0.0025,   // Hungarian Forint
  NZD: 0.5450,   // New Zealand Dollar
};

// Currency display symbols (used in formatFxLine)
const SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  NOK: "kr",
  SEK: "kr",
  DKK: "kr",
  CHF: "Fr",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  SGD: "S$",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  NZD: "NZ$",
};

/** All supported currency codes, sorted for UI dropdowns. */
export const SUPPORTED_CURRENCIES = Object.keys(TO_EUR).sort() as string[];

/**
 * Get the exchange rate from `from` to `to`.
 * Returns 1.0 if either currency is unknown.
 */
export function getFxRate(from: string, to: string): number {
  if (from === to) return 1.0;
  const fromRate = TO_EUR[from];
  const toRate   = TO_EUR[to];
  if (fromRate === undefined || toRate === undefined) return 1.0;
  return fromRate / toRate;
}

/**
 * Convert an amount from one currency to another.
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  const rate = getFxRate(from, to);
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Returns a formatted FX conversion line.
 * e.g. "USD 3,200 → €2,944 at 0.920"
 */
export function formatFxLine(amount: number, from: string, to: string): string {
  const rate      = getFxRate(from, to);
  const converted = convertCurrency(amount, from, to);
  const fromSym   = SYMBOLS[from] ?? from;
  const toSym     = SYMBOLS[to]   ?? to;
  return `${from} ${amount.toLocaleString()} → ${toSym}${converted.toLocaleString()} at ${rate.toFixed(3)}`;
}

/**
 * Return the display symbol for a currency code, falling back to the code itself.
 */
export function getCurrencySymbol(code: string): string {
  return SYMBOLS[code] ?? code;
}
