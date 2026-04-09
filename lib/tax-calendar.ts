// Tax payment schedule by country for self-employed / freelancers
// Dates reflect quarterly installment / VAT / advance tax due dates, not year-end filing.

export interface TaxPeriod {
  quarter: number;
  label: string;
  dueDate: string;
  country: string;
  note?: string;
}

/**
 * Returns the four key tax due dates for a given country and year.
 *
 * Country coverage:
 *  NO  Norway        – Advance tax (forskuddsskatt): Mar 31, May 31, Sep 30, Nov 30
 *  SE  Sweden        – VAT/preliminary tax (F-skatt moms): Feb 12, May 12, Aug 12, Nov 12
 *  DK  Denmark       – B-tax instalments (b-skat): Jan 20, Apr 20, Jul 20, Oct 20
 *  DE  Germany       – Advance income tax (Einkommensteuer-Vorauszahlung): Mar 10, Jun 10, Sep 10, Dec 10
 *  NL  Netherlands   – Advance income tax (voorlopige aanslag): Mar 31, Jun 30, Sep 30, Dec 31
 *  GB  United Kingdom– Self Assessment payments on account: Jan 31, Jul 31 (semi-annual, Q3/Q4 repeat)
 *  FR  France        – Micro-entrepreneur social charges (quarterly): Apr 30, Jul 31, Oct 31, Jan 31 (next yr)
 *  CH  Switzerland   – AHV/IV/EO contributions: Mar 31, Jun 30, Sep 30, Dec 31
 *  AU  Australia     – PAYG quarterly instalments: Jan 28, Apr 28, Jul 28, Oct 28
 *  CA  Canada        – Quarterly income tax instalments: Mar 15, Jun 15, Sep 15, Dec 15
 *  US  United States – Estimated tax (Form 1040-ES): Apr 15, Jun 15, Sep 15, Jan 15 (next yr)
 */
export function getTaxPeriods(country: string, year: number): TaxPeriod[] {
  type DateNote = [string, string?];

  const schedule: Record<string, DateNote[]> = {
    NO: [
      [`${year}-03-31`, "Advance tax Q1 (forskuddsskatt)"],
      [`${year}-05-31`, "Advance tax Q2"],
      [`${year}-09-30`, "Advance tax Q3"],
      [`${year}-11-30`, "Advance tax Q4"],
    ],
    SE: [
      [`${year}-02-12`, "VAT/F-skatt Q4 of prior year"],
      [`${year}-05-12`, "VAT/F-skatt Q1"],
      [`${year}-08-12`, "VAT/F-skatt Q2"],
      [`${year}-11-12`, "VAT/F-skatt Q3"],
    ],
    DK: [
      [`${year}-01-20`, "B-skat instalment Q4 of prior year"],
      [`${year}-04-20`, "B-skat instalment Q1"],
      [`${year}-07-20`, "B-skat instalment Q2"],
      [`${year}-10-20`, "B-skat instalment Q3"],
    ],
    DE: [
      [`${year}-03-10`, "Einkommensteuer-Vorauszahlung Q1"],
      [`${year}-06-10`, "Einkommensteuer-Vorauszahlung Q2"],
      [`${year}-09-10`, "Einkommensteuer-Vorauszahlung Q3"],
      [`${year}-12-10`, "Einkommensteuer-Vorauszahlung Q4"],
    ],
    NL: [
      [`${year}-03-31`, "Voorlopige aanslag Q1"],
      [`${year}-06-30`, "Voorlopige aanslag Q2"],
      [`${year}-09-30`, "Voorlopige aanslag Q3"],
      [`${year}-12-31`, "Voorlopige aanslag Q4"],
    ],
    GB: [
      [`${year}-01-31`, "Payment on account (Jan)"],
      [`${year}-07-31`, "Payment on account (Jul)"],
      [`${year}-01-31`, "Self Assessment filing deadline"],
      [`${year}-07-31`, "Balancing payment deadline"],
    ],
    FR: [
      [`${year}-04-30`, "Charges sociales Q1 (micro-entrepreneur)"],
      [`${year}-07-31`, "Charges sociales Q2"],
      [`${year}-10-31`, "Charges sociales Q3"],
      [`${year + 1}-01-31`, "Charges sociales Q4"],
    ],
    CH: [
      [`${year}-03-31`, "AHV/IV/EO contributions Q1"],
      [`${year}-06-30`, "AHV/IV/EO contributions Q2"],
      [`${year}-09-30`, "AHV/IV/EO contributions Q3"],
      [`${year}-12-31`, "AHV/IV/EO contributions Q4"],
    ],
    AU: [
      [`${year}-01-28`, "PAYG instalment Q2 (Oct–Dec)"],
      [`${year}-04-28`, "PAYG instalment Q3 (Jan–Mar)"],
      [`${year}-07-28`, "PAYG instalment Q4 (Apr–Jun)"],
      [`${year}-10-28`, "PAYG instalment Q1 (Jul–Sep)"],
    ],
    CA: [
      [`${year}-03-15`, "Income tax instalment Q1"],
      [`${year}-06-15`, "Income tax instalment Q2"],
      [`${year}-09-15`, "Income tax instalment Q3"],
      [`${year}-12-15`, "Income tax instalment Q4"],
    ],
    US: [
      [`${year}-04-15`, "Estimated tax Q1 (Form 1040-ES)"],
      [`${year}-06-15`, "Estimated tax Q2"],
      [`${year}-09-15`, "Estimated tax Q3"],
      [`${year + 1}-01-15`, "Estimated tax Q4"],
    ],
  };

  const defaultSchedule: DateNote[] = [
    [`${year}-03-31`],
    [`${year}-06-30`],
    [`${year}-09-30`],
    [`${year}-12-31`],
  ];

  const periods = schedule[country] ?? defaultSchedule;

  return periods.map(([dueDate, note], idx) => ({
    quarter: idx + 1,
    label: `Q${idx + 1} ${year}`,
    dueDate,
    country,
    ...(note ? { note } : {}),
  }));
}

/**
 * Returns the next upcoming tax deadline for a country.
 */
export function getNextTaxDeadline(country: string): TaxPeriod | null {
  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const periods = [
    ...getTaxPeriods(country, currentYear),
    ...getTaxPeriods(country, currentYear + 1),
  ];
  return periods.find((p) => p.dueDate >= today) ?? null;
}

/**
 * Estimate quarterly tax amount based on income and country.
 */
export function getQuarterlyTaxEstimate(
  quarterIncome: number,
  country: string
): number {
  const { calculateTaxEstimate } = require("./calculations") as typeof import("./calculations");
  const annualIncome = quarterIncome * 4;
  const result = calculateTaxEstimate(annualIncome, country);
  return Math.round(result.annualTax / 4);
}
