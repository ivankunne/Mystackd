import type { IncomeEntry, Expense, Invoice, TimeEntry, IncomeSource, Currency, Client, Project } from "./mock-data";

// ─── CSV parser ────────────────────────────────────────────────────────────────

export interface ParsedCSVRow { [header: string]: string }

/** Parse a raw CSV string into headers + row objects. Handles quoted fields. */
export function parseCSV(text: string): { headers: string[]; rows: ParsedCSVRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  function splitLine(line: string): string[] {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === "," && !inQuote) {
        cells.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const cells = splitLine(line);
      const row: ParsedCSVRow = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      return row;
    });

  return { headers, rows };
}

// Column name variants to auto-detect field mappings
const FIELD_HINTS: Record<string, string[]> = {
  date:       ["date", "day", "paid_at", "paid on", "transaction date", "value date"],
  amount:     ["amount", "value", "total", "gross", "net", "income", "revenue", "sum"],
  currency:   ["currency", "ccy", "cur"],
  source:     ["source", "platform", "channel", "gateway", "method"],
  clientName: ["client", "customer", "company", "client name", "customer name", "from"],
  note:       ["note", "notes", "description", "memo", "reference", "details", "remarks"],
};

/** Given a list of CSV headers, guess which field each maps to. Returns a map of fieldName → csvHeader. */
export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const [field, hints] of Object.entries(FIELD_HINTS)) {
    for (const hint of hints) {
      const match = headers.find(
        (h) => h.toLowerCase().trim() === hint && !used.has(h)
      );
      if (match) { mapping[field] = match; used.add(match); break; }
    }
  }
  return mapping;
}

const VALID_SOURCES = new Set(["stripe", "paypal", "upwork", "fiverr", "manual"]);

/** Convert a raw string to a known IncomeSource, defaulting to "manual". */
function toSource(raw: string): IncomeSource {
  const s = raw.toLowerCase().trim();
  return VALID_SOURCES.has(s) ? (s as IncomeSource) : "manual";
}

export interface ImportRow {
  date: string;
  amount: number;
  currency: Currency;
  source: IncomeSource;
  clientName: string;
  note: string;
  /** true when the row has enough data to import */
  valid: boolean;
  /** human-readable reason if invalid */
  error?: string;
}

/**
 * Map parsed CSV rows using a column mapping to ImportRow objects ready for addIncomeEntry().
 * mapping: { date: "Date", amount: "Amount", ... }
 */
export function mapToImportRows(
  rows: ParsedCSVRow[],
  mapping: Record<string, string>,
  defaultCurrency: Currency = "EUR",
): ImportRow[] {
  return rows.map((row) => {
    const rawDate   = mapping.date       ? row[mapping.date]?.trim()       : "";
    const rawAmount = mapping.amount     ? row[mapping.amount]?.trim()     : "";
    const rawCur    = mapping.currency   ? row[mapping.currency]?.trim()   : "";
    const rawSource = mapping.source     ? row[mapping.source]?.trim()     : "";
    const rawClient = mapping.clientName ? row[mapping.clientName]?.trim() : "";
    const rawNote   = mapping.note       ? row[mapping.note]?.trim()       : "";

    // Validate date
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const dateOk = parsedDate && !isNaN(parsedDate.getTime());
    const isoDate = dateOk
      ? parsedDate!.toISOString().split("T")[0]
      : "";

    // Validate amount — strip currency symbols and spaces
    const numStr = rawAmount.replace(/[^0-9.\-]/g, "");
    const amount = parseFloat(numStr);
    const amountOk = !isNaN(amount) && amount > 0;

    const errors: string[] = [];
    if (!dateOk)   errors.push("invalid date");
    if (!amountOk) errors.push("invalid amount");

    return {
      date:       isoDate,
      amount:     amountOk ? amount : 0,
      currency:   (rawCur.toUpperCase() as Currency) || defaultCurrency,
      source:     toSource(rawSource),
      clientName: rawClient,
      note:       rawNote,
      valid:      errors.length === 0,
      error:      errors.join(", ") || undefined,
    };
  });
}

// CSV export — works in browser, no library needed

function download(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export function exportIncomeCSV(entries: IncomeEntry[], filename?: string): void {
  const headers = ["Date", "Source", "Client", "Project", "Amount", "Currency", "Amount (EUR)", "FX Rate", "Note", "Status"];
  const rows = entries.map((e) => [
    e.date, e.source, e.clientName ?? "", e.projectName ?? "",
    e.amount, e.currency,
    e.amountInHomeCurrency ?? e.amount, e.fxRate ?? 1,
    e.note ?? "", e.status,
  ]);
  download(buildCSV(headers, rows), filename ?? `income-export-${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportExpensesCSV(expenses: Expense[], filename?: string): void {
  const headers = ["Date", "Description", "Vendor", "Category", "Amount", "Currency", "Tax Deductible"];
  const rows = expenses.map((e) => [
    e.date, e.description, e.vendor ?? "", e.category,
    e.amount, e.currency, e.isTaxDeductible ? "Yes" : "No",
  ]);
  download(buildCSV(headers, rows), filename ?? `expenses-export-${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportInvoicesCSV(invoices: Invoice[], filename?: string): void {
  const headers = ["Invoice #", "Client", "Issue Date", "Due Date", "Status", "Subtotal", "Tax", "Total", "Currency"];
  const rows = invoices.map((inv) => [
    inv.invoiceNumber, inv.clientName,
    inv.issueDate ?? "", inv.dueDate ?? "", inv.status,
    inv.subtotal, inv.taxAmount ?? 0, inv.total, inv.currency,
  ]);
  download(buildCSV(headers, rows), filename ?? `invoices-export-${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportTimeEntriesCSV(entries: TimeEntry[], filename?: string): void {
  const headers = ["Date", "Client", "Project", "Description", "Duration (min)", "Hours", "Rate/hr", "Value", "Currency", "Billed"];
  const rows = entries.map((e) => [
    e.date, e.clientName, e.projectName ?? "", e.description,
    e.durationMinutes,
    (e.durationMinutes / 60).toFixed(2),
    e.hourlyRate,
    ((e.durationMinutes / 60) * e.hourlyRate).toFixed(2),
    e.currency,
    e.isBilled ? "Yes" : "No",
  ]);
  download(buildCSV(headers, rows), filename ?? `time-export-${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportClientsCSV(clients: Client[], filename?: string): void {
  const headers = ["Name", "Company", "Email", "Phone", "Country", "Notes", "Client Since"];
  const rows = clients.map((c) => [
    c.name, c.company ?? "", c.email ?? "", c.phone ?? "", c.country ?? "",
    c.notes ?? "", c.createdAt ?? "",
  ]);
  download(buildCSV(headers, rows), filename ?? `clients-export-${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportProjectsCSV(projects: Project[], filename?: string): void {
  const headers = ["Name", "Client", "Status", "Budget", "Currency", "Start Date", "End Date", "Notes"];
  const rows = projects.map((p) => [
    p.name, p.clientName ?? "", p.status,
    p.budgetAmount ?? "", p.currency ?? "", p.startDate ?? "",
    p.endDate ?? "", p.notes ?? "",
  ]);
  download(buildCSV(headers, rows), filename ?? `projects-export-${new Date().toISOString().split("T")[0]}.csv`);
}
