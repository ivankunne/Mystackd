"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, FileText, ArrowRight, Trash2, Copy, Check, Send, Mail } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getProposals, createProposal, updateProposal, deleteProposal } from "@/lib/data/proposals";
import { getClients } from "@/lib/data/clients";
import { createInvoice } from "@/lib/data/invoices";
import { createContract } from "@/lib/data/contracts";
import { createProject } from "@/lib/data/projects";
import { useAuth } from "@/lib/context/AuthContext";
import { formatCurrency } from "@/lib/calculations";
import type { Proposal, ProposalItem, Client, Currency } from "@/lib/mock-data";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "Draft",    color: "#94a3b8", bg: "#64748b20" },
  sent:     { label: "Sent",     color: "#60a5fa", bg: "#3b82f620" },
  accepted: { label: "Accepted", color: "#22C55E", bg: "#22C55E20" },
  declined: { label: "Declined", color: "#f87171", bg: "#ef444420" },
  expired:  { label: "Expired",  color: "#f59e0b", bg: "#f59e0b20" },
};

function StatusBadge({ status }: { status: Proposal["status"] }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Empty line item ──────────────────────────────────────────────────────────

const emptyItem = (): ProposalItem => ({
  description: "", quantity: 1, unitPrice: 0, total: 0,
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertingContractId, setConvertingContractId] = useState<string | null>(null);
  const [convertingProjectId, setConvertingProjectId] = useState<string | null>(null);
  const [sendProposal, setSendProposal] = useState<Proposal | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // New proposal form
  const [formClientId, setFormClientId] = useState("");
  const [formProject, setFormProject] = useState("");
  const [formScope, setFormScope] = useState("");
  const [formDeliverables, setFormDeliverables] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formValidUntil, setFormValidUntil] = useState(
    dayjs().add(14, "day").format("YYYY-MM-DD")
  );
  const [formCurrency, setFormCurrency] = useState<Currency>("EUR");
  const [formItems, setFormItems] = useState<ProposalItem[]>([emptyItem()]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProposals(user?.id), getClients(user?.id)]).then(async ([p, c]) => {
      if (!mounted) return;
      // Auto-expire proposals whose validUntil date has passed
      const today = dayjs().format("YYYY-MM-DD");
      const toExpire = p.filter(
        (pr) => pr.status === "sent" && pr.validUntil && pr.validUntil < today,
      );
      const expiredUpdates = await Promise.all(
        toExpire.map((pr) => updateProposal(pr.id, { status: "expired" })),
      );
      const updatedMap = Object.fromEntries(expiredUpdates.map((u) => [u.id, u]));
      setProposals(p.map((pr) => updatedMap[pr.id] ?? pr));
      setClients(c);
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const filtered = useMemo(() =>
    filterStatus === "all" ? proposals : proposals.filter((p) => p.status === filterStatus),
    [proposals, filterStatus]
  );

  // Stats
  const stats = useMemo(() => {
    const sent = proposals.filter((p) => p.status === "sent");
    const accepted = proposals.filter((p) => p.status === "accepted");
    const total = proposals.filter((p) => p.status !== "draft");
    const winRate = total.length > 0 ? Math.round((accepted.length / total.length) * 100) : 0;
    return {
      open: sent.length,
      openValue: sent.reduce((s, p) => s + p.total, 0),
      accepted: accepted.length,
      winRate,
    };
  }, [proposals]);

  // Form helpers
  const updateItem = (idx: number, field: keyof ProposalItem, val: string | number) => {
    setFormItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const formSubtotal = formItems.reduce((s, it) => s + it.total, 0);
  const selectedClient = clients.find((c) => c.id === formClientId);

  const handleCreate = async () => {
    if (!formClientId || !formProject || formItems.some((i) => !i.description)) return;
    setIsCreating(true);
    try {
      const p = await createProposal({
        userId: user?.id ?? "user_mock_001",
        clientId: formClientId,
        clientName: selectedClient?.name ?? "",
        projectName: formProject,
        status: "draft",
        items: formItems,
        currency: formCurrency,
        subtotal: formSubtotal,
        total: formSubtotal,
        validUntil: formValidUntil,
        scope: formScope || undefined,
        deliverables: formDeliverables || undefined,
        notes: formNotes || undefined,
      });
      setProposals((prev) => [p, ...prev]);
      setCreateOpen(false);
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormClientId(""); setFormProject(""); setFormScope(""); setFormDeliverables("");
    setFormNotes(""); setFormItems([emptyItem()]); setFormCurrency("EUR");
    setFormValidUntil(dayjs().add(14, "day").format("YYYY-MM-DD"));
  };

  const openSendDialog = (p: Proposal) => {
    const client = clients.find((c) => c.id === p.clientId);
    setSendEmail(client?.email ?? "");
    setSendProposal(p);
    setLinkCopied(false);
  };

  const handleSendViaEmail = async () => {
    if (!sendProposal) return;
    const link = `${window.location.origin}/proposals/${sendProposal.id}`;
    const subject = encodeURIComponent(`Proposal: ${sendProposal.projectName}`);
    const body = encodeURIComponent(
      `Hi ${sendProposal.clientName},\n\nPlease find your proposal for "${sendProposal.projectName}" at the link below:\n\n${link}\n\nTotal: ${formatCurrency(sendProposal.total, sendProposal.currency)}\nValid until: ${dayjs(sendProposal.validUntil).format("MMMM D, YYYY")}\n\nYou can accept or decline directly from the link.\n\nBest regards`
    );
    window.open(`mailto:${sendEmail}?subject=${subject}&body=${body}`);
    await handleMarkSent(sendProposal);
    setSendProposal(null);
  };

  const handleCopyLink = () => {
    if (!sendProposal) return;
    const link = `${window.location.origin}/proposals/${sendProposal.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleMarkSent = async (p: Proposal) => {
    const updated = await updateProposal(p.id, { status: "sent", sentAt: new Date().toISOString() });
    setProposals((prev) => prev.map((x) => x.id === updated.id ? updated : x));
  };

  const handleMarkAccepted = async (p: Proposal) => {
    const updated = await updateProposal(p.id, { status: "accepted", respondedAt: new Date().toISOString() });
    setProposals((prev) => prev.map((x) => x.id === updated.id ? updated : x));
  };

  const handleMarkDeclined = async (p: Proposal) => {
    const updated = await updateProposal(p.id, { status: "declined", respondedAt: new Date().toISOString() });
    setProposals((prev) => prev.map((x) => x.id === updated.id ? updated : x));
  };

  const handleDelete = async (id: string) => {
    await deleteProposal(id);
    setProposals((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConvertToInvoice = async (p: Proposal) => {
    setConvertingId(p.id);
    try {
      const client = clients.find((c) => c.id === p.clientId);
      const subtotal = p.subtotal;
      const inv = await createInvoice({
        userId: user?.id ?? "user_mock_001",
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        clientName: p.clientName,
        clientEmail: client?.email,
        clientAddress: undefined,
        items: p.items,
        currency: p.currency,
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal,
        status: "draft",
        issueDate: dayjs().format("YYYY-MM-DD"),
        dueDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
        notes: `Generated from proposal: ${p.projectName}`,
      });
      await updateProposal(p.id, { convertedToInvoiceId: inv.id });
      setProposals((prev) => prev.map((x) => x.id === p.id ? { ...x, convertedToInvoiceId: inv.id } : x));
      router.push("/invoices");
    } finally {
      setConvertingId(null);
    }
  };

  const handleConvertToContract = async (p: Proposal) => {
    setConvertingContractId(p.id);
    try {
      const contract = await createContract({
        userId: user?.id ?? "user_mock_001",
        clientId: p.clientId,
        clientName: p.clientName,
        projectName: p.projectName,
        status: "draft",
        proposalId: p.id,
        rate: p.total,
        rateType: "fixed",
        currency: p.currency,
        paymentTermsDays: 30,
        startDate: dayjs().format("YYYY-MM-DD"),
        scope: p.scope ?? p.items.map((i) => i.description).join(", "),
        deliverables: p.deliverables ?? p.items.map((i) => i.description).join("\n"),
        notes: p.notes,
      });
      await updateProposal(p.id, { convertedToContractId: contract.id });
      setProposals((prev) =>
        prev.map((x) => x.id === p.id ? { ...x, convertedToContractId: contract.id } : x)
      );
      router.push("/contracts");
    } finally {
      setConvertingContractId(null);
    }
  };

  const handleConvertToProject = async (p: Proposal) => {
    setConvertingProjectId(p.id);
    try {
      const project = await createProject({
        userId: user?.id ?? "user_mock_001",
        clientId: p.clientId,
        clientName: p.clientName,
        name: p.projectName,
        status: "active",
        budgetAmount: p.total,
        currency: p.currency,
        startDate: dayjs().format("YYYY-MM-DD"),
        proposalId: p.id,
        notes: [p.scope, p.deliverables, p.notes].filter(Boolean).join("\n\n") || undefined,
      });
      await updateProposal(p.id, { convertedToProjectId: project.id });
      setProposals((prev) =>
        prev.map((x) => x.id === p.id ? { ...x, convertedToProjectId: project.id } : x)
      );
      router.push("/projects");
    } finally {
      setConvertingProjectId(null);
    }
  };

  const inputCls = "h-9 text-sm";
  const labelCls = "text-xs font-medium";

  return (
    <AppShell title="Proposals">
      <div className="p-5 lg:p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Open proposals", value: String(stats.open), sub: formatCurrency(stats.openValue, user?.currency ?? "EUR") + " pending", color: "#60a5fa" },
            { label: "Accepted", value: String(stats.accepted), sub: "all time", color: "#22C55E" },
            { label: "Win rate", value: `${stats.winRate}%`, sub: "accepted vs sent", color: "#22C55E" },
            { label: "Total proposals", value: String(proposals.length), sub: "all time", color: "#94a3b8" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {["all", "draft", "sent", "accepted", "declined", "expired"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filterStatus === s ? "#22C55E20" : "var(--bg-card)",
                  color: filterStatus === s ? "#22C55E" : "#64748b",
                  border: `1px solid ${filterStatus === s ? "#22C55E40" : "var(--border-col)"}`,
                }}>
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setCreateOpen(true)}
            className="font-semibold" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Proposal
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {filterStatus === "all" ? "No proposals yet. Create your first one." : `No ${filterStatus} proposals.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-xl overflow-hidden"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-white">{p.projectName}</p>
                      <StatusBadge status={p.status} />
                      {p.convertedToInvoiceId && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "#22C55E15", color: "#22C55E" }}>
                          → Invoiced
                        </span>
                      )}
                      {p.convertedToContractId && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "#a78bfa15", color: "#a78bfa" }}>
                          → Contract
                        </span>
                      )}
                      {p.convertedToProjectId && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "#38bdf820", color: "#38bdf8" }}>
                          → Project
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {p.clientName} · {formatCurrency(p.total, p.currency)} · Valid until {dayjs(p.validUntil).format("MMM D, YYYY")}
                    </p>
                    {p.scope && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{p.scope}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {/* Primary actions based on status */}
                    {p.status === "draft" && (
                      <button onClick={() => openSendDialog(p)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: "#3b82f620", color: "#60a5fa", border: "1px solid #3b82f640" }}>
                        <Send className="h-3 w-3" /> Send
                      </button>
                    )}
                    {p.status === "sent" && (
                      <>
                        <button onClick={() => handleMarkAccepted(p)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E40" }}>
                          Mark accepted
                        </button>
                        <button onClick={() => handleMarkDeclined(p)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444440" }}>
                          Declined
                        </button>
                      </>
                    )}
                    {p.status === "accepted" && !p.convertedToContractId && (
                      <button
                        onClick={() => handleConvertToContract(p)}
                        disabled={convertingContractId === p.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                        style={{ background: "#a78bfa", color: "var(--bg-sidebar)" }}>
                        {convertingContractId === p.id ? "Creating…" : <>To contract <ArrowRight className="h-3 w-3" /></>}
                      </button>
                    )}
                    {p.status === "accepted" && !p.convertedToProjectId && (
                      <button
                        onClick={() => handleConvertToProject(p)}
                        disabled={convertingProjectId === p.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                        style={{ background: "#0ea5e9", color: "var(--bg-sidebar)" }}>
                        {convertingProjectId === p.id ? "Creating…" : <>To project <ArrowRight className="h-3 w-3" /></>}
                      </button>
                    )}
                    {p.status === "accepted" && !p.convertedToInvoiceId && (
                      <button
                        onClick={() => handleConvertToInvoice(p)}
                        disabled={convertingId === p.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                        style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                        {convertingId === p.id ? "Creating…" : <>To invoice <ArrowRight className="h-3 w-3" /></>}
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1.5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Line items summary */}
                <div className="px-5 pb-4 border-t" style={{ borderColor: "var(--border-col)" }}>
                  <div className="mt-3 space-y-1">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{item.description}</span>
                        <span className="text-slate-300 font-medium">{formatCurrency(item.total, p.currency)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs pt-2 border-t mt-2"
                      style={{ borderColor: "var(--border-col)" }}>
                      <span className="font-semibold text-white">Total</span>
                      <span className="font-bold text-white">{formatCurrency(p.total, p.currency)}</span>
                    </div>
                  </div>
                  {p.sentAt && (
                    <p className="text-xs text-slate-600 mt-2">
                      Sent {dayjs(p.sentAt).format("MMM D, YYYY")}
                      {p.respondedAt && ` · Responded ${dayjs(p.respondedAt).format("MMM D, YYYY")}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Send Proposal Dialog ──────────────────────────────────────── */}
      <Dialog open={!!sendProposal} onOpenChange={(v) => !v && setSendProposal(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">Send Proposal</DialogTitle>
          </DialogHeader>
          {sendProposal && (
            <div className="space-y-4 mt-2">
              {/* Send controls */}
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Shareable link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Shareable link</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/proposals/${sendProposal.id}` : ""}
                      className="flex-1 h-9 px-3 rounded-md text-xs text-slate-400 border bg-transparent truncate"
                      style={{ borderColor: "var(--border-col)" }}
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-medium transition-all"
                      style={{
                        background: linkCopied ? "#22C55E20" : "var(--bg-page)",
                        color: linkCopied ? "#22C55E" : "#94a3b8",
                        border: `1px solid `,
                      }}>
                      {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {linkCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">Client can accept or decline from this link.</p>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Client email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-md text-sm border"
                    style={{ background: "var(--bg-page)", borderColor: "var(--border-col)" }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { handleMarkSent(sendProposal); setSendProposal(null); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity">
                  Just mark sent
                </button>
                <button
                  onClick={handleSendViaEmail}
                  disabled={!sendEmail}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#3b82f6", color: "#fff" }}>
                  <Mail className="h-3.5 w-3.5" /> Open email client
                </button>
              </div>

              {/* ── Proposal preview ── */}
              <div className="border-t pt-4 space-y-4" style={{ borderColor: "var(--border-col)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proposal preview</p>

                {/* Header */}
                <div>
                  <h2 className="text-base font-bold text-white">{sendProposal.projectName}</h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    For <span className="text-white">{sendProposal.clientName}</span>
                    {" · "}Valid until {dayjs(sendProposal.validUntil).format("MMM D, YYYY")}
                  </p>
                </div>

                {/* Scope */}
                {sendProposal.scope && (
                  <div className="rounded-lg p-4 space-y-1.5"
                    style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scope of Work</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{sendProposal.scope}</p>
                  </div>
                )}

                {/* Deliverables */}
                {sendProposal.deliverables && (
                  <div className="rounded-lg p-4 space-y-1.5"
                    style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deliverables</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{sendProposal.deliverables}</p>
                  </div>
                )}

                {/* Line items */}
                <div className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid var(--border-col)" }}>
                  <div className="px-4 py-2.5 border-b"
                    style={{ background: "var(--bg-page)", borderColor: "var(--border-col)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--border-col)" }}>
                    {sendProposal.items.map((item, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-white">{item.description}</p>
                          {item.quantity !== 1 && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.quantity} × {formatCurrency(item.unitPrice, sendProposal.currency)}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white flex-shrink-0">
                          {formatCurrency(item.total, sendProposal.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between border-t"
                    style={{ background: "var(--bg-page)", borderColor: "var(--border-col)" }}>
                    <span className="text-sm font-bold text-white">Total</span>
                    <span className="text-base font-bold text-white">
                      {formatCurrency(sendProposal.total, sendProposal.currency)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {sendProposal.notes && (
                  <div className="rounded-lg p-4 space-y-1.5"
                    style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes & Payment Terms</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{sendProposal.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Proposal Dialog ─────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">New Proposal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Client + project */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Client *</Label>
                <select value={formClientId} onChange={(e) => setFormClientId(e.target.value)}
                  className="h-9 w-full rounded-md px-3 text-sm border outline-none"
                  style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }}>
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Currency</Label>
                <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value as Currency)}
                  className="h-9 w-full rounded-md px-3 text-sm border outline-none"
                  style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }}>
                  {["EUR", "USD", "GBP", "NOK"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className={labelCls}>Project name *</Label>
                <Input value={formProject} onChange={(e) => setFormProject(e.target.value)}
                  placeholder="e.g. Website Redesign" className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Valid until</Label>
                <Input type="date" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)}
                  className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
              </div>
            </div>

            {/* Scope + deliverables */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Scope of work</Label>
              <textarea value={formScope} onChange={(e) => setFormScope(e.target.value)}
                placeholder="What will you do? What's included and what's not?"
                rows={2} className="w-full px-3 py-2 rounded-md text-sm text-white placeholder-slate-500 border resize-none outline-none"
                style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Deliverables</Label>
              <textarea value={formDeliverables} onChange={(e) => setFormDeliverables(e.target.value)}
                placeholder="What will the client receive? e.g. Figma file, PDF report, 2 rounds of revisions"
                rows={2} className="w-full px-3 py-2 rounded-md text-sm text-white placeholder-slate-500 border resize-none outline-none"
                style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }} />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <Label className={labelCls}>Line items *</Label>
              {formItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder="Description" className={`${inputCls} col-span-6`} style={{ background: "var(--bg-sidebar)" }} />
                  <Input type="number" value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                    placeholder="Qty" className={`${inputCls} col-span-2 text-center`} style={{ background: "var(--bg-sidebar)" }} />
                  <Input type="number" value={item.unitPrice || ""} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                    placeholder="Rate" className={`${inputCls} col-span-2`} style={{ background: "var(--bg-sidebar)" }} />
                  <p className="col-span-1 text-xs text-slate-400 text-right">{formatCurrency(item.total, formCurrency)}</p>
                  {formItems.length > 1 && (
                    <button onClick={() => setFormItems((p) => p.filter((_, i) => i !== idx))}
                      className="col-span-1 text-slate-600 hover:text-red-400 flex justify-center">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setFormItems((p) => [...p, emptyItem()])}
                className="text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: "#22C55E" }}>
                + Add line item
              </button>
              <div className="flex justify-end pt-1">
                <p className="text-sm font-semibold text-white">
                  Total: {formatCurrency(formSubtotal, formCurrency)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Notes / payment terms</Label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. 50% upfront, 50% on delivery. Net 14."
                rows={2} className="w-full px-3 py-2 rounded-md text-sm text-white placeholder-slate-500 border resize-none outline-none"
                style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" className=""
                onClick={() => { setCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} size="sm" disabled={isCreating || !formClientId || !formProject}
                className="font-semibold" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                {isCreating ? "Creating…" : "Create Proposal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
