import { jsPDF } from "jspdf";
import type { Invoice } from "./mock-data";
import { getPaymentInfo } from "./data/payment-info";
import { getUserProfile } from "./data/user";
import { formatCurrency } from "./calculations";
import dayjs from "dayjs";

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  green:       [34,  197,  94] as [number, number, number],
  greenLight:  [240, 253, 244] as [number, number, number],
  slate900:    [15,   23,  42] as [number, number, number],
  slate600:    [71,   85, 105] as [number, number, number],
  slate400:    [148, 163, 184] as [number, number, number],
  slate200:    [226, 232, 240] as [number, number, number],
  white:       [255, 255, 255] as [number, number, number],
  red:         [239,  68,  68] as [number, number, number],
  amber:       [245, 158,  11] as [number, number, number],
  blue:        [59, 130, 246]  as [number, number, number],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgb(doc: jsPDF, color: [number, number, number], target: "fill" | "text" | "draw") {
  if (target === "fill")  doc.setFillColor(...color);
  if (target === "text")  doc.setTextColor(...color);
  if (target === "draw")  doc.setDrawColor(...color);
}

function bold(doc: jsPDF)   { doc.setFont("helvetica", "bold"); }
function normal(doc: jsPDF) { doc.setFont("helvetica", "normal"); }

/** Truncate a string to fit within maxWidth mm at the current font size */
function truncate(doc: jsPDF, str: string, maxWidth: number): string {
  if (doc.getTextWidth(str) <= maxWidth) return str;
  while (str.length > 0 && doc.getTextWidth(str + "…") > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + "…";
}

/** Draw a solid filled rect */
function filledRect(doc: jsPDF, color: [number, number, number], x: number, y: number, w: number, h: number) {
  rgb(doc, color, "fill");
  doc.rect(x, y, w, h, "F");
}

/** Draw a horizontal rule */
function hRule(doc: jsPDF, color: [number, number, number], x: number, y: number, w: number, lw = 0.25) {
  doc.setLineWidth(lw);
  rgb(doc, color, "draw");
  doc.line(x, y, x + w, y);
}

// ─── Invoice PDF ──────────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const [paymentInfo, userProfile] = await Promise.all([
    Promise.resolve(getPaymentInfo()),
    getUserProfile(invoice.userId as string | undefined),
  ]);

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const PW = 210;   // page width
  const ML = 15;    // margin left
  const MR = 15;    // margin right
  const CW = PW - ML - MR;  // content width = 180mm
  const MID = ML + CW / 2;

  // ── 1. Header bar ────────────────────────────────────────────────────────
  filledRect(doc, C.green, 0, 0, PW, 28);

  // Logo mark — white rounded square with "M"
  filledRect(doc, C.white, ML, 9, 10, 10);
  doc.setFontSize(9);
  bold(doc);
  rgb(doc, C.green, "text");
  doc.text("M", ML + 5, 15.5, { align: "center" });

  // "MyStackd" wordmark
  doc.setFontSize(13);
  bold(doc);
  rgb(doc, C.white, "text");
  doc.text("MyStackd", ML + 14, 15.8);

  // "INVOICE" right-aligned in header
  doc.setFontSize(20);
  bold(doc);
  rgb(doc, C.white, "text");
  doc.text("INVOICE", PW - MR, 17, { align: "right" });

  // Invoice number below INVOICE label
  doc.setFontSize(8);
  normal(doc);
  doc.text(invoice.invoiceNumber, PW - MR, 22, { align: "right" });

  let y = 38;

  // ── 2. Meta block — From / Invoice details ───────────────────────────────
  const colR = ML + CW * 0.55; // right column start

  // FROM
  doc.setFontSize(7);
  bold(doc);
  rgb(doc, C.slate400, "text");
  doc.text("FROM", ML, y);

  doc.setFontSize(10);
  bold(doc);
  rgb(doc, C.slate900, "text");
  y += 5;
  doc.text(userProfile.name || "—", ML, y);

  doc.setFontSize(8.5);
  normal(doc);
  rgb(doc, C.slate600, "text");
  y += 4.5;
  doc.text(userProfile.email || "", ML, y);

  if (paymentInfo.bankName || paymentInfo.iban) {
    y += 4;
    doc.text([
      paymentInfo.bankName,
      paymentInfo.iban,
    ].filter(Boolean).join("  ·  "), ML, y);
  }

  // INVOICE DETAILS (right column)
  const detailsY = 38;
  const labelX = colR;
  const valueX = colR + 26;

  const details: Array<{ label: string; value: string; color?: [number, number, number] }> = [
    { label: "Invoice #",  value: invoice.invoiceNumber },
    { label: "Issue date", value: dayjs(invoice.issueDate).format("DD MMM YYYY") },
    { label: "Due date",   value: dayjs(invoice.dueDate).format("DD MMM YYYY"),
      color: invoice.status !== "paid" && dayjs().isAfter(invoice.dueDate) ? C.red : undefined },
    { label: "Status",     value: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
      color: invoice.status === "paid" ? C.green : invoice.status === "overdue" ? C.red : invoice.status === "sent" ? C.blue : C.slate600 },
  ];

  let dy = detailsY;
  details.forEach(({ label, value, color }) => {
    doc.setFontSize(7.5);
    bold(doc);
    rgb(doc, C.slate400, "text");
    doc.text(label, labelX, dy);

    doc.setFontSize(8.5);
    normal(doc);
    rgb(doc, color ?? C.slate900, "text");
    doc.text(value, valueX, dy);
    dy += 6;
  });

  y = Math.max(y, dy) + 8;

  hRule(doc, C.slate200, ML, y, CW);
  y += 7;

  // ── 3. Bill To ───────────────────────────────────────────────────────────
  doc.setFontSize(7);
  bold(doc);
  rgb(doc, C.slate400, "text");
  doc.text("BILL TO", ML, y);

  y += 5;
  doc.setFontSize(10);
  bold(doc);
  rgb(doc, C.slate900, "text");
  doc.text(invoice.clientName, ML, y);

  normal(doc);
  doc.setFontSize(8.5);
  rgb(doc, C.slate600, "text");
  if (invoice.clientEmail) { y += 4.5; doc.text(invoice.clientEmail, ML, y); }
  if (invoice.clientAddress) { y += 4; doc.text(invoice.clientAddress, ML, y); }

  y += 10;

  // ── 4. Items table ───────────────────────────────────────────────────────
  const COL = {
    desc:  { x: ML,            w: 84 },
    qty:   { x: ML + 86,       w: 18 },
    price: { x: ML + 106,      w: 32 },
    total: { x: ML + 140,      w: CW - 140 },
  };

  const ROW_H = 7.5;
  const HEADER_H = 8;

  // Table header background
  filledRect(doc, C.green, ML, y, CW, HEADER_H);

  doc.setFontSize(7.5);
  bold(doc);
  rgb(doc, C.white, "text");
  const headerY = y + 5.5;
  doc.text("DESCRIPTION",  COL.desc.x  + 2, headerY);
  doc.text("QTY",          COL.qty.x   + 2, headerY);
  doc.text("UNIT PRICE",   COL.price.x + 2, headerY);
  doc.text("TOTAL",        COL.price.x + COL.price.w + COL.total.w - 2, headerY, { align: "right" });

  y += HEADER_H;

  // Rows
  invoice.items.forEach((item, idx) => {
    // Alternating row tint
    if (idx % 2 === 0) {
      filledRect(doc, [248, 250, 252] as [number, number, number], ML, y, CW, ROW_H);
    }

    const rowY = y + 5;
    doc.setFontSize(8.5);

    // Description (bold)
    bold(doc);
    rgb(doc, C.slate900, "text");
    doc.text(truncate(doc, item.description, COL.desc.w - 4), COL.desc.x + 2, rowY);

    // Qty, unit price, total (normal)
    normal(doc);
    rgb(doc, C.slate600, "text");
    doc.text(String(item.quantity), COL.qty.x + 2, rowY);
    doc.text(formatCurrency(item.unitPrice, invoice.currency), COL.price.x + 2, rowY);

    bold(doc);
    rgb(doc, C.slate900, "text");
    doc.text(
      formatCurrency(item.total, invoice.currency),
      COL.price.x + COL.price.w + COL.total.w - 2,
      rowY,
      { align: "right" },
    );

    y += ROW_H;
  });

  hRule(doc, C.slate200, ML, y, CW);
  y += 6;

  // ── 5. Totals ────────────────────────────────────────────────────────────
  const totalsLabelX = ML + CW - 80;
  const totalsValueX = ML + CW;

  const addTotalRow = (label: string, value: string, isBold = false, color?: [number, number, number]) => {
    doc.setFontSize(isBold ? 9.5 : 8.5);
    if (isBold) bold(doc); else normal(doc);
    rgb(doc, C.slate600, "text");
    doc.text(label, totalsLabelX, y);

    if (isBold) bold(doc); else normal(doc);
    rgb(doc, color ?? (isBold ? C.slate900 : C.slate600), "text");
    doc.text(value, totalsValueX, y, { align: "right" });
    y += 5.5;
  };

  addTotalRow("Subtotal", formatCurrency(invoice.subtotal, invoice.currency));
  if (invoice.taxAmount && invoice.taxAmount > 0) {
    addTotalRow(`Tax (${invoice.taxRate ?? 0}%)`, formatCurrency(invoice.taxAmount, invoice.currency));
  }

  y += 1;
  hRule(doc, C.slate200, totalsLabelX, y, 80);
  y += 5;

  // Total due — highlighted
  const totalBoxH = 10;
  filledRect(doc, C.green, totalsLabelX - 4, y - 1, 80 + 4, totalBoxH);
  doc.setFontSize(10);
  bold(doc);
  rgb(doc, C.white, "text");
  doc.text("Total due", totalsLabelX, y + 5.5);
  doc.text(formatCurrency(invoice.total, invoice.currency), totalsValueX, y + 5.5, { align: "right" });
  y += totalBoxH + 8;

  // ── 6. Notes ─────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setFontSize(7.5);
    bold(doc);
    rgb(doc, C.slate400, "text");
    doc.text("NOTES", ML, y);
    y += 4.5;

    normal(doc);
    doc.setFontSize(8);
    rgb(doc, C.slate600, "text");
    const lines = doc.splitTextToSize(invoice.notes, CW) as string[];
    doc.text(lines, ML, y);
    y += lines.length * 4.5 + 6;
  }

  // ── 7. Payment instructions ──────────────────────────────────────────────
  const hasPayment = paymentInfo.iban || paymentInfo.paypalEmail || paymentInfo.wiseEmail;
  if (hasPayment) {
    hRule(doc, C.slate200, ML, y, CW);
    y += 6;

    doc.setFontSize(7.5);
    bold(doc);
    rgb(doc, C.slate400, "text");
    doc.text("PAYMENT DETAILS", ML, y);
    y += 5;

    const payRows: Array<[string, string]> = [];
    if (paymentInfo.accountName) payRows.push(["Account name", paymentInfo.accountName]);
    if (paymentInfo.bankName)    payRows.push(["Bank",         paymentInfo.bankName]);
    if (paymentInfo.iban)        payRows.push(["IBAN",         paymentInfo.iban]);
    if (paymentInfo.bic)         payRows.push(["BIC / SWIFT",  paymentInfo.bic]);
    if (paymentInfo.paypalEmail) payRows.push(["PayPal",       paymentInfo.paypalEmail]);
    if (paymentInfo.wiseEmail)   payRows.push(["Wise / Revolut", paymentInfo.wiseEmail]);
    payRows.push(["Reference", invoice.invoiceNumber]);

    // Two-column grid for payment details
    const gridColW = CW / 2;
    payRows.forEach(([label, value], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = ML + col * gridColW;
      const py = y + row * 8;

      doc.setFontSize(7);
      bold(doc);
      rgb(doc, C.slate400, "text");
      doc.text(label, px, py);

      doc.setFontSize(8.5);
      normal(doc);
      rgb(doc, C.slate900, "text");
      doc.text(truncate(doc, value, gridColW - 4), px, py + 4);
    });

    y += Math.ceil(payRows.length / 2) * 8 + 4;

    if (paymentInfo.paymentNotes) {
      doc.setFontSize(7.5);
      normal(doc);
      rgb(doc, C.slate400, "text");
      const noteLines = doc.splitTextToSize(paymentInfo.paymentNotes, CW) as string[];
      doc.text(noteLines, ML, y);
    }
  }

  // ── 8. Footer ────────────────────────────────────────────────────────────
  const footerY = 287;
  hRule(doc, C.slate200, ML, footerY - 4, CW);

  doc.setFontSize(7);
  normal(doc);
  rgb(doc, C.slate400, "text");
  doc.text("Generated by MyStackd", ML, footerY);
  doc.text(dayjs().format("DD MMM YYYY"), PW - MR, footerY, { align: "right" });

  // ── Save ─────────────────────────────────────────────────────────────────
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

// ─── Tax Report PDF ───────────────────────────────────────────────────────────

export interface TaxReportInput {
  year: number;
  userName: string;
  userEmail: string;
  country: string;
  currency: string;
  quarters: {
    label: string;
    income: number;
    taxEstimate: number;
    dueDate: string;
    isPaid: boolean;
  }[];
  totalIncome: number;
  totalTax: number;
  totalExpenses: number;
  deductibleExpenses: number;
  expensesByCategory: { category: string; total: number }[];
}

export async function generateTaxReportPDF(input: TaxReportInput): Promise<void> {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const PW = 210;
  const ML = 15;
  const MR = 15;
  const CW = PW - ML - MR;

  // ── 1. Header ────────────────────────────────────────────────────────────
  filledRect(doc, C.green, 0, 0, PW, 30);

  // Logo
  filledRect(doc, C.white, ML, 10, 10, 10);
  doc.setFontSize(9); bold(doc); rgb(doc, C.green, "text");
  doc.text("M", ML + 5, 16.5, { align: "center" });

  doc.setFontSize(13); bold(doc); rgb(doc, C.white, "text");
  doc.text("MyStackd", ML + 14, 17);

  doc.setFontSize(18); bold(doc); rgb(doc, C.white, "text");
  doc.text("TAX REPORT", PW - MR, 16, { align: "right" });
  doc.setFontSize(9); normal(doc);
  doc.text(String(input.year), PW - MR, 23, { align: "right" });

  let y = 42;

  // ── 2. Taxpayer info block ────────────────────────────────────────────────
  doc.setFontSize(7); bold(doc); rgb(doc, C.slate400, "text");
  doc.text("PREPARED FOR", ML, y);
  y += 5;
  doc.setFontSize(11); bold(doc); rgb(doc, C.slate900, "text");
  doc.text(input.userName || "—", ML, y);
  y += 5;
  doc.setFontSize(8.5); normal(doc); rgb(doc, C.slate600, "text");
  doc.text([input.userEmail, `Country: ${input.country}`, `Currency: ${input.currency}`, `Tax Year: ${input.year}`].filter(Boolean).join("   ·   "), ML, y);
  y += 10;
  hRule(doc, C.slate200, ML, y, CW);
  y += 8;

  // ── 3. Summary boxes ─────────────────────────────────────────────────────
  const boxes = [
    { label: "Total Income",      value: formatCurrency(input.totalIncome,       input.currency as Parameters<typeof formatCurrency>[1]), color: C.green },
    { label: "Total Tax (Est.)",  value: formatCurrency(input.totalTax,          input.currency as Parameters<typeof formatCurrency>[1]), color: C.amber },
    { label: "Total Expenses",    value: formatCurrency(input.totalExpenses,      input.currency as Parameters<typeof formatCurrency>[1]), color: C.blue },
    { label: "Tax Deductible",    value: formatCurrency(input.deductibleExpenses, input.currency as Parameters<typeof formatCurrency>[1]), color: C.slate400 },
  ];
  const boxW = (CW - 9) / 4;
  boxes.forEach((box, i) => {
    const bx = ML + i * (boxW + 3);
    filledRect(doc, [248, 250, 252] as [number, number, number], bx, y, boxW, 18);
    doc.setFontSize(7); bold(doc); rgb(doc, C.slate400, "text");
    doc.text(box.label.toUpperCase(), bx + 3, y + 5);
    doc.setFontSize(10); bold(doc); rgb(doc, box.color, "text");
    doc.text(box.value, bx + 3, y + 13);
  });
  y += 25;

  // ── 4. Quarterly breakdown table ─────────────────────────────────────────
  doc.setFontSize(9); bold(doc); rgb(doc, C.slate900, "text");
  doc.text("Quarterly Breakdown", ML, y);
  y += 6;

  // Header row
  filledRect(doc, C.green, ML, y, CW, 7.5);
  doc.setFontSize(7.5); bold(doc); rgb(doc, C.white, "text");
  const qCols = [
    { label: "Quarter",    x: ML + 2,       w: 42 },
    { label: "Due Date",   x: ML + 46,      w: 36 },
    { label: "Income",     x: ML + 84,      w: 36 },
    { label: "Tax Est.",   x: ML + 122,     w: 36 },
    { label: "Status",     x: ML + 160,     w: 20 },
  ];
  qCols.forEach((c) => doc.text(c.label, c.x, y + 5));
  y += 7.5;

  input.quarters.forEach((q, idx) => {
    if (idx % 2 === 0) filledRect(doc, [248, 250, 252] as [number, number, number], ML, y, CW, 7.5);
    const ry = y + 5;
    doc.setFontSize(8.5); bold(doc); rgb(doc, C.slate900, "text");
    doc.text(q.label, qCols[0].x, ry);
    normal(doc); rgb(doc, C.slate600, "text");
    doc.text(dayjs(q.dueDate).format("DD MMM YYYY"), qCols[1].x, ry);
    doc.text(formatCurrency(q.income, input.currency as Parameters<typeof formatCurrency>[1]), qCols[2].x, ry);
    bold(doc); rgb(doc, C.amber, "text");
    doc.text(formatCurrency(q.taxEstimate, input.currency as Parameters<typeof formatCurrency>[1]), qCols[3].x, ry);
    doc.setFontSize(7.5);
    rgb(doc, q.isPaid ? C.green : C.slate400, "text");
    doc.text(q.isPaid ? "Paid" : "Pending", qCols[4].x, ry);
    y += 7.5;
  });

  // Totals row
  hRule(doc, C.slate200, ML, y, CW);
  y += 5;
  doc.setFontSize(9); bold(doc); rgb(doc, C.slate900, "text");
  doc.text("Total", qCols[0].x, y);
  doc.text(formatCurrency(input.totalIncome, input.currency as Parameters<typeof formatCurrency>[1]), qCols[2].x, y);
  rgb(doc, C.green, "text");
  doc.text(formatCurrency(input.totalTax, input.currency as Parameters<typeof formatCurrency>[1]), qCols[3].x, y);
  y += 12;

  // ── 5. Expense breakdown ─────────────────────────────────────────────────
  if (input.expensesByCategory.length > 0) {
    doc.setFontSize(9); bold(doc); rgb(doc, C.slate900, "text");
    doc.text("Expense Breakdown by Category", ML, y);
    y += 6;

    filledRect(doc, C.green, ML, y, CW, 7.5);
    doc.setFontSize(7.5); bold(doc); rgb(doc, C.white, "text");
    doc.text("Category", ML + 2, y + 5);
    doc.text("Amount", ML + CW - 2, y + 5, { align: "right" });
    y += 7.5;

    input.expensesByCategory.forEach((cat, idx) => {
      if (idx % 2 === 0) filledRect(doc, [248, 250, 252] as [number, number, number], ML, y, CW, 7);
      doc.setFontSize(8.5); normal(doc); rgb(doc, C.slate600, "text");
      doc.text(cat.category.charAt(0).toUpperCase() + cat.category.slice(1), ML + 2, y + 5);
      bold(doc); rgb(doc, C.slate900, "text");
      doc.text(formatCurrency(cat.total, input.currency as Parameters<typeof formatCurrency>[1]), ML + CW - 2, y + 5, { align: "right" });
      y += 7;
    });

    hRule(doc, C.slate200, ML, y, CW);
    y += 5;
    doc.setFontSize(9); bold(doc); rgb(doc, C.slate900, "text");
    doc.text("Total Expenses", ML + 2, y);
    doc.text(formatCurrency(input.totalExpenses, input.currency as Parameters<typeof formatCurrency>[1]), ML + CW - 2, y, { align: "right" });
    y += 12;
  }

  // ── 6. Disclaimer ────────────────────────────────────────────────────────
  if (y > 260) { doc.addPage(); y = 20; }
  hRule(doc, C.slate200, ML, y, CW);
  y += 6;
  doc.setFontSize(7.5); normal(doc); rgb(doc, C.slate400, "text");
  const disclaimer = `Tax estimates are based on simplified brackets for ${input.country}. This report is for informational purposes only and does not constitute tax advice. Please consult a qualified tax professional or accountant for accurate filings.`;
  const dLines = doc.splitTextToSize(disclaimer, CW) as string[];
  doc.text(dLines, ML, y);

  // ── 7. Footer ────────────────────────────────────────────────────────────
  const footerY = 287;
  hRule(doc, C.slate200, ML, footerY - 4, CW);
  doc.setFontSize(7); normal(doc); rgb(doc, C.slate400, "text");
  doc.text(`Generated by MyStackd · ${dayjs().format("DD MMM YYYY")}`, ML, footerY);
  doc.text(`Tax Year ${input.year}`, PW - MR, footerY, { align: "right" });

  doc.save(`tax-report-${input.year}.pdf`);
}
