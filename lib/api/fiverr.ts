// Fiverr does not have a public API — integration is via CSV export
// Users download their earnings CSV from Fiverr dashboard and upload it here.
// Parsing uses PapaParse.

import type Papa from "papaparse";
import type { IncomeEntry, Currency } from "../mock-data";

export interface FiverrCsvRow {
  Date: string;
  Type: string;
  "Order ID": string;
  Description: string;
  Amount: string;
  Currency: string;
  "Net Amount": string;
}

/**
 * Parse a Fiverr CSV export file using PapaParse.
 * TODO: Call this function when user uploads a CSV file in the UI.
 *
 * Usage:
 *   const file = event.target.files[0]
 *   const text = await file.text()
 *   const entries = parseFiverrCsv(text)
 */
export function parseFiverrCsv(
  csvText: string,
  Papa: { parse: typeof import("papaparse").parse }
): Partial<IncomeEntry>[] {
  const result = Papa.parse<FiverrCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .filter((row) => row.Type === "Revenue" || row.Type === "Earning")
    .map((row) => normalizeFiverrRow(row));
}

/**
 * Normalize a single Fiverr CSV row into our IncomeEntry format.
 */
export function normalizeFiverrRow(row: FiverrCsvRow): Partial<IncomeEntry> {
  // Parse amount — Fiverr CSV may have "$" or "€" prefixes
  const rawAmount = row["Net Amount"] || row["Amount"] || "0";
  const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ""));

  // Normalize currency
  const currencyMap: Record<string, Currency> = {
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    NOK: "NOK",
  };
  const currency: Currency = currencyMap[row.Currency?.toUpperCase()] ?? "USD";

  // Parse date — Fiverr uses MM/DD/YYYY or YYYY-MM-DD
  const parsedDate = parseFiverrDate(row.Date);

  return {
    source: "fiverr",
    amount,
    currency,
    date: parsedDate,
    note: row.Description || `Fiverr Order #${row["Order ID"]}`,
    status: "settled",
    externalId: row["Order ID"],
  };
}

/**
 * Parse Fiverr date strings into ISO format (YYYY-MM-DD).
 * Fiverr may export as "Jan 15, 2025" or "01/15/2025" or "2025-01-15".
 */
function parseFiverrDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split("T")[0];
  }

  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try native Date parse as fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * TODO: In the future, Fiverr may expose a Partner API.
 * Monitor: https://www.fiverr.com/pages/api
 * For now, CSV upload is the only supported method.
 */
export const FIVERR_INTEGRATION_NOTE = `
Fiverr does not provide a public API for earnings data.
To import your Fiverr earnings:
1. Log into Fiverr
2. Go to Selling > Analytics > Earnings
3. Click "Export to CSV"
4. Upload the CSV file in MyStackd
`;
