"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import {
  FileText, Download, CheckCircle2, Clock, AlertCircle,
  XCircle, File, Image, Video, CreditCard, PenLine, CheckCircle,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import type {
  ClientPortal, ProjectUpdate, SharedFile, ClientFeedback, Invoice, Client,
  Proposal, Contract,
} from "@/lib/mock-data";
import type { PortalUpdateStatus } from "@/lib/mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentInfo = {
  accountName?: string; bankName?: string; iban?: string; bic?: string;
  paypalEmail?: string; wiseEmail?: string; paymentNotes?: string;
};

type FreelancerInfo = {
  email: string | null;
  phone: string | null;
  website: string | null;
  bio: string | null;
  isPro: boolean;
  portfolioUrl: string | null;
};

// ─── Design tokens (light mode - matches dashboard) ─
const D = {
  bg:       "var(--bg-page)",
  card:     "var(--bg-card)",
  elevated: "var(--bg-elevated)",
  border:   "var(--border-col)",
  border2:  "var(--border-col)40",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
} as const;

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PortalUpdateStatus, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  "on-track":  { label: "On track",  color: "#22C55E", bg: "#22C55E15", Icon: CheckCircle2 },
  "review":    { label: "In review", color: "#F59E0B", bg: "#F59E0B15", Icon: Clock },
  "completed": { label: "Completed", color: "#60a5fa", bg: "#60a5fa15", Icon: CheckCircle2 },
  "blocked":   { label: "Blocked",   color: "#f87171", bg: "#f8717115", Icon: AlertCircle },
};

function StatusBadge({ status }: { status: PortalUpdateStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}>
      <c.Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

// ─── File type icon ───────────────────────────────────────────────────────────
function FileTypeIcon({ type }: { type: SharedFile["type"] }) {
  const icons = { design: Image, document: FileText, video: Video, other: File };
  const colors = { design: "#635BFF", document: "#22C55E", video: "#EC4899", other: "#64748b" };
  const Icon = icons[type];
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: colors[type] + "20" }}>
      <Icon className="h-5 w-5" style={{ color: colors[type] }} />
    </div>
  );
}

// ─── Invoice status badge ─────────────────────────────────────────────────────
function InvoiceStatus({ status }: { status: Invoice["status"] }) {
  const map = {
    paid:    { label: "Paid",    color: "#22C55E", bg: "#22C55E15" },
    sent:    { label: "Sent",    color: "#60a5fa", bg: "#60a5fa15" },
    overdue: { label: "Overdue", color: "#f87171", bg: "#f8717115" },
    draft:   { label: "Draft",   color: "#64748b", bg: "#64748b15" },
  };
  const s = map[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor, children }: {
  title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: D.card, border: `1px solid ${D.border}` }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: D.border }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconColor + "20" }}>
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: D.textPrimary }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Payment modal ────────────────────────────────────────────────────────────
function PaymentModal({ invoice, paymentInfo, onClose }: { invoice: Invoice; paymentInfo: PaymentInfo | null; onClose: () => void }) {
  const hasInfo = paymentInfo && (
    paymentInfo.accountName || paymentInfo.bankName ||
    paymentInfo.iban || paymentInfo.bic ||
    paymentInfo.paypalEmail || paymentInfo.wiseEmail ||
    paymentInfo.paymentNotes
  );

  const hasBankInfo = paymentInfo && (paymentInfo.iban || paymentInfo.bic || paymentInfo.bankName || paymentInfo.accountName);
  const hasPaymentServices = paymentInfo && (paymentInfo.paypalEmail || paymentInfo.wiseEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: D.card, border: `1px solid ${D.border}` }}>
        <div className="text-center space-y-1 mb-6">
          <CreditCard className="h-8 w-8 mx-auto mb-3" style={{ color: "#22C55E" }} />
          <h3 className="text-base font-semibold" style={{ color: D.textPrimary }}>Invoice Payment</h3>
          <p className="text-sm" style={{ color: D.textMuted }}>{invoice.invoiceNumber}</p>
          <p className="text-3xl font-bold mt-2" style={{ color: D.textPrimary }}>
            {formatCurrency(invoice.total, invoice.currency)}
          </p>
          {invoice.taxAmount != null && invoice.taxAmount > 0 && (
            <p className="text-xs" style={{ color: D.textMuted }}>including VAT {formatCurrency(invoice.taxAmount, invoice.currency)}</p>
          )}
        </div>

        <div className="space-y-3 p-4 rounded-xl" style={{ background: D.elevated, border: `1px solid ${D.border}` }}>
          <p className="text-xs font-semibold uppercase" style={{ color: D.textMuted }}>Payment Instructions</p>

          {hasInfo ? (
            <div className="space-y-3 text-sm">
              {hasBankInfo && (
                <div className="space-y-2">
                  {paymentInfo.accountName && (
                    <div>
                      <p className="text-xs" style={{ color: D.textMuted }}>Account holder</p>
                      <p style={{ color: D.textPrimary, fontWeight: 500 }}>{paymentInfo.accountName}</p>
                    </div>
                  )}
                  {paymentInfo.bankName && (
                    <div>
                      <p className="text-xs" style={{ color: D.textMuted }}>Bank</p>
                      <p style={{ color: D.textPrimary, fontWeight: 500 }}>{paymentInfo.bankName}</p>
                    </div>
                  )}
                  {paymentInfo.iban && (
                    <div>
                      <p className="text-xs" style={{ color: D.textMuted }}>IBAN</p>
                      <p style={{ color: D.textPrimary, fontWeight: 500, fontFamily: "monospace", fontSize: "12px" }}>{paymentInfo.iban}</p>
                    </div>
                  )}
                  {paymentInfo.bic && (
                    <div>
                      <p className="text-xs" style={{ color: D.textMuted }}>BIC / SWIFT</p>
                      <p style={{ color: D.textPrimary, fontWeight: 500, fontFamily: "monospace", fontSize: "12px" }}>{paymentInfo.bic}</p>
                    </div>
                  )}
                </div>
              )}

              {hasPaymentServices && hasBankInfo && (
                <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: "12px" }} />
              )}

              {hasPaymentServices && (
                <div className="space-y-2">
                  {paymentInfo.paypalEmail && (
                    <div>
                      <p className="text-xs" style={{ color: D.textMuted }}>PayPal</p>
                      <p style={{ color: D.textPrimary, fontWeight: 500 }}>{paymentInfo.paypalEmail}</p>
                    </div>
                  )}
                  {paymentInfo.wiseEmail && (
                    <div>
                      <p className="text-xs" style={{ color: D.textMuted }}>Wise / Revolut</p>
                      <p style={{ color: D.textPrimary, fontWeight: 500 }}>{paymentInfo.wiseEmail}</p>
                    </div>
                  )}
                </div>
              )}

              {paymentInfo.paymentNotes && (
                <div>
                  <p className="text-xs" style={{ color: D.textMuted }}>Notes</p>
                  <p style={{ color: D.textPrimary, fontSize: "13px", lineHeight: 1.4 }}>{paymentInfo.paymentNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: D.textPrimary }}>
              Please contact the freelancer for payment instructions and bank details.
            </p>
          )}

          <p className="text-xs pt-2" style={{ color: D.textMuted, borderTop: `1px solid ${D.border}`, paddingTop: "12px" }}>
            Due date: {dayjs(invoice.dueDate).format("MMMM D, YYYY")}
          </p>
        </div>

        <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: "#22C55E", color: "#ffffff" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── E-signature panel ────────────────────────────────────────────────────────
function SignaturePanel({ contract, onSign, signing }: {
  contract: Contract;
  onSign: (name: string) => Promise<void>;
  signing: boolean;
}) {
  const [sigName, setSigName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localSigning, setLocalSigning] = useState(false);

  if (contract.clientSignedAt) {
    return (
      <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#22C55E15", border: "1px solid #22C55E30" }}>
        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#22C55E" }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "#22C55E" }}>Signed by {contract.clientSignatureName}</p>
          <p className="text-[10px]" style={{ color: "#64748b" }}>{dayjs(contract.clientSignedAt).format("MMM D, YYYY [at] HH:mm")}</p>
        </div>
      </div>
    );
  }

  const handleSign = async () => {
    if (!sigName || !agreed || localSigning || signing) return;
    setLocalSigning(true);
    await onSign(sigName);
    setLocalSigning(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs font-medium px-3 py-2.5 rounded-xl transition-colors"
        style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa30" }}
      >
        <span className="flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> Sign this contract</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="space-y-3 p-4 rounded-xl" style={{ background: D.bg, border: `1px solid ${D.border}` }}>
          <input
            type="text"
            placeholder="Your full legal name"
            value={sigName}
            onChange={(e) => setSigName(e.target.value)}
            className="w-full h-9 px-3 rounded-lg text-sm border outline-none"
            style={{ background: D.card, borderColor: D.border, color: D.textPrimary }}
          />
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-purple-500 flex-shrink-0" />
            <span className="text-xs leading-relaxed" style={{ color: D.textSecondary }}>
              I confirm I have read this contract and agree to its terms and conditions.
            </span>
          </label>
          <button
            onClick={handleSign}
            disabled={!sigName || !agreed || localSigning || signing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: "#a78bfa", color: D.bg }}
          >
            {localSigning ? "Signing…" : "Sign Contract"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token as string;

  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [freelancerInfo, setFreelancerInfo] = useState<FreelancerInfo | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);

  // ── Load all portal data via the server-side API route ─────────────────────
  useEffect(() => {
    if (!token) return;
    let mounted = true;

    fetch(`/api/portal/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          if (mounted) { setNotFound(true); setIsLoading(false); }
          return;
        }
        const json = await res.json();
        if (!mounted) return;
        setPortal(json.portal);
        setClient(json.client);
        setFreelancerInfo(json.freelancerInfo ?? null);
        setPaymentInfo(json.paymentInfo ?? null);
        setUpdates(json.updates ?? []);
        setFiles(json.files ?? []);
        setInvoices(json.invoices ?? []);
        setProposals(json.proposals ?? []);
        setContracts(json.contracts ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) { setNotFound(true); setIsLoading(false); }
      });

    return () => { mounted = false; };
  }, [token]);

  // ── Proposal accept / decline ──────────────────────────────────────────────
  const handleProposalAction = async (id: string, action: "accepted" | "declined") => {
    const apiAction = action === "accepted" ? "accept_proposal" : "decline_proposal";
    const res = await fetch(`/api/portal/${token}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: apiAction, id }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: updated.status, respondedAt: updated.responded_at }
          : p,
      ),
    );
  };

  // ── Contract signing ───────────────────────────────────────────────────────
  const handleSign = async (contractId: string, signerName: string) => {
    setSigningContractId(contractId);
    const res = await fetch(`/api/portal/${token}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign_contract", id: contractId, signerName }),
    });
    setSigningContractId(null);
    if (!res.ok) return;
    const updated = await res.json();
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              status:               updated.status,
              clientSignatureName:  updated.client_signature_name,
              clientSignedAt:       updated.client_signed_at,
            }
          : c,
      ),
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: D.bg }}>
        <div className="space-y-3 w-full max-w-2xl px-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: D.card, border: `1px solid ${D.border}` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: D.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: D.elevated }}>
            <XCircle className="h-7 w-7" style={{ color: D.textMuted }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: D.textPrimary }}>Portal not found</h1>
          <p className="text-sm" style={{ color: D.textSecondary }}>
            This portal link may be invalid or has been deactivated. Contact your freelancer for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Disabled portal ────────────────────────────────────────────────────────
  if (!portal.isEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: D.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "#22C55E20" }}>
            <span className="text-2xl font-bold" style={{ color: "#22C55E" }}>{portal.freelancerName.slice(0, 1)}</span>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: D.textPrimary }}>Portal is currently inactive</h1>
          <p className="text-sm" style={{ color: D.textSecondary }}>
            {portal.freelancerName} has temporarily deactivated this client portal.
            Reach out to them directly for project updates.
          </p>
        </div>
      </div>
    );
  }

  if (!client) return null;

  const latestUpdate = updates[0];
  const outstandingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + i.total, 0);

  return (
    <div className="min-h-screen" style={{ background: D.bg }}>
      {payingInvoice && (
        <PaymentModal invoice={payingInvoice} paymentInfo={paymentInfo ?? null} onClose={() => setPayingInvoice(null)} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b sticky top-0 z-10 backdrop-blur-md"
        style={{ borderColor: D.border, background: D.card }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "#22C55E20", color: "#22C55E" }}>
              {portal.freelancerName.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: D.textPrimary }}>{portal.freelancerName}</p>
              <p className="text-xs" style={{ color: D.textMuted }}>Shared portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
              style={{ background: "#22C55E", color: D.bg }}>M</div>
            <span className="text-xs" style={{ color: D.textMuted }}>via MyStackd</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        {/* ── Title block ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: D.textPrimary }}>{client.company ?? client.name}</h1>
          <p className="text-sm mt-1" style={{ color: D.textSecondary }}>
            Project portal shared by <span style={{ color: "#cbd5e1" }}>{portal.freelancerName}</span>
            {latestUpdate && (
              <span className="ml-2" style={{ color: D.textMuted }}>
                · Last updated {dayjs(latestUpdate.createdAt).format("MMM D, YYYY")}
              </span>
            )}
          </p>
          {portal.headerNote && (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{ background: D.card, border: `1px solid ${D.border}`, color: D.textSecondary }}>
              {portal.headerNote}
            </div>
          )}
          {outstandingTotal > 0 && (
            <div className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "#ef444412", border: "1px solid #ef444430" }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm" style={{ color: D.textPrimary }}>
                  <span className="font-semibold" style={{ color: "#f87171" }}>
                    {formatCurrency(outstandingTotal, invoices[0]?.currency ?? "EUR")}
                  </span>{" "}
                  outstanding — {outstandingInvoices.length} invoice{outstandingInvoices.length !== 1 ? "s" : ""} awaiting payment
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── About Freelancer ─────────────────────────────────────────────── */}
        {freelancerInfo && (freelancerInfo.bio || freelancerInfo.email || freelancerInfo.phone || freelancerInfo.website) && (
          <div className="rounded-2xl p-5" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: D.textPrimary }}>
              About {portal?.freelancerName}
              {freelancerInfo.isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E30" }}>
                  PRO
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {freelancerInfo.bio && (
                <div>
                  <p className="text-xs mb-1" style={{ color: D.textMuted }}>Bio</p>
                  <p className="text-sm leading-relaxed" style={{ color: D.textPrimary }}>{freelancerInfo.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {freelancerInfo.email && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: D.textMuted }}>Email</p>
                    <a href={`mailto:${freelancerInfo.email}`} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#22C55E" }}>
                      {freelancerInfo.email}
                    </a>
                  </div>
                )}
                {freelancerInfo.phone && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: D.textMuted }}>Phone</p>
                    <a href={`tel:${freelancerInfo.phone}`} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#22C55E" }}>
                      {freelancerInfo.phone}
                    </a>
                  </div>
                )}
              </div>
              {freelancerInfo.website && (
                <div>
                  <p className="text-xs mb-1" style={{ color: D.textMuted }}>Website</p>
                  <a href={freelancerInfo.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#22C55E" }}>
                    {freelancerInfo.website}
                  </a>
                </div>
              )}
              {freelancerInfo.portfolioUrl && (
                <div>
                  <p className="text-xs mb-1" style={{ color: D.textMuted }}>Portfolio</p>
                  <a href={freelancerInfo.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#22C55E" }}>
                    View public page
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Client Contact Card ──────────────────────────────────────────── */}
        {(client.email || client.phone || client.notes) && (
          <div className="rounded-2xl p-5" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: D.textPrimary }}>Your Details</h2>
            <div className="space-y-3">
              {(client.email || client.phone) && (
                <div className="grid grid-cols-2 gap-3">
                  {client.email && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: D.textMuted }}>Email</p>
                      <a href={`mailto:${client.email}`} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#22C55E" }}>
                        {client.email}
                      </a>
                    </div>
                  )}
                  {client.phone && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: D.textMuted }}>Phone</p>
                      <a href={`tel:${client.phone}`} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#22C55E" }}>
                        {client.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-xs mb-1" style={{ color: D.textMuted }}>Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: D.textPrimary }}>{client.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Current status snap ──────────────────────────────────────────── */}
        {latestUpdate && (
          <div className="rounded-2xl p-5" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs mb-1" style={{ color: D.textMuted }}>Latest update</p>
                <h2 className="text-base font-semibold" style={{ color: D.textPrimary }}>{latestUpdate.title}</h2>
              </div>
              <StatusBadge status={latestUpdate.status as PortalUpdateStatus} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: D.textSecondary }}>{latestUpdate.content}</p>
            <p className="text-xs mt-3" style={{ color: D.textMuted }}>{dayjs(latestUpdate.createdAt).format("MMMM D, YYYY [at] h:mm A")}</p>
          </div>
        )}

        {/* ── All updates ──────────────────────────────────────────────────── */}
        {portal.showUpdates && updates.length > 1 && (
          <SectionCard title="Project Updates" icon={Clock} iconColor="#635BFF">
            <div className="divide-y" style={{ borderColor: D.border }}>
              {updates.slice(1).map((u) => (
                <div key={u.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold" style={{ color: D.textPrimary }}>{u.title}</p>
                    <StatusBadge status={u.status as PortalUpdateStatus} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: D.textSecondary }}>{u.content}</p>
                  <p className="text-xs mt-2" style={{ color: D.textMuted }}>{dayjs(u.createdAt).format("MMM D, YYYY")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Files ────────────────────────────────────────────────────────── */}
        {portal.showFiles && files.length > 0 && (
          <SectionCard title="Shared Files" icon={FileText} iconColor="#22C55E">
            <div className="divide-y" style={{ borderColor: D.border }}>
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-4 px-5 py-4">
                  <FileTypeIcon type={f.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: D.textPrimary }}>{f.name}</p>
                    {f.description && <p className="text-xs mt-0.5 truncate" style={{ color: "#64748b" }}>{f.description}</p>}
                    <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{f.sizeLabel} · Uploaded {dayjs(f.uploadedAt).format("MMM D, YYYY")}</p>
                  </div>
                  {f.storageUrl ? (
                    <a
                      href={f.storageUrl}
                      download={f.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all hover:opacity-80"
                      style={{ background: "#22C55E15", color: "#22C55E", border: "1px solid #22C55E30" }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 text-xs flex-shrink-0" style={{ color: D.textMuted }}>
                      Not available
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Proposals ────────────────────────────────────────────────────── */}
        {proposals.length > 0 && (
          <SectionCard title="Proposals" icon={CheckCircle2} iconColor="#22C55E">
            <div className="divide-y" style={{ borderColor: D.border }}>
              {proposals.map((prop) => {
                const total = (prop.items as { total: number }[]).reduce((s, i) => s + i.total, 0);
                const isPending = prop.status === "sent";
                return (
                  <div key={prop.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: D.textPrimary }}>{prop.projectName}</p>
                        {prop.validUntil && (
                          <p className="text-xs" style={{ color: "#64748b" }}>Valid until {dayjs(prop.validUntil).format("MMM D, YYYY")}</p>
                        )}
                      </div>
                      <p className="text-base font-bold flex-shrink-0" style={{ color: D.textPrimary }}>
                        {formatCurrency(total, prop.currency)}
                      </p>
                    </div>
                    {prop.scope && <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{prop.scope}</p>}
                    {(prop.items as { description: string; quantity: number; total: number }[]).length > 0 && (
                      <div className="space-y-1 pt-2 border-t" style={{ borderColor: "#2B3D6060" }}>
                        {(prop.items as { description: string; quantity: number; total: number }[]).map((item, i) => (
                          <div key={i} className="flex justify-between text-xs" style={{ color: "#94a3b8" }}>
                            <span>{item.description} × {item.quantity}</span>
                            <span>{formatCurrency(item.total, prop.currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isPending ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleProposalAction(prop.id, "accepted")}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ background: "#22C55E", color: D.bg }}>
                          Accept
                        </button>
                        <button onClick={() => handleProposalAction(prop.id, "declined")}
                          className="flex-1 py-2 rounded-xl text-sm font-medium"
                          style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444430" }}>
                          Decline
                        </button>
                      </div>
                    ) : prop.status === "accepted" ? (
                      <div className="flex items-center gap-1.5" style={{ color: "#22C55E" }}>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Accepted{prop.respondedAt ? ` — ${dayjs(prop.respondedAt).format("MMM D")}` : ""}</span>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "#475569" }}>Declined</p>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Contracts ────────────────────────────────────────────────────── */}
        {contracts.length > 0 && (
          <SectionCard title="Contracts" icon={FileText} iconColor="#a78bfa">
            <div className="divide-y" style={{ borderColor: D.border }}>
              {contracts.map((contract) => {
                const isExpanded = expandedContract === contract.id;
                return (
                  <div key={contract.id}>
                    <button
                      onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: D.textPrimary }}>{contract.projectName}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                          {formatCurrency(contract.rate, contract.currency)}{" "}
                          {contract.rateType === "hourly" ? "/hr" : contract.rateType === "monthly" ? "/mo" : "fixed"}
                          {" "}· from {dayjs(contract.startDate).format("MMM D, YYYY")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contract.clientSignedAt ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#22C55E20", color: "#22C55E" }}>Signed</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f59e0b20", color: "#f59e0b" }}>Needs signature</span>
                        )}
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" style={{ color: "#64748b" }} />
                          : <ChevronDown className="h-4 w-4" style={{ color: "#64748b" }} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "#2B3D6060" }}>
                        <div className="space-y-3 pt-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748b" }}>Scope</p>
                            <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>{contract.scope}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748b" }}>Deliverables</p>
                            <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>{contract.deliverables}</p>
                          </div>
                          {contract.revisionPolicy && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748b" }}>Revisions</p>
                              <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>{contract.revisionPolicy}</p>
                            </div>
                          )}
                          {contract.terminationClause && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748b" }}>Termination</p>
                              <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>{contract.terminationClause}</p>
                            </div>
                          )}
                        </div>

                        {/* Payment terms + end date */}
                        {(contract.paymentTermsDays || contract.endDate) && (
                          <div className="flex flex-wrap gap-4 text-xs" style={{ color: D.textMuted }}>
                            {contract.paymentTermsDays && (
                              <span>Payment terms: Net {contract.paymentTermsDays} days</span>
                            )}
                            {contract.endDate && (
                              <span>End date: {dayjs(contract.endDate).format("MMM D, YYYY")}</span>
                            )}
                          </div>
                        )}

                        {/* Contract notes */}
                        {contract.notes && (
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: D.textMuted }}>Notes</p>
                            <p className="text-sm leading-relaxed" style={{ color: D.textSecondary }}>{contract.notes}</p>
                          </div>
                        )}

                        {/* Freelancer signature confirmation */}
                        {contract.freelancerSignatureName && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: D.textMuted }}>
                            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#22C55E" }} />
                            Signed by freelancer:{" "}
                            <span style={{ color: D.textPrimary }}>{contract.freelancerSignatureName}</span>
                            {contract.signedAt && (
                              <span>· {dayjs(contract.signedAt).format("MMM D, YYYY")}</span>
                            )}
                          </div>
                        )}

                        <SignaturePanel
                          contract={contract}
                          onSign={(name) => handleSign(contract.id, name)}
                          signing={signingContractId === contract.id}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Invoices ─────────────────────────────────────────────────────── */}
        {portal.showInvoices && invoices.length > 0 && (
          <SectionCard title="Invoices" icon={FileText} iconColor="#F59E0B">
            <div className="divide-y" style={{ borderColor: D.border }}>
              {invoices.map((inv) => (
                <div key={inv.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold font-mono" style={{ color: D.textPrimary }}>{inv.invoiceNumber}</p>
                        <InvoiceStatus status={inv.status} />
                      </div>
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        Issued {dayjs(inv.issueDate).format("MMM D, YYYY")} · Due {dayjs(inv.dueDate).format("MMM D, YYYY")}
                      </p>
                      {inv.notes && (
                        <p className="text-xs leading-relaxed mt-1" style={{ color: D.textSecondary }}>{inv.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: D.textPrimary }}>{formatCurrency(inv.total, inv.currency)}</p>
                      {inv.taxAmount != null && inv.taxAmount > 0 && (
                        <p className="text-[10px]" style={{ color: "#64748b" }}>incl. VAT {formatCurrency(inv.taxAmount, inv.currency)}</p>
                      )}
                    </div>
                  </div>
                  {inv.status !== "paid" && (
                    <button
                      onClick={() => setPayingInvoice(inv)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={{
                        background: inv.status === "overdue" ? "#ef4444" : "#22C55E",
                        color: "#ffffff",
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs" style={{ color: "#334155" }}>
            This portal is powered by{" "}
            <span className="font-medium" style={{ color: "#475569" }}>MyStackd</span>
            {" "}— the income dashboard for freelancers.
          </p>
        </div>
      </div>
    </div>
  );
}
