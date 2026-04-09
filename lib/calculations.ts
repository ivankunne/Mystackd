import dayjs from "dayjs";

// ─── Tax result types ─────────────────────────────────────────────────────────

export interface TaxBreakdownLine {
  label: string;
  amount: number;
}

export interface TaxResult {
  annualTax: number;
  effectiveRate: number; // fraction e.g. 0.28 = 28%
  breakdown: TaxBreakdownLine[];
  /** Short disclaimer shown under the tax card */
  note: string;
}

// ─── Progressive bracket helper ───────────────────────────────────────────────

/**
 * Calculates tax using marginal/progressive brackets.
 * brackets must be ordered from lowest to highest.
 * The last bracket should use Infinity as `to`.
 */
function bracketTax(
  income: number,
  brackets: { to: number; rate: number }[]
): number {
  let tax = 0;
  let prev = 0;
  for (const { to, rate } of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, to) - prev) * rate;
    prev = to;
  }
  return Math.round(tax);
}

function effectiveRate(tax: number, income: number): number {
  return income > 0 ? Math.round((tax / income) * 1000) / 1000 : 0;
}

// ─── Netherlands (NL) ─────────────────────────────────────────────────────────
// Box 1: progressive + ZVW health premium embedded in rates
// Self-employed deductions: zelfstandigenaftrek + MKB-winstvrijstelling (13.31%)
// Source: belastingdienst.nl, 2024 rates
function calcNL(income: number): TaxResult {
  const SELF_EMPLOYED_DEDUCTION = 3_750; // zelfstandigenaftrek 2024
  const MKB_EXEMPTION = 0.1331; // MKB-winstvrijstelling: 13.31% exempt

  // Reduce profit by MKB exemption, then self-employed deduction
  const taxableIncome = Math.max(
    0,
    income * (1 - MKB_EXEMPTION) - SELF_EMPLOYED_DEDUCTION
  );

  const incomeTax = bracketTax(taxableIncome, [
    { to: 73_031, rate: 0.3697 }, // includes ZVW (~5.32%) embedded in bracket
    { to: Infinity, rate: 0.495 },
  ]);

  return {
    annualTax: incomeTax,
    effectiveRate: effectiveRate(incomeTax, income),
    breakdown: [
      { label: "Box 1 income tax (incl. ZVW)", amount: incomeTax },
    ],
    note:
      "Includes self-employed deduction (€3,750) and MKB-winstvrijstelling (13.31%). ZVW healthcare premium embedded in bracket rates. VAT and municipal levies excluded. Estimate only — consult a boekhouder.",
  };
}

// ─── Germany (DE) ─────────────────────────────────────────────────────────────
// Progressive Einkommensteuer 2024. Approximate polynomial zones with step brackets.
// Health/care/pension insurance (~35-40% of income for self-employed) is NOT tax
// but is a major cost — flagged in note.
// Source: bmf.de, §32a EStG
function calcDE(income: number): TaxResult {
  const GRUNDFREIBETRAG = 11_604; // basic tax-free allowance 2024

  // Approximate German income tax using step brackets
  // (actual law uses a polynomial formula; these bands are accurate to ±2-3pp)
  const incomeTax = bracketTax(income, [
    { to: GRUNDFREIBETRAG, rate: 0 },
    { to: 17_005, rate: 0.14 },   // entry zone — starts at 14%, rises steeply
    { to: 62_810, rate: 0.32 },   // middle progressive zone (~32% effective avg)
    { to: 277_825, rate: 0.42 },  // Spitzensteuersatz
    { to: Infinity, rate: 0.45 }, // Reichensteuer
  ]);

  // Solidarity surcharge: 5.5% of income tax, but only applies above ~€18k tax
  // Effectively abolished for most earners since 2021 — skipped

  return {
    annualTax: incomeTax,
    effectiveRate: effectiveRate(incomeTax, income),
    breakdown: [
      { label: "Einkommensteuer", amount: incomeTax },
    ],
    note:
      "Einkommensteuer only. As a self-employed person (Freiberufler/Gewerbetreibender) you also owe ~35-40% of gross for social security, health, and care insurance (Sozialversicherung) — budgeted separately. Gewerbesteuer may apply. Not tax advice.",
  };
}

// ─── United Kingdom (GB) ──────────────────────────────────────────────────────
// Income tax + Class 4 National Insurance (self-employed) 2024-25
// Personal allowance tapered above £100k: loses £1 per £2 earned
// Source: gov.uk, 2024-25 rates
function calcGB(income: number): TaxResult {
  const PERSONAL_ALLOWANCE = 12_570;

  // Taper personal allowance above £100k
  let allowance = PERSONAL_ALLOWANCE;
  if (income > 100_000) {
    allowance = Math.max(0, PERSONAL_ALLOWANCE - Math.floor((income - 100_000) / 2));
  }
  const taxableIncome = Math.max(0, income - allowance);

  const incomeTax = bracketTax(taxableIncome, [
    { to: 37_700, rate: 0.2 },  // basic rate
    { to: 112_570, rate: 0.4 }, // higher rate (aligned with tapered allowance removed)
    { to: Infinity, rate: 0.45 },
  ]);

  // Class 4 NI: 6% on £12,570–£50,270; 2% above (from April 2024)
  const class4NI = bracketTax(Math.max(0, income - 12_570), [
    { to: 37_700, rate: 0.06 }, // £12,570 to £50,270
    { to: Infinity, rate: 0.02 },
  ]);

  // Class 2 NI: £3.45/week = ~£179/year if profits > £12,570
  const class2NI = income > 12_570 ? 179 : 0;

  const total = incomeTax + class4NI + class2NI;

  return {
    annualTax: total,
    effectiveRate: effectiveRate(total, income),
    breakdown: [
      { label: "Income tax", amount: incomeTax },
      { label: "Class 4 NI", amount: class4NI },
      { label: "Class 2 NI", amount: class2NI },
    ],
    note:
      "Includes income tax and Class 4 NI (2024-25 rates). Does not include student loan repayments, Gift Aid adjustments, or pension contributions. Personal allowance tapered above £100k. Estimate only — consult an accountant.",
  };
}

// ─── United States (US) ───────────────────────────────────────────────────────
// Federal income tax + self-employment tax (SS + Medicare) for sole proprietors.
// State tax varies widely — not included.
// Source: IRS Rev. Proc. 2023-34, 2024 rates
function calcUS(income: number): TaxResult {
  // Self-employment tax: 15.3% on net SE income (92.35% of gross profit)
  // SS portion capped at $168,600 in 2024
  const SE_WAGE_BASE = 168_600;
  const netSEIncome = income * 0.9235;
  const ssTax = Math.min(netSEIncome, SE_WAGE_BASE) * 0.124; // 12.4% SS
  const medicareTax = netSEIncome * 0.029; // 2.9% Medicare
  const seTax = Math.round(ssTax + medicareTax);

  // SE tax deduction: deduct half of SE tax from AGI
  const seDeduction = Math.round(seTax / 2);
  const STANDARD_DEDUCTION = 14_600; // 2024 single filer

  const agi = Math.max(0, income - seDeduction - STANDARD_DEDUCTION);

  const federalTax = bracketTax(agi, [
    { to: 11_600, rate: 0.10 },
    { to: 47_150, rate: 0.12 },
    { to: 100_525, rate: 0.22 },
    { to: 191_950, rate: 0.24 },
    { to: 243_725, rate: 0.32 },
    { to: 609_350, rate: 0.35 },
    { to: Infinity, rate: 0.37 },
  ]);

  const total = federalTax + seTax;

  return {
    annualTax: total,
    effectiveRate: effectiveRate(total, income),
    breakdown: [
      { label: "Federal income tax", amount: federalTax },
      { label: "Self-employment tax (SS+Medicare)", amount: seTax },
    ],
    note:
      "Federal taxes only — state income tax (0%–13.3%) not included. Based on single-filer standard deduction ($14,600). SE deduction applied. Quarterly estimated payments (Apr 15, Jun 15, Sep 15, Jan 15) recommended to avoid underpayment penalty.",
  };
}

// ─── Norway (NO) ──────────────────────────────────────────────────────────────
// 22% flat (alminnelig inntekt) + trinnskatt step tax + 11% trygdeavgift
// Minstefradrag (standard deduction) included in approximation
// Source: skatteetaten.no, 2024 rates
function calcNO(income: number): TaxResult {
  // Minstefradrag: 45% of income, min 33,650, max 104,450 NOK
  // Note: income here is in user's home currency (EUR). We approximate — NOK values
  // below are scaled to fraction of a typical NOK/EUR ratio (~11.5)
  // For simplicity we apply the percentage deduction directly
  const MINSTEFRADRAG_RATE = 0.45;
  const minstefradrag = Math.min(
    Math.max(income * MINSTEFRADRAG_RATE, income * 0.03), // rough EUR equiv of 33,650 NOK
    income * 0.095 // rough EUR equiv of 104,450 NOK
  );
  const alminneligInntekt = Math.max(0, income - minstefradrag);

  // Personal deduction: ~88,250 NOK ≈ ~7,700 EUR
  const personalDeduction = Math.min(7_700, alminneligInntekt);
  const taxableBase = Math.max(0, alminneligInntekt - personalDeduction);

  const flatTax = Math.round(taxableBase * 0.22);

  // Trinnskatt step tax (applied to gross personal income, not adjusted)
  // NOK thresholds scaled to EUR at ~11.5 rate
  const trinnskatt = bracketTax(income, [
    { to: 18_100, rate: 0 },       // 208,050 NOK
    { to: 25_465, rate: 0.017 },   // 292,850 NOK
    { to: 58_260, rate: 0.04 },    // 670,000 NOK
    { to: 81_557, rate: 0.136 },   // 937,900 NOK
    { to: Infinity, rate: 0.166 },
  ]);

  // Trygdeavgift (national insurance): 11% for self-employed on personal income
  const trygdeavgift = Math.round(income * 0.11);

  const total = flatTax + trinnskatt + trygdeavgift;

  return {
    annualTax: total,
    effectiveRate: effectiveRate(total, income),
    breakdown: [
      { label: "Flat tax (22%)", amount: flatTax },
      { label: "Trinnskatt", amount: trinnskatt },
      { label: "Trygdeavgift (11%)", amount: trygdeavgift },
    ],
    note:
      "Includes alminnelig inntekt (22%), trinnskatt, and trygdeavgift (11%). Minstefradrag applied. VAT and kommuneskatt excluded. Estimates are in your home currency — thresholds are approximate. Not tax advice.",
  };
}

// ─── Generic flat-rate fallback ───────────────────────────────────────────────

function calcFlat(
  income: number,
  rate: number,
  country: string,
  note: string
): TaxResult {
  const annualTax = Math.round(income * rate);
  return {
    annualTax,
    effectiveRate: rate,
    breakdown: [{ label: `Income tax (${Math.round(rate * 100)}% est.)`, amount: annualTax }],
    note,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a tax estimate with progressive bracket logic for major countries.
 * For countries not explicitly supported, a flat-rate estimate is returned.
 *
 * IMPORTANT: This is a planning tool, not a tax filing service.
 * Results are approximate and may not reflect all deductions, credits,
 * or local levies. Always verify with a qualified tax professional.
 */
export function calculateTaxEstimate(
  annualIncome: number,
  country: string
): TaxResult {
  if (annualIncome <= 0) {
    return { annualTax: 0, effectiveRate: 0, breakdown: [], note: "" };
  }

  switch (country) {
    case "NL": return calcNL(annualIncome);
    case "DE": return calcDE(annualIncome);
    case "GB": return calcGB(annualIncome);
    case "US": return calcUS(annualIncome);
    case "NO": return calcNO(annualIncome);
    case "SE":
      return calcFlat(annualIncome, 0.30, "SE",
        "Approximate rate. Swedish self-employed pay income tax (~20-30% depending on municipality) plus social security contributions (~28.97%). Not tax advice.");
    case "DK":
      return calcFlat(annualIncome, 0.37, "DK",
        "Approximate rate. Danish self-employed owe income tax (~37-42%) plus labour market contribution (AM-bidrag, 8%). Not tax advice.");
    case "FR":
      return calcFlat(annualIncome, 0.33, "FR",
        "Approximate rate. French auto-entrepreneurs pay income tax plus social charges (~22% on revenue for services). Actual rates depend on your régime fiscal. Not tax advice.");
    default:
      return calcFlat(annualIncome, 0.25, country,
        "This is a rough estimate. Tax rules vary significantly by country. Please consult a local tax professional to understand your actual obligations.");
  }
}

// ─── Safe to spend ────────────────────────────────────────────────────────────

export function calculateSafeToSpend(
  totalEarned: number,
  taxEstimate: number,
  monthlyExpenses: { rent: number; subscriptions: number; other: number },
  monthsElapsed: number
): number {
  const totalMonthlyExpenses =
    monthlyExpenses.rent + monthlyExpenses.subscriptions + monthlyExpenses.other;
  const totalExpensesSoFar = totalMonthlyExpenses * monthsElapsed;
  const taxSetAsideSoFar = taxEstimate * (monthsElapsed / 12);
  return Math.max(0, totalEarned - taxSetAsideSoFar - totalExpensesSoFar);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getMonthsElapsed(): number {
  const now = dayjs();
  return now.month() + 1;
}

// Locale mapped from the user's numberFormat preference
function localeFromNumberFormat(numberFormat?: string): string {
  if (numberFormat === "1.000,00") return "de-DE"; // EU dot-thousands, comma-decimal
  if (numberFormat === "1 000.00") return "nb-NO"; // space-thousands, dot-decimal
  return "en-US"; // default: comma-thousands, dot-decimal
}

// numberFormat is injected by components that read from AppearanceContext
export function formatCurrency(
  amount: number,
  currency: string = "EUR",
  numberFormat?: string,
): string {
  const locale = localeFromNumberFormat(numberFormat);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format a date string using the user's saved dateFormat preference.
// dateFormat follows dayjs token conventions: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD.
export function formatDate(
  date: string | Date,
  dateFormat: string = "DD/MM/YYYY",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd   = pad(d.getDate());
  const mm   = pad(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  return dateFormat
    .replace("DD", dd)
    .replace("MM", mm)
    .replace("YYYY", yyyy);
}

export function sumByMonth(
  entries: Array<{ amount: number; date: string }>,
  year: number,
  month: number
): number {
  return entries
    .filter((e) => {
      const d = dayjs(e.date);
      return d.year() === year && d.month() + 1 === month;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}
