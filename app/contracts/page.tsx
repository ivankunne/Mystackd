"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ScrollText, ChevronDown, ChevronUp, Trash2, ExternalLink, PenLine, CheckCircle, Receipt, Layers } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getContracts, createContract, updateContract, deleteContract } from "@/lib/data/contracts";
import { getAcceptedProposals, updateProposal } from "@/lib/data/proposals";
import { createInvoice } from "@/lib/data/invoices";
import { createProject } from "@/lib/data/projects";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import type { Contract, ContractStatus, Proposal } from "@/lib/mock-data";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<ContractStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#94a3b8", bg: "#64748b20" },
  sent:      { label: "Sent",      color: "#60a5fa", bg: "#3b82f620" },
  signed:    { label: "Signed",    color: "#a78bfa", bg: "#a78bfa20" },
  active:    { label: "Active",    color: "#22C55E", bg: "#22C55E20" },
  completed: { label: "Completed", color: "#34d399", bg: "#34d39920" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "#ef444420" },
};

const RATE_LABEL: Record<string, string> = {
  fixed: "fixed", hourly: "/hr", monthly: "/mo",
};

function StatusBadge({ status }: { status: ContractStatus }) {
  const s = STATUS[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Next status transitions ───────────────────────────────────────────────────

function nextActions(status: ContractStatus): { label: string; next: ContractStatus }[] {
  switch (status) {
    case "draft":     return [{ label: "Mark sent",      next: "sent" }];
    case "sent":      return [{ label: "Mark signed",    next: "signed" }];
    case "signed":    return [{ label: "Set active",     next: "active" }];
    case "active":    return [{ label: "Mark complete",  next: "completed" }];
    default:          return [];
  }
}

// ─── Contract card ─────────────────────────────────────────────────────────────

function ContractCard({
  contract,
  onStatusChange,
  onDelete,
  onSign,
  onGenerateInvoice,
  onCreateProject,
}: {
  contract: Contract;
  onStatusChange: (id: string, status: ContractStatus, extra?: Partial<Contract>) => void;
  onDelete: (id: string) => void;
  onSign: (id: string) => void;
  onGenerateInvoice: (contract: Contract) => void;
  onCreateProject: (contract: Contract) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const actions = nextActions(contract.status);
  const canCancel = contract.status !== "cancelled" && contract.status !== "completed";
  const s = STATUS[contract.status];
  const daysLeft = contract.endDate
    ? dayjs(contract.endDate).diff(dayjs(), "day")
    : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border-col)",
        borderRight: "1px solid var(--border-col)",
        borderBottom: "1px solid var(--border-col)",
        borderLeft: `3px solid ${s.color}`,
      }}
    >
      {/* Header row */}
      <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold">{contract.projectName}</p>
            <StatusBadge status={contract.status} />
            {contract.proposalId && (
              <span className="text-xs text-slate-600 font-mono">from proposal</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {contract.clientName}
            {" · "}
            <span className="font-medium" style={{ color: s.color }}>
              {formatCurrency(contract.rate, contract.currency)}{RATE_LABEL[contract.rateType]}
            </span>
            {" · "}
            Net {contract.paymentTermsDays}d
          </p>
          <div className="flex gap-3 mt-1.5 text-xs text-slate-600">
            <span>Start: {dayjs(contract.startDate).format("MMM D, YYYY")}</span>
            {contract.endDate && (
              <span>
                End: {dayjs(contract.endDate).format("MMM D, YYYY")}
                {daysLeft !== null && contract.status === "active" && (
                  <span className="ml-1" style={{ color: daysLeft <= 14 ? "#f59e0b" : "#64748b" }}>
                    ({daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "today" : `${Math.abs(daysLeft)}d overdue`})
                  </span>
                )}
              </span>
            )}
            {contract.freelancerSignatureName && (
              <span style={{ color: "#a78bfa" }}>✎ You signed</span>
            )}
            {contract.signedAt && !contract.freelancerSignatureName && (
              <span>Signed: {dayjs(contract.signedAt).format("MMM D, YYYY")}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {!contract.freelancerSignatureName && contract.status !== "cancelled" && contract.status !== "completed" && (
            <button
              onClick={() => onSign(contract.id)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ background: "#a78bfa", color: "var(--bg-sidebar)" }}
            >
              <PenLine className="h-3 w-3" /> Review & sign
            </button>
          )}
          {actions.map(({ label, next }) => (
            <button
              key={next}
              onClick={() => {
                const extra: Partial<Contract> =
                  next === "signed" ? { signedAt: new Date().toISOString() } : {};
                onStatusChange(contract.id, next, extra);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ background: STATUS[next].color, color: "var(--bg-sidebar)" }}
            >
              {label}
            </button>
          ))}
          {/* Pipeline shortcuts for active contracts */}
          {(contract.status === "active" || contract.status === "signed") && (
            <>
              <button
                onClick={() => onGenerateInvoice(contract)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E40" }}
                title={contract.rateType === "monthly" ? "Generate retainer invoice" : "Create invoice from contract"}
              >
                <Receipt className="h-3 w-3" />
                {contract.rateType === "monthly" ? "Retainer invoice" : "Create invoice"}
              </button>
              <button
                onClick={() => onCreateProject(contract)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa40" }}
                title="Create a project from this contract"
              >
                <Layers className="h-3 w-3" /> Create project
              </button>
            </>
          )}
          {canCancel && (
            <button
              onClick={() => onStatusChange(contract.id, "cancelled")}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ background: "#ef444415", color: "#f87171", border: "1px solid #ef444430" }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5 text-slate-500"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(contract.id)}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors text-slate-600 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-5 pb-5 space-y-4 border-t"
          style={{ borderColor: "var(--border-col)" }}
        >
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Scope of work</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{contract.scope}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Deliverables</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{contract.deliverables}</p>
            </div>
          </div>

          {(contract.revisionPolicy || contract.terminationClause) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contract.revisionPolicy && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Revision policy</p>
                  <p className="text-sm text-slate-400">{contract.revisionPolicy}</p>
                </div>
              )}
              {contract.terminationClause && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Termination</p>
                  <p className="text-sm text-slate-400">{contract.terminationClause}</p>
                </div>
              )}
            </div>
          )}

          {contract.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Notes</p>
              <p className="text-sm text-slate-400">{contract.notes}</p>
            </div>
          )}

          {contract.clientSignatureName && (
            <div
              className="rounded-lg px-4 py-3 flex items-center gap-2"
              style={{ background: "#a78bfa15", border: "1px solid #a78bfa30" }}
            >
              <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
                ✎ Signed by client: {contract.clientSignatureName}
              </span>
              {contract.clientSignedAt && (
                <span className="text-xs text-slate-500">
                  on {dayjs(contract.clientSignedAt).format("MMM D, YYYY")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const FILTER_STATUSES = ["all", "draft", "sent", "signed", "active", "completed", "cancelled"] as const;

export default function ContractsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [acceptedProposals, setAcceptedProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [convertingProposalId, setConvertingProposalId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getContracts(user?.id),
      getAcceptedProposals(user?.id),
    ]).then(([contracts, proposals]) => {
      if (mounted) {
        setContracts(contracts);
        // Filter to only show proposals that haven't been converted to contracts
        setAcceptedProposals(proposals.filter((p) => !p.convertedToContractId));
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const filtered = useMemo(() =>
    filter === "all" ? contracts : contracts.filter((c) => c.status === filter),
    [contracts, filter]
  );

  // Stats
  const active = contracts.filter((c) => c.status === "active");
  const activeValue = active.reduce((s, c) => s + (c.rateType === "monthly" ? c.rate : 0), 0);
  const signed = contracts.filter((c) => c.status === "signed" || c.status === "active" || c.status === "completed");

  const handleStatusChange = async (id: string, status: ContractStatus, extra: Partial<Contract> = {}) => {
    const updated = await updateContract(id, { status, ...extra });
    setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    toast(`Contract ${STATUS[status].label.toLowerCase()}`);
  };

  const handleDelete = async (id: string) => {
    await deleteContract(id);
    setContracts((prev) => prev.filter((c) => c.id !== id));
    toast("Contract deleted", "error");
  };

  const handleSign = (id: string) => {
    router.push(`/contracts/${id}/sign`);
  };

  const handleGenerateInvoice = async (contract: Contract) => {
    try {
      const isRetainer = contract.rateType === "monthly";
      const issueDate  = dayjs().format("YYYY-MM-DD");
      const dueDate    = dayjs().add(contract.paymentTermsDays || 30, "day").format("YYYY-MM-DD");
      const monthLabel = dayjs().format("MMMM YYYY");

      const inv = await createInvoice({
        userId:       user?.id ?? "user_mock_001",
        clientId:     contract.clientId,
        clientName:   contract.clientName,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        items: [{
          description: isRetainer
            ? `Monthly retainer — ${contract.projectName} (${monthLabel})`
            : `Project fee — ${contract.projectName}`,
          quantity:  1,
          unitPrice: contract.rate,
          total:     contract.rate,
        }],
        currency:  contract.currency,
        subtotal:  contract.rate,
        taxRate:   undefined,
        taxAmount: undefined,
        total:     contract.rate,
        status:    "draft",
        issueDate,
        dueDate,
        notes: `Contract ref: ${contract.projectName}`,
      });

      toast(`Invoice ${inv.invoiceNumber} created as draft`);
      router.push("/invoices");
    } catch {
      toast("Failed to create invoice", "error");
    }
  };

  const handleCreateProject = async (contract: Contract) => {
    try {
      await createProject({
        userId:       user?.id ?? "user_mock_001",
        clientId:     contract.clientId,
        clientName:   contract.clientName,
        name:         contract.projectName,
        status:       "active",
        budgetAmount: contract.rateType === "fixed" ? contract.rate : undefined,
        currency:     contract.currency,
        startDate:    contract.startDate,
        endDate:      contract.endDate,
        contractId:   contract.id,
        notes:        contract.scope,
      });
      toast(`Project "${contract.projectName}" created`);
      router.push("/projects");
    } catch {
      toast("Failed to create project", "error");
    }
  };

  const handleConvertProposalToContract = async (p: Proposal) => {
    setConvertingProposalId(p.id);
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
      setContracts((prev) => [contract, ...prev]);
      setAcceptedProposals((prev) => prev.filter((prop) => prop.id !== p.id));
      toast(`Contract created from proposal`);
    } finally {
      setConvertingProposalId(null);
    }
  };

  return (
    <AppShell title="Contracts">
      <div className="p-5 lg:p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total contracts", value: String(contracts.length), sub: "all time", color: "#94a3b8" },
            { label: "Active", value: String(active.length), sub: "currently running", color: "#22C55E" },
            { label: "Monthly recurring", value: formatCurrency(activeValue, user?.currency ?? "EUR"), sub: "from active retainers", color: "#22C55E" },
            { label: "Signed", value: String(signed.length), sub: "signed or completed", color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === s ? "#22C55E20" : "var(--bg-card)",
                color: filter === s ? "#22C55E" : "#64748b",
                border: `1px solid ${filter === s ? "#22C55E40" : "var(--border-col)"}`,
              }}
            >
              {s === "all" ? "All" : STATUS[s as ContractStatus]?.label}
              {s !== "all" && (
                <span className="ml-1.5 opacity-60">
                  {contracts.filter((c) => c.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Accepted Proposals Section */}
        {!loading && acceptedProposals.length > 0 && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid #22C55E40" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: "#22C55E" }} />
                <p className="text-sm font-semibold text-slate-200">Accepted Proposals Ready to Convert</p>
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
                    <p className="text-sm font-medium">{p.projectName}</p>
                    <p className="text-xs text-slate-500">{p.clientName} • {formatCurrency(p.total, p.currency)}</p>
                  </div>
                  <Button
                    onClick={() => handleConvertProposalToContract(p)}
                    disabled={convertingProposalId === p.id}
                    size="sm"
                    className="font-semibold flex-shrink-0"
                    style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                  >
                    {convertingProposalId === p.id ? "Converting…" : "Convert to Contract"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {filter === "all"
                ? "No contracts yet. Convert an accepted proposal to create one."
                : `No ${STATUS[filter as ContractStatus]?.label.toLowerCase()} contracts.`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => router.push("/proposals")}
                className="mt-3 text-xs font-medium flex items-center gap-1 mx-auto transition-opacity hover:opacity-80"
                style={{ color: "#22C55E" }}
              >
                Go to Proposals <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onSign={handleSign}
                onGenerateInvoice={handleGenerateInvoice}
                onCreateProject={handleCreateProject}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
