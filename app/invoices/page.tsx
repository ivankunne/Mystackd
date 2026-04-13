"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, Download, CheckCircle, Trash2, AlertTriangle, Link2, Check, Search, ChevronUp, ChevronDown, FileText, Zap } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ProGateModal } from "@/components/ui/pro-gate-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, processRecurringInvoices } from "@/lib/data/invoices";
import { getAcceptedProposals, updateProposal } from "@/lib/data/proposals";
import { addIncomeEntry } from "@/lib/data/income";
import { getClients } from "@/lib/data/clients";
import { exportInvoicesCSV } from "@/lib/csv";
import { useAuth } from "@/lib/context/AuthContext";
import { useAlerts } from "@/lib/context/AlertContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import type { Invoice, InvoiceItem, Proposal } from "@/lib/mock-data";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:   { bg: "#f1f5f9",  text: "#64748b" },
  sent:    { bg: "#eff6ff",  text: "#2563eb" },
  paid:    { bg: "#f0fdf4",  text: "#16a34a" },
  overdue: { bg: "#fef2f2",  text: "#dc2626" },
};

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const { bg, text } = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ background: bg, color: text }}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 space-y-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)", boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function InvoicesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh: refreshAlerts } = useAlerts();
  const { toast } = useToast();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [acceptedProposals, setAcceptedProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Invoice["status"] | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"dueDate" | "amount" | "issueDate">("issueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageIndex, setPageIndex] = useState(0);
  const [convertingProposalId, setConvertingProposalId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Dynamic import for PDF generation to avoid loading jsPDF initially
  const handleGeneratePDF = async (invoice: Invoice) => {
    setIsGeneratingPDF(true);
    try {
      const { generateInvoicePDF } = await import("@/lib/pdf");
      await generateInvoicePDF(invoice);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (inv) =>
          inv.clientName.toLowerCase().includes(q) ||
          inv.invoiceNumber.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((inv) => inv.dueDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((inv) => inv.dueDate <= dateTo);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a.issueDate;
      let bVal: string | number = b.issueDate;
      if (sortBy === "amount") {
        aVal = a.total;
        bVal = b.total;
      } else if (sortBy === "dueDate") {
        aVal = a.dueDate;
        bVal = b.dueDate;
      }

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [invoices, search, statusFilter, dateFrom, dateTo, sortBy, sortDir]);

  // Pagination
  const paginatedInvoices = filteredInvoices.slice(
    pageIndex * ITEMS_PER_PAGE,
    (pageIndex + 1) * ITEMS_PER_PAGE
  );

  // Reset page index when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [search, statusFilter, dateFrom, dateTo, sortBy, sortDir]);

  // New invoice form state
  const [newClientName, setNewClientName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCurrency, setNewCurrency] = useState<"EUR" | "USD" | "GBP" | "NOK">("EUR");
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDueDate, setNewDueDate] = useState(
    dayjs().add(30, "day").format("YYYY-MM-DD")
  );
  const [newTaxRate, setNewTaxRate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newRecurringFreq, setNewRecurringFreq] = useState<"monthly" | "quarterly" | "annually">("monthly");
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user?.id) {
      setIsLoading(true);
      return;
    }
    let mounted = true;
    Promise.all([
      getInvoices(user.id),
      getAcceptedProposals(user.id),
    ]).then(([rawInvoices, proposals]) => {
      if (!mounted) return;
      // Auto-detect overdue: any "sent" invoice past due date
      const today = dayjs().format("YYYY-MM-DD");
      const invoicesWithOverdue = rawInvoices.map((inv) =>
        inv.status === "sent" && inv.dueDate < today
          ? { ...inv, status: "overdue" as Invoice["status"] }
          : inv,
      );
      // Persist overdue status updates silently so they stick across pages
      invoicesWithOverdue.forEach((inv) => {
        if (inv.status === "overdue") {
          const original = rawInvoices.find((r) => r.id === inv.id);
          if (original?.status === "sent") updateInvoice(inv.id, { status: "overdue" }).catch(() => {});
        }
      });
      setInvoices(invoicesWithOverdue);
      setAcceptedProposals(proposals.filter((p) => !p.convertedToInvoiceId));
      // Silently generate any overdue recurring invoices
      processRecurringInvoices(user?.id).then((newOnes) => {
        if (mounted && newOnes.length > 0) {
          setInvoices((prev) => [...newOnes, ...prev]);
        }
      }).catch(() => {});
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [user, authLoading]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const totalInvoiced = invoices
    .filter((inv) => new Date(inv.issueDate).getFullYear() === currentYear)
    .reduce((sum, inv) => sum + inv.total, 0);

  const outstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0);

  const paidThisMonth = invoices
    .filter((inv) => {
      if (inv.status !== "paid") return false;
      const d = new Date(inv.paidAt ?? inv.issueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + inv.total, 0);

  const updateLineItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.total = Number(item.quantity) * Number(item.unitPrice);
      }
      updated[idx] = item;
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = parseFloat(newTaxRate) / 100 || 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handleCreate = async () => {
    if (!newClientName || lineItems.every((i) => !i.description)) return;
    setIsCreating(true);
    try {
      const inv = await createInvoice({
        userId: user?.id ?? "user_mock_001",
        invoiceNumber: `INV-${currentYear}-${String(invoices.length + 1).padStart(3, "0")}`,
        clientName: newClientName,
        items: lineItems.filter((i) => i.description),
        currency: newCurrency,
        subtotal,
        taxRate: taxRate || undefined,
        taxAmount: taxAmount || undefined,
        total,
        status: "draft",
        issueDate: newIssueDate,
        dueDate: newDueDate,
        notes: newNotes || undefined,
        isRecurring: newIsRecurring || undefined,
        recurringFrequency: newIsRecurring ? newRecurringFreq : undefined,
        recurringNextDate: newIsRecurring
          ? dayjs(newIssueDate).add(newRecurringFreq === "monthly" ? 1 : newRecurringFreq === "quarterly" ? 3 : 12, "month").format("YYYY-MM-DD")
          : undefined,
      });
      setInvoices((prev) => [inv, ...prev]);
      setCreateOpen(false);
      setNewClientName("");
      setNewDescription("");
      setNewNotes("");
      setNewIsRecurring(false);
      setNewRecurringFreq("monthly");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      toast(`Invoice ${inv.invoiceNumber} created`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    const paidAt = new Date().toISOString();
    let incomeEntryId = inv.linkedIncomeEntryId;
    if (!incomeEntryId) {
      const entry = await addIncomeEntry({
        amount:     inv.total,
        currency:   inv.currency,
        date:       dayjs().format("YYYY-MM-DD"),
        source:     "manual",
        note:       `Invoice ${inv.invoiceNumber}`,
        clientId:   inv.clientId,
        clientName: inv.clientName,
      });
      incomeEntryId = entry.id;
    }
    const updated = await updateInvoice(inv.id, { status: "paid", paidAt, linkedIncomeEntryId: incomeEntryId });
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    refreshAlerts();
    toast(`${inv.clientName} marked as paid`);
  };

  const handleMarkSent = async (inv: Invoice) => {
    const updated = await updateInvoice(inv.id, { status: "sent" });
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    refreshAlerts();
    toast("Invoice marked as sent");
  };

  const handleSendInvoice = (inv: Invoice) => {
    const link = `${window.location.origin}/pay/${inv.id}`;
    const subject = encodeURIComponent(`Invoice ${inv.invoiceNumber} — ${formatCurrency(inv.total, inv.currency)}`);
    const body = encodeURIComponent(
      `Hi ${inv.clientName},\n\nPlease find your invoice at the link below:\n\n${link}\n\nAmount due: ${formatCurrency(inv.total, inv.currency)}\nDue date: ${dayjs(inv.dueDate).format("MMMM D, YYYY")}\n\nThank you!`,
    );
    window.open(`mailto:${inv.clientEmail ?? ""}?subject=${subject}&body=${body}`, "_blank");
    handleMarkSent(inv);
  };

  const handleDelete = async (id: string) => {
    await deleteInvoice(id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    toast("Invoice deleted", "error");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginatedInvoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedInvoices.map((i) => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all([...selected].map((id) => deleteInvoice(id)));
      setInvoices((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      toast(`${selected.size} invoice${selected.size > 1 ? "s" : ""} deleted`);
    } finally { setBulkProcessing(false); }
  };

  const handleBulkMarkPaid = async () => {
    if (selected.size === 0) return;
    setBulkProcessing(true);
    try {
      const toMark = invoices.filter((i) => selected.has(i.id) && i.status !== "paid");
      await Promise.all(toMark.map((inv) => handleMarkPaid(inv)));
      setSelected(new Set());
    } finally { setBulkProcessing(false); }
  };

  const handleCopyPaymentLink = (inv: Invoice) => {
    const link = `${window.location.origin}/pay/${inv.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLinkId(inv.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleConvertProposalToInvoice = async (p: Proposal) => {
    setConvertingProposalId(p.id);
    try {
      const subtotal = p.subtotal;
      const inv = await createInvoice({
        userId: user?.id ?? "user_mock_001",
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        clientName: p.clientName,
        clientEmail: undefined,
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
      setInvoices((prev) => [inv, ...prev]);
      setAcceptedProposals((prev) => prev.filter((prop) => prop.id !== p.id));
      toast(`Invoice created from proposal`);
    } finally {
      setConvertingProposalId(null);
    }
  };

  const [clientNames, setClientNames] = useState<string[]>([]);

  useEffect(() => {
    if (createOpen && user?.id) {
      getClients(user.id).then((c) => setClientNames(c.map((cl) => cl.name)));
    }
  }, [createOpen, user?.id]);

  const inputClass = "h-9 text-sm";
  const labelClass = "text-xs font-medium";

  return (
    <AppShell title="Invoices">
      <ProGateModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="Recurring Invoices"
        description="Set up invoices to automatically send on a schedule. Perfect for retainers, subscriptions, and ongoing services. Save hours every month on billing."
      />
      <div className="p-5 lg:p-6 space-y-5">
        {/* Filter pills and date range */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "draft", "sent", "paid", "overdue"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as Invoice["status"] | "all")}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
              style={{
                background: statusFilter === status ? "#22C55E20" : "var(--bg-elevated)",
                color: statusFilter === status ? "#22C55E" : "var(--text-secondary)",
                border: statusFilter === status ? "1px solid #22C55E" : "1px solid var(--border-col)",
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search, date range, and actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by client or invoice #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-3 rounded-lg text-sm border auth-input"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
            />
          </div>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-3 rounded-lg text-sm border auth-input"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
            title="From date"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-3 rounded-lg text-sm border auth-input"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
            title="To date"
          />

          {(dateFrom || dateTo || statusFilter !== "all" || search) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: "#64748b", background: "var(--bg-elevated)" }}
            >
              Clear filters
            </button>
          )}

          <span className="text-sm text-slate-500 flex-shrink-0">
            {filteredInvoices.length} of {invoices.length}
          </span>

          <Button
            onClick={() => exportInvoicesCSV(filteredInvoices)}
            size="sm"
            className="font-semibold flex-shrink-0"
            style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b30" }}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Button
            onClick={() => setCreateOpen(true)}
            className="font-semibold flex-shrink-0"
            style={{ background: "#16a34a", color: "#ffffff" }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Invoice
          </Button>
        </div>

        {/* Overdue alert */}
        {!isLoading && invoices.filter((inv) => inv.status === "overdue").length > 0 && (
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 banner-danger"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 banner-danger-icon" />
              <span className="text-sm banner-danger-text">
                <span className="font-semibold banner-danger-strong">
                  {invoices.filter((inv) => inv.status === "overdue").length} overdue
                </span>
                {" "}invoice{invoices.filter((inv) => inv.status === "overdue").length === 1 ? "" : "s"} —{" "}
                {formatCurrency(
                  invoices.filter((inv) => inv.status === "overdue").reduce((s, inv) => s + inv.total, 0),
                  user?.currency ?? "EUR"
                )} outstanding
              </span>
            </div>
            <Link href="/reminders">
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                style={{ background: "#ef444420", color: "#f87171" }}>
                Send reminders →
              </button>
            </Link>
          </div>
        )}

        {/* Stats row */}
        {(() => {
          const vatCollected = invoices
            .filter((inv) => inv.status === "paid" && new Date(inv.issueDate).getFullYear() === currentYear && inv.taxAmount)
            .reduce((sum, inv) => sum + (inv.taxAmount ?? 0), 0);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total Invoiced (YTD)"
                value={formatCurrency(totalInvoiced, user?.currency ?? "EUR")}
                sub={`${currentYear} year to date`}
              />
              <StatCard
                label="Outstanding"
                value={formatCurrency(outstanding, user?.currency ?? "EUR")}
                sub="Sent + overdue"
              />
              <StatCard
                label="Paid This Month"
                value={formatCurrency(paidThisMonth, user?.currency ?? "EUR")}
                sub="Settled invoices"
              />
              <StatCard
                label="VAT Collected (YTD)"
                value={vatCollected > 0 ? formatCurrency(vatCollected, user?.currency ?? "EUR") : "—"}
                sub="From paid invoices"
              />
            </div>
          );
        })()}

        {/* Accepted Proposals Section */}
        {!isLoading && acceptedProposals.length > 0 && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid #22C55E40" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: "#22C55E" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Accepted Proposals Ready to Convert</p>
              </div>
              <span className="text-xs text-slate-500">{acceptedProposals.length} proposal{acceptedProposals.length === 1 ? "" : "s"}</span>
            </div>
            <div className="space-y-2">
              {acceptedProposals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "var(--bg-page)" }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.projectName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.clientName} • {formatCurrency(p.total, p.currency)}</p>
                  </div>
                  <Button
                    onClick={() => handleConvertProposalToInvoice(p)}
                    disabled={convertingProposalId === p.id}
                    size="sm"
                    className="font-semibold flex-shrink-0"
                    style={{ background: "#16a34a", color: "#ffffff" }}
                  >
                    {convertingProposalId === p.id ? "Converting…" : "Convert to Invoice"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Invoices Section - Pro Feature */}
        {!isLoading && (
          <div
            className="rounded-xl p-4 space-y-3 border-l-4"
            style={{ background: "var(--bg-card)", borderColor: "#fbbf24", borderTopColor: "var(--border-col)", borderRightColor: "var(--border-col)", borderBottomColor: "var(--border-col)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: "#fbbf24" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recurring Invoices</p>
                {!user?.isPro && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fbbf2430", color: "#fbbf24" }}>
                    Pro
                  </span>
                )}
              </div>
              {!user?.isPro ? (
                <button
                  onClick={() => setShowProModal(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: "#fbbf2420", color: "#fbbf24" }}
                >
                  Upgrade to Pro →
                </button>
              ) : (
                <Button
                  onClick={() => setCreateOpen(true)}
                  size="sm"
                  className="font-semibold flex-shrink-0"
                  style={{ background: "#fbbf24", color: "#111827" }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Recurring
                </Button>
              )}
            </div>
            {user?.isPro ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Set up invoices that automatically send on a schedule. Save time on repetitive billing.
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Automatically bill clients on a schedule without manual work. Perfect for retainers and subscriptions.
              </p>
            )}
          </div>
        )}

        {/* Invoice table */}
        {isLoading ? (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <div className="hidden sm:block">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex px-5 py-3 border-b gap-5" style={{ borderColor: "var(--border-col)" }}>
                  <div className="w-8 h-8 rounded animate-pulse" style={{ background: "var(--bg-elevated)" }} />
                  <div className="h-4 w-20 rounded animate-pulse" style={{ background: "var(--bg-elevated)" }} />
                  <div className="h-4 w-32 rounded animate-pulse" style={{ background: "var(--bg-elevated)" }} />
                  <div className="h-4 w-24 rounded animate-pulse ml-auto" style={{ background: "var(--bg-elevated)" }} />
                  <div className="h-4 w-20 rounded animate-pulse" style={{ background: "var(--bg-elevated)" }} />
                </div>
              ))}
            </div>
            <div className="sm:hidden space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2 p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                  <div className="h-4 w-24 rounded animate-pulse" style={{ background: "var(--bg-card)" }} />
                  <div className="h-4 w-full rounded animate-pulse" style={{ background: "var(--bg-card)" }} />
                  <div className="h-4 w-32 rounded animate-pulse" style={{ background: "var(--bg-card)" }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            {/* Bulk action toolbar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-b" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-col)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {selected.size} selected
                </span>
                <button
                  onClick={handleBulkMarkPaid}
                  disabled={bulkProcessing}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: "#22C55E20", color: "#22C55E" }}
                >
                  Mark paid
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkProcessing}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: "#ef444420", color: "#f87171" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}
                >
                  Clear
                </button>
              </div>
            )}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                    <th className="px-5 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-600 cursor-pointer accent-green-500"
                      />
                    </th>
                    <th className="px-5 py-3 text-left">
                      <span className="text-xs font-medium text-slate-500">Invoice #</span>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <span className="text-xs font-medium text-slate-500">Client</span>
                    </th>
                    <th className="px-5 py-3 text-right cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => {
                        if (sortBy === "amount") {
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("amount");
                          setSortDir("desc");
                        }
                      }}
                      style={{ userSelect: "none" }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs font-medium text-slate-500">Amount</span>
                        {sortBy === "amount" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <span className="text-xs font-medium text-slate-500">Status</span>
                    </th>
                    <th className="px-5 py-3 text-left cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => {
                        if (sortBy === "dueDate") {
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("dueDate");
                          setSortDir("desc");
                        }
                      }}
                      style={{ userSelect: "none" }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-500">Due Date</span>
                        {sortBy === "dueDate" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <span className="text-xs font-medium text-slate-500">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className="transition-colors"
                      style={{
                        borderBottom: idx < paginatedInvoices.length - 1 ? "1px solid var(--border-col)" : "none",
                        background: selected.has(inv.id) ? "var(--bg-elevated)" : undefined,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selected.has(inv.id) ? "var(--bg-elevated)" : "transparent")}
                    >
                      <td className="px-5 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selected.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="rounded border-slate-600 cursor-pointer accent-green-500"
                        />
                      </td>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{inv.clientName}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-right" style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400">
                        {dayjs(inv.dueDate).format("MMM D, YYYY")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === "draft" && (
                            <button
                              onClick={() => handleSendInvoice(inv)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                              title="Send to client (opens email + marks sent)"
                              style={{ background: "#3b82f615", color: "#60a5fa", border: "1px solid #3b82f630" }}
                            >
                              Send
                            </button>
                          )}
                          {inv.status !== "paid" && (
                            <button
                              onClick={() => handleCopyPaymentLink(inv)}
                              className="transition-colors"
                              title="Copy payment link"
                              style={{ color: copiedLinkId === inv.id ? "#22C55E" : "#64748b" }}
                            >
                              {copiedLinkId === inv.id ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            className="transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            title="Preview invoice"
                          >
                            <AlertTriangle className="h-4 w-4" style={{ display: "none" }} />
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.042.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleGeneratePDF(inv)}
                            className="transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            disabled={isGeneratingPDF}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {inv.status !== "paid" && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="transition-colors hover:opacity-80"
                              title="Mark as paid"
                              style={{ color: "#22C55E" }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y" style={{ borderColor: "var(--border-col)" }}>
              {paginatedInvoices.map((inv) => (
                <div key={inv.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{inv.invoiceNumber}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{inv.clientName}</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(inv.total, inv.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Due {dayjs(inv.dueDate).format("MMM D, YYYY")}</p>
                  <div className="flex gap-3 pt-1">
                    {inv.status === "draft" && (
                      <button onClick={() => handleSendInvoice(inv)} className="text-xs flex items-center gap-1" style={{ color: "#60a5fa" }}>
                        Send
                      </button>
                    )}
                    <button onClick={() => handleGeneratePDF(inv)} disabled={isGeneratingPDF} className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                    {inv.status !== "paid" && (
                      <button onClick={() => handleMarkPaid(inv)} className="text-xs flex items-center gap-1" style={{ color: "#22C55E" }}>
                        <CheckCircle className="h-3.5 w-3.5" /> Mark paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {invoices.length === 0 && !isLoading && (
              <div className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No invoices yet</p>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Create your first invoice to get started</p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="font-semibold"
                  style={{ background: "#16a34a", color: "#ffffff" }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Invoice
                </Button>
              </div>
            )}

            {/* Filtered empty state */}
            {invoices.length > 0 && filteredInvoices.length === 0 && !isLoading && (
              <div className="py-12 text-center">
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>No invoices match your filters</p>
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "#3b82f6", background: "#3b82f615", border: "1px solid #3b82f630" }}
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {filteredInvoices.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--border-col)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {pageIndex * ITEMS_PER_PAGE + 1}–{Math.min((pageIndex + 1) * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                    disabled={pageIndex === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPageIndex(pageIndex + 1)}
                    disabled={(pageIndex + 1) * ITEMS_PER_PAGE >= filteredInvoices.length}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base" style={{ color: "var(--text-primary)" }}>New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Client + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className={labelClass}>Client name</Label>
                {clientNames.length > 0 ? (
                  <Select
                    value={newClientName}
                    onValueChange={(v) => setNewClientName(v === "__none__" ? "" : (v ?? ""))}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select a client…" />
                    </SelectTrigger>
                    <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                      <SelectItem value="__none__" className="text-slate-400 text-sm">No client</SelectItem>
                      {clientNames.map((name) => (
                        <SelectItem key={name} value={name} className="text-white text-sm">{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    placeholder="Acme Corp"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className={inputClass}
                    style={{ background: "var(--bg-card)" }}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Currency</Label>
                <Select defaultValue="EUR" onValueChange={(v) => v && setNewCurrency(v as typeof newCurrency)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    {["EUR", "USD", "GBP", "NOK"].map((c) => (
                      <SelectItem key={c} value={c} className="text-white text-sm">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>VAT rate (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newTaxRate}
                  onChange={(e) => setNewTaxRate(e.target.value)}
                  className={inputClass}
                  style={{ background: "var(--bg-card)" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Issue date</Label>
                <Input
                  type="date"
                  value={newIssueDate}
                  onChange={(e) => setNewIssueDate(e.target.value)}
                  className={inputClass}
                  style={{ background: "var(--bg-card)", colorScheme: "light" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Due date</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className={inputClass}
                  style={{ background: "var(--bg-card)", colorScheme: "light" }}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Line items</Label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-xs font-medium hover:opacity-80"
                  style={{ color: "#22C55E" }}
                >
                  + Add row
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      className="flex-1 h-8 px-2.5 rounded-md text-sm border"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-14 h-8 px-2 rounded-md text-sm border text-center"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 px-2 rounded-md text-sm border"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
                    />
                    <span className="text-xs w-20 text-right" style={{ color: "var(--text-muted)" }}>
                      {formatCurrency(item.total, newCurrency)}
                    </span>
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLineItem(idx)} className="text-slate-600 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div
                className="rounded-lg px-3 py-2 space-y-1 text-sm"
                style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
              >
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, newCurrency)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>VAT ({(taxRate * 100).toFixed(0)}%)</span>
                    <span>{formatCurrency(taxAmount, newCurrency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1" style={{ borderColor: "var(--border-col)", color: "var(--text-primary)" }}>
                  <span>Total</span>
                  <span>{formatCurrency(total, newCurrency)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Notes (optional)</Label>
              <textarea
                placeholder="Payment terms, bank details, etc."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-md text-sm border resize-none outline-none"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
              />
            </div>

            {/* Recurring */}
            <div className="rounded-lg p-3 space-y-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-col)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Recurring invoice</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Auto-generates the next invoice when due</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewIsRecurring((v) => !v)}
                  className="relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0"
                  style={{ background: newIsRecurring ? "#22C55E" : "var(--border-col)" }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full transition-transform bg-white"
                    style={{ left: newIsRecurring ? "20px" : "2px" }} />
                </button>
              </div>
              {newIsRecurring && (
                <Select value={newRecurringFreq} onValueChange={(v) => setNewRecurringFreq(v as typeof newRecurringFreq)}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    <SelectItem value="monthly" className="text-xs">Every month</SelectItem>
                    <SelectItem value="quarterly" className="text-xs">Every quarter</SelectItem>
                    <SelectItem value="annually" className="text-xs">Every year</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                size="sm"
                className="font-semibold"
                style={{ background: "#16a34a", color: "#ffffff" }}
                disabled={isCreating || !newClientName}
              >
                {isCreating ? "Creating…" : "Create Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice preview modal */}
      <Dialog open={!!previewInvoice} onOpenChange={(o) => !o && setPreviewInvoice(null)}>
        <DialogContent
          className="max-w-2xl w-full"
          style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", maxHeight: "90vh", overflowY: "auto" }}
        >
          {previewInvoice && (
            <div className="p-2">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-2xl font-bold text-slate-800">Invoice</p>
                  <p className="text-sm text-slate-500 font-mono mt-1">{previewInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
                  {user?.email && <p className="text-xs text-slate-500">{user.email}</p>}
                </div>
              </div>

              {/* Bill to / dates */}
              <div className="flex gap-12 mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Bill To</p>
                  <p className="text-sm font-semibold text-slate-800">{previewInvoice.clientName}</p>
                  {previewInvoice.clientEmail && <p className="text-xs text-slate-500">{previewInvoice.clientEmail}</p>}
                  {previewInvoice.clientAddress && <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{previewInvoice.clientAddress}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Details</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-600"><span className="font-medium">Issue date:</span> {dayjs(previewInvoice.issueDate).format("MMM D, YYYY")}</p>
                    <p className="text-xs text-slate-600"><span className="font-medium">Due date:</span> {dayjs(previewInvoice.dueDate).format("MMM D, YYYY")}</p>
                    <p className="text-xs text-slate-600"><span className="font-medium">Status:</span> <span className="capitalize">{previewInvoice.status}</span></p>
                  </div>
                </div>
              </div>

              {/* Workflow indicator */}
              <div className="mb-6 flex items-center gap-2">
                {["Draft", "Sent", "Paid"].map((step, idx) => (
                  <div key={step} className="flex items-center">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        background:
                          previewInvoice.status === "draft" ? (idx === 0 ? "#16a34a" : "#e2e8f0") :
                          previewInvoice.status === "overdue" || previewInvoice.status === "sent" ? (idx <= 1 ? "#16a34a" : "#e2e8f0") :
                          previewInvoice.status === "paid" ? "#16a34a" : "#e2e8f0",
                        color: (previewInvoice.status === "draft" && idx === 0) ||
                               ((previewInvoice.status === "sent" || previewInvoice.status === "overdue") && idx <= 1) ||
                               (previewInvoice.status === "paid" && idx <= 2) ? "#fff" : "#94a3b8",
                      }}
                    >
                      {idx + 1}
                    </div>
                    {idx < 2 && (
                      <div
                        className="w-8 h-0.5 mx-1 transition-colors"
                        style={{
                          background:
                            previewInvoice.status === "draft" ? "#e2e8f0" :
                            previewInvoice.status === "overdue" || previewInvoice.status === "sent" ? (idx === 0 ? "#16a34a" : "#e2e8f0") :
                            previewInvoice.status === "paid" ? "#16a34a" : "#e2e8f0",
                        }}
                      />
                    )}
                    <span className="text-xs font-medium ml-1" style={{ color: "#64748b" }}>{step}</span>
                  </div>
                ))}
              </div>

              {/* Line items */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                    <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Qty</th>
                    <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Rate</th>
                    <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewInvoice.items ?? []).map((item, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2.5 text-slate-700">{item.description}</td>
                      <td className="py-2.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice, previewInvoice.currency)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-800">{formatCurrency(item.total, previewInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-56 space-y-1">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(previewInvoice.subtotal, previewInvoice.currency)}</span>
                  </div>
                  {previewInvoice.taxRate && previewInvoice.taxRate > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Tax ({Math.round(previewInvoice.taxRate * 100)}%)</span>
                      <span>{formatCurrency(previewInvoice.taxAmount ?? 0, previewInvoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-1.5 mt-1.5">
                    <span>Total</span>
                    <span>{formatCurrency(previewInvoice.total, previewInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              {previewInvoice.notes && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{previewInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={() => { handleGeneratePDF(previewInvoice); }}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  style={{ background: "#0f172a", color: "#fff" }}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                {previewInvoice.status === "draft" && (
                  <button
                    onClick={() => { handleSendInvoice(previewInvoice); setPreviewInvoice(null); }}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    style={{ background: "#16a34a", color: "#fff" }}
                  >
                    Send to client
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
