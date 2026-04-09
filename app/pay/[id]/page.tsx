"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import { Check, Copy, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import type { Invoice } from "@/lib/mock-data";
import type { PaymentInfo } from "@/lib/data/payment-info";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: "#1e2d1e" }}>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-mono text-white truncate">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: copied ? "#22C55E20" : "#1a2d1a",
          color: copied ? "#22C55E" : "#64748b",
          border: `1px solid ${copied ? "#22C55E40" : "#1e2d1e"}`,
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:   { bg: "#64748B20", color: "#94a3b8", label: "Draft" },
  sent:    { bg: "#3b82f620", color: "#60a5fa", label: "Sent" },
  paid:    { bg: "#22C55E20", color: "#22C55E", label: "Paid" },
  overdue: { bg: "#ef444420", color: "#f87171", label: "Overdue" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pay/${id}`)
      .then(async (res) => {
        if (!res.ok) { setLoading(false); return; }
        const { invoice: inv, paymentInfo: info } = await res.json();
        // Map snake_case DB row to the Invoice type used by this page
        setInvoice({
          id:             inv.id,
          userId:         inv.user_id,
          clientName:     inv.client_name,
          clientId:       inv.client_id,
          clientEmail:    inv.client_email,
          clientAddress:  inv.client_address,
          invoiceNumber:  inv.invoice_number,
          status:         inv.status,
          issueDate:      inv.issue_date,
          dueDate:        inv.due_date,
          currency:       inv.currency ?? "EUR",
          subtotal:       inv.subtotal ?? 0,
          taxRate:        inv.tax_rate ?? 0,
          taxAmount:      inv.tax_amount ?? 0,
          total:          inv.total ?? 0,
          notes:          inv.notes,
          paidAt:         inv.paid_at,
          items:          inv.items ?? [],
          linkedIncomeEntryId: inv.linked_income_entry_id,
          createdAt:      inv.created_at,
        } as Invoice);
        setPaymentInfo(info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f0a" }}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0f0a" }}>
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-white font-semibold">Invoice not found</p>
          <p className="text-sm text-slate-500">This link may be expired or invalid.</p>
        </div>
      </div>
    );
  }

  const status = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.sent;
  const hasBank = !!(paymentInfo?.iban || paymentInfo?.bankName);
  const hasPayPal = !!paymentInfo?.paypalEmail;
  const hasWise = !!paymentInfo?.wiseEmail;
  const hasAnyPayment = hasBank || hasPayPal || hasWise;

  const isOverdue =
    invoice.status !== "paid" &&
    dayjs().isAfter(dayjs(invoice.dueDate));

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#0a0f0a" }}>
      <div className="max-w-xl mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Invoice</p>
            <h1 className="text-xl font-bold text-white">{invoice.invoiceNumber}</h1>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* ── Invoice card ───────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1a0f", border: "1px solid #1e2d1e" }}>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-4 p-5 border-b" style={{ borderColor: "#1e2d1e" }}>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Bill to</p>
              <p className="text-sm font-semibold text-white">{invoice.clientName}</p>
              {invoice.clientEmail && (
                <p className="text-xs text-slate-500 mt-0.5">{invoice.clientEmail}</p>
              )}
              {invoice.clientAddress && (
                <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{invoice.clientAddress}</p>
              )}
            </div>
            <div className="text-right">
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-0.5">Issue date</p>
                <p className="text-sm text-white">{dayjs(invoice.issueDate).format("MMM D, YYYY")}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Due date</p>
                <p className="text-sm font-semibold" style={{ color: isOverdue ? "#f87171" : "#e2e8f0" }}>
                  {dayjs(invoice.dueDate).format("MMM D, YYYY")}
                  {isOverdue && <span className="ml-1.5 text-xs font-normal" style={{ color: "#f87171" }}>Overdue</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="p-5 space-y-2">
            <div className="grid grid-cols-12 gap-2 pb-2 border-b" style={{ borderColor: "#1e2d1e" }}>
              <p className="col-span-6 text-xs font-medium text-slate-500">Description</p>
              <p className="col-span-2 text-xs font-medium text-slate-500 text-center">Qty</p>
              <p className="col-span-2 text-xs font-medium text-slate-500 text-right">Unit price</p>
              <p className="col-span-2 text-xs font-medium text-slate-500 text-right">Total</p>
            </div>
            {invoice.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-1.5">
                <p className="col-span-6 text-sm text-white leading-snug">{item.description}</p>
                <p className="col-span-2 text-sm text-slate-400 text-center">{item.quantity}</p>
                <p className="col-span-2 text-sm text-slate-400 text-right">
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </p>
                <p className="col-span-2 text-sm text-white font-medium text-right">
                  {formatCurrency(item.total, invoice.currency)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 pb-5 space-y-1.5">
            <div className="border-t pt-3 space-y-1.5" style={{ borderColor: "#1e2d1e" }}>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Tax ({invoice.taxRate ?? 0}%)</span>
                  <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white pt-1.5 border-t"
                style={{ borderColor: "#1e2d1e" }}>
                <span>Total due</span>
                <span style={{ color: invoice.status === "paid" ? "#22C55E" : "#fff" }}>
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-5 pb-5">
              <p className="text-xs text-slate-600 leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* ── Payment instructions ────────────────────────────────────── */}
        {invoice.status !== "paid" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1a0f", border: "1px solid #1e2d1e" }}>
            <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "#1e2d1e" }}>
              <h2 className="text-sm font-semibold text-white">How to pay</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Please use the invoice number <span className="font-mono text-slate-300">{invoice.invoiceNumber}</span> as your payment reference.
              </p>
            </div>

            {hasAnyPayment ? (
              <div className="p-5 space-y-5">

                {/* Bank transfer */}
                {hasBank && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Bank transfer
                    </p>
                    <div className="rounded-xl px-4" style={{ background: "#0a0f0a", border: "1px solid #1e2d1e" }}>
                      <CopyField label="Account name" value={paymentInfo!.accountName} />
                      <CopyField label="Bank" value={paymentInfo!.bankName} />
                      <CopyField label="IBAN" value={paymentInfo!.iban} />
                      <CopyField label="BIC / SWIFT" value={paymentInfo!.bic} />
                      <CopyField label="Reference" value={invoice.invoiceNumber} />
                    </div>
                  </div>
                )}

                {/* PayPal */}
                {hasPayPal && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      PayPal
                    </p>
                    <div className="rounded-xl px-4" style={{ background: "#0a0f0a", border: "1px solid #1e2d1e" }}>
                      <CopyField label="PayPal email" value={paymentInfo!.paypalEmail} />
                    </div>
                  </div>
                )}

                {/* Wise / Revolut */}
                {hasWise && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Wise / Revolut
                    </p>
                    <div className="rounded-xl px-4" style={{ background: "#0a0f0a", border: "1px solid #1e2d1e" }}>
                      <CopyField label="Email / handle" value={paymentInfo!.wiseEmail} />
                    </div>
                  </div>
                )}

                {/* Extra notes */}
                {paymentInfo?.paymentNotes && (
                  <p className="text-xs text-slate-500 leading-relaxed">{paymentInfo.paymentNotes}</p>
                )}
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm text-slate-500">
                  Payment details haven't been configured yet. Please contact the sender directly.
                </p>
              </div>
            )}
          </div>
        )}

        {invoice.status === "paid" && (
          <div className="rounded-2xl p-5 text-center" style={{ background: "#22C55E08", border: "1px solid #22C55E30" }}>
            <Check className="h-8 w-8 mx-auto mb-2" style={{ color: "#22C55E" }} />
            <p className="text-sm font-semibold text-white">This invoice has been paid</p>
            <p className="text-xs text-slate-500 mt-1">Thank you!</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 pb-4">
          Powered by MyStackd
        </p>
      </div>
    </div>
  );
}
