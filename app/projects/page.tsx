"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, Layers, ArrowRight, CheckCircle, Search, Download, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getProjects, createProject, updateProject } from "@/lib/data/projects";
import { getAcceptedProposals, updateProposal } from "@/lib/data/proposals";
import { getClients } from "@/lib/data/clients";
import { getTimeEntries } from "@/lib/data/time";
import { getInvoices } from "@/lib/data/invoices";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import { exportProjectsCSV } from "@/lib/csv";
import type { Project, ProjectStatus, Client, Currency, Proposal } from "@/lib/mock-data";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  "active":    { label: "Active",    color: "#22C55E", bg: "#22C55E20" },
  "on-hold":   { label: "On hold",   color: "#f59e0b", bg: "#f59e0b20" },
  "completed": { label: "Completed", color: "#60a5fa", bg: "#3b82f620" },
  "cancelled": { label: "Cancelled", color: "#f87171", bg: "#ef444420" },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [acceptedProposals, setAcceptedProposals] = useState<Proposal[]>([]);
  const [timeMinutesByProject, setTimeMinutesByProject] = useState<Record<string, number>>({});
  const [timeCostByProject, setTimeCostByProject] = useState<Record<string, number>>({});
  const [billedByProject, setBilledByProject] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "status" | "budget" | "client">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageIndex, setPageIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [convertingProposalId, setConvertingProposalId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;

  // Form
  const [formClientId, setFormClientId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formCurrency, setFormCurrency] = useState<Currency>("EUR");
  const [formStartDate, setFormStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [formEndDate, setFormEndDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getProjects(user?.id),
      getClients(user?.id),
      getTimeEntries(user?.id),
      getInvoices(user?.id),
      getAcceptedProposals(user?.id),
    ]).then(([projs, cls, timeEntries, invoices, proposals]) => {
      if (!mounted) return;
      setProjects(projs);
      setClients(cls);
      // Filter to only show proposals that haven't been converted to projects
      setAcceptedProposals(proposals.filter((p) => !p.convertedToProjectId));

      // Aggregate tracked minutes + cost per project
      const minuteMap: Record<string, number> = {};
      const costMap: Record<string, number> = {};
      timeEntries.forEach((te) => {
        const key = `${te.clientName}::${te.projectName ?? ""}`;
        minuteMap[key] = (minuteMap[key] ?? 0) + te.durationMinutes;
        costMap[key] = (costMap[key] ?? 0) + (te.durationMinutes / 60) * te.hourlyRate;
      });
      setTimeMinutesByProject(minuteMap);
      setTimeCostByProject(costMap);

      // Aggregate paid invoices per project: match by clientId (preferred) or clientName,
      // then narrow by project name if the invoice notes or description mention it.
      const billedMap: Record<string, number> = {};
      invoices.filter((inv) => inv.status === "paid").forEach((inv) => {
        const clientKey = inv.clientId ?? inv.clientName ?? "";
        // Check if any project's name appears in the invoice notes
        const matchedProj = projs.find((p) => {
          const sameClient = inv.clientId
            ? p.clientId === inv.clientId
            : p.clientName === inv.clientName;
          if (!sameClient) return false;
          // Only associate with a specific project if the name appears in notes
          const notesLower = (inv.notes ?? "").toLowerCase();
          return notesLower.includes(p.name.toLowerCase());
        });
        const key = matchedProj
          ? `${clientKey}::${matchedProj.name}`
          : `${clientKey}::`;
        billedMap[key] = (billedMap[key] ?? 0) + inv.total;
      });
      setBilledByProject(billedMap);

      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const filtered = useMemo(() => {
    let result = projects;
    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.clientName ?? "").toLowerCase().includes(q)
      );
    }
    // Apply sorting
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "client") {
        cmp = (a.clientName ?? "").localeCompare(b.clientName ?? "");
      } else if (sortKey === "budget") {
        cmp = (a.budgetAmount ?? 0) - (b.budgetAmount ?? 0);
      } else if (sortKey === "status") {
        const statusOrder: Record<ProjectStatus, number> = { "active": 0, "on-hold": 1, "completed": 2, "cancelled": 3 };
        cmp = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [projects, filterStatus, search, sortKey, sortDir]);

  // Reset pageIndex when filters/sort changes
  useEffect(() => {
    setPageIndex(0);
  }, [filterStatus, search, sortKey, sortDir]);

  const paginated = useMemo(() => {
    return filtered.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
  }, [filtered, pageIndex]);

  const stats = useMemo(() => ({
    active: projects.filter((p) => p.status === "active").length,
    onHold: projects.filter((p) => p.status === "on-hold").length,
    completed: projects.filter((p) => p.status === "completed").length,
    totalBudget: projects.filter((p) => p.status === "active" && p.budgetAmount)
      .reduce((s, p) => s + (p.budgetAmount ?? 0), 0),
  }), [projects]);

  const handleStatusChange = async (proj: Project, status: ProjectStatus) => {
    setUpdatingStatus(proj.id);
    const updated = await updateProject(proj.id, { status });
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setUpdatingStatus(null);
    toast("Project status updated");
  };

  const handleCreate = async () => {
    if (!formClientId || !formName) return;
    setIsCreating(true);
    try {
      const client = clients.find((c) => c.id === formClientId);
      const p = await createProject({
        userId: user?.id ?? "user_mock_001",
        clientId: formClientId,
        clientName: client?.name ?? "",
        name: formName,
        status: "active",
        budgetAmount: formBudget ? parseFloat(formBudget) : undefined,
        currency: formCurrency,
        startDate: formStartDate,
        endDate: formEndDate || undefined,
        notes: formNotes || undefined,
      });
      setProjects((prev) => [p, ...prev]);
      toast(`Project "${p.name}" created`);
      setCreateOpen(false);
      setFormClientId(""); setFormName(""); setFormBudget(""); setFormNotes("");
      setFormStartDate(dayjs().format("YYYY-MM-DD")); setFormEndDate("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConvertProposalToProject = async (p: Proposal) => {
    setConvertingProposalId(p.id);
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
      setProjects((prev) => [project, ...prev]);
      setAcceptedProposals((prev) => prev.filter((prop) => prop.id !== p.id));
      toast(`Project created from proposal`);
    } finally {
      setConvertingProposalId(null);
    }
  };

  const getProjectKey = (proj: Project) => `${proj.clientId ?? proj.clientName}::${proj.name}`;

  const getTrackedHours = (proj: Project) => {
    const mins = timeMinutesByProject[getProjectKey(proj)] ?? 0;
    return Math.round((mins / 60) * 10) / 10;
  };

  const getTimeCost = (proj: Project) => timeCostByProject[getProjectKey(proj)] ?? 0;

  const getBilledAmount = (proj: Project) => billedByProject[getProjectKey(proj)] ?? 0;

  const getSpentAmount = (proj: Project) => {
    const timeCost = getTimeCost(proj);
    const billed = getBilledAmount(proj);
    // Use whichever is higher: time-based cost covers unbilled work too
    return Math.max(timeCost, billed);
  };

  const getBudgetPct = (proj: Project) => {
    if (!proj.budgetAmount) return null;
    const spent = getSpentAmount(proj);
    return Math.min(Math.round((spent / proj.budgetAmount) * 100), 100);
  };

  const inputCls = "h-9 text-sm";
  const labelCls = "text-xs font-medium";

  return (
    <AppShell title="Projects">
      <div className="p-5 lg:p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Active", value: String(stats.active), color: "#22C55E" },
            { label: "On hold", value: String(stats.onHold), color: "#f59e0b" },
            { label: "Completed", value: String(stats.completed), color: "#60a5fa" },
            { label: "Active budget", value: formatCurrency(stats.totalBudget, user?.currency ?? "EUR"), color: "#22C55E" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-3 rounded-lg text-sm border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "active", "on-hold", "completed", "cancelled"] as const).map((s) => (
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
          <Button
            onClick={() => exportProjectsCSV(filtered)}
            className="font-semibold flex-shrink-0 gap-2 text-xs"
            style={{ background: "var(--border-col)", color: "#94a3b8" }}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button onClick={() => setCreateOpen(true)}
            className="font-semibold flex-shrink-0" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Project
          </Button>
        </div>

        {/* Accepted Proposals Section */}
        {!isLoading && acceptedProposals.length > 0 && (
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
                    onClick={() => handleConvertProposalToProject(p)}
                    disabled={convertingProposalId === p.id}
                    size="sm"
                    className="font-semibold flex-shrink-0"
                    style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                  >
                    {convertingProposalId === p.id ? "Converting…" : "Convert to Project"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sort pills */}
        {!isLoading && projects.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "name" as const, label: "Name" },
              { key: "client" as const, label: "Client" },
              { key: "budget" as const, label: "Budget" },
              { key: "status" as const, label: "Status" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  if (sortKey === key) {
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  } else {
                    setSortKey(key);
                    setSortDir("asc");
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5"
                style={{
                  background: sortKey === key ? "#22C55E" : "var(--border-col)",
                  color: sortKey === key ? "white" : "#94a3b8",
                }}
              >
                {label}
                {sortKey === key && (
                  sortDir === "asc" ?
                    <ChevronUp className="h-3 w-3" /> :
                    <ChevronDown className="h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Project list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                {/* Header with title and status badge */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-32" />
                    <div className="h-3 bg-slate-700 rounded w-64" />
                  </div>
                  <div className="h-6 bg-slate-700 rounded-full w-24 flex-shrink-0" />
                </div>
                {/* Metrics grid - 4 columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-3 bg-slate-700 rounded w-16" />
                      <div className="h-4 bg-slate-700 rounded w-24" />
                    </div>
                  ))}
                </div>
                {/* Budget progress bar */}
                <div className="space-y-2">
                  <div className="h-3 bg-slate-700 rounded w-48" />
                  <div className="h-1.5 bg-slate-700 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No projects found. Create your first project.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">No projects match your filters.</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "#22C55E", color: "white" }}
                >
                  Clear search
                </button>
              )}
              {filterStatus !== "all" && (
                <button
                  onClick={() => setFilterStatus("all")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "#22C55E", color: "white" }}
                >
                  Show all statuses
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {paginated.map((proj) => {
              const trackedHrs = getTrackedHours(proj);
              const timeCost = getTimeCost(proj);
              const billed = getBilledAmount(proj);
              const spent = getSpentAmount(proj);
              const budgetPct = getBudgetPct(proj);
              const daysLeft = proj.endDate
                ? Math.ceil((new Date(proj.endDate).getTime() - Date.now()) / 86_400_000)
                : null;

              return (
                <div key={proj.id} className="rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold">{proj.name}</p>
                        <StatusBadge status={proj.status} />
                        {daysLeft !== null && proj.status === "active" && (
                          <span className="text-xs"
                            style={{ color: daysLeft < 7 ? "#f87171" : daysLeft < 21 ? "#f59e0b" : "#64748b" }}>
                            {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {proj.clientName} · Started {dayjs(proj.startDate).format("MMM D, YYYY")}
                        {proj.endDate && ` · Due ${dayjs(proj.endDate).format("MMM D, YYYY")}`}
                      </p>
                      {proj.notes && <p className="text-xs text-slate-600 mt-1">{proj.notes}</p>}
                    </div>

                    {/* Status changer */}
                    <select
                      value={proj.status}
                      onChange={(e) => handleStatusChange(proj, e.target.value as ProjectStatus)}
                      disabled={updatingStatus === proj.id}
                      className="h-8 px-2 rounded-lg text-xs font-medium border outline-none transition-all"
                      style={{
                        background: STATUS_CONFIG[proj.status].bg,
                        color: STATUS_CONFIG[proj.status].color,
                        borderColor: STATUS_CONFIG[proj.status].color + "40",
                      }}>
                      {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => (
                        <option key={s} value={s} style={{ background: "var(--bg-card)", color: "#fff" }}>
                          {STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Budget</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {proj.budgetAmount ? formatCurrency(proj.budgetAmount, proj.currency) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        {timeCost > 0 ? "Time cost" : "Billed"}
                      </p>
                      <p className="text-sm font-semibold mt-0.5"
                        style={{ color: budgetPct !== null && budgetPct >= 90 ? "#f87171" : budgetPct !== null && budgetPct >= 70 ? "#f59e0b" : "#22C55E" }}>
                        {formatCurrency(spent, proj.currency)}
                      </p>
                      {timeCost > 0 && billed > 0 && billed !== timeCost && (
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {formatCurrency(billed, proj.currency)} invoiced
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Tracked</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {trackedHrs > 0 ? `${trackedHrs}h` : "—"}
                      </p>
                      {timeCost > 0 && proj.budgetAmount && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatCurrency(proj.budgetAmount - spent, proj.currency)} remaining
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/${proj.clientId}`}>
                        <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "var(--border-col)", color: "#94a3b8" }}>
                          Client <ArrowRight className="h-3 w-3 inline ml-0.5" />
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Budget progress bar */}
                  {budgetPct !== null && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">
                          Budget consumed · {formatCurrency(spent, proj.currency)} of {formatCurrency(proj.budgetAmount!, proj.currency)}
                        </span>
                        <span style={{ color: budgetPct >= 90 ? "#f87171" : budgetPct >= 70 ? "#f59e0b" : "#22C55E" }}>
                          {budgetPct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-col)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${budgetPct}%`,
                            background: budgetPct >= 90 ? "#ef4444" : budgetPct >= 70 ? "#f59e0b" : "#22C55E",
                          }} />
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-slate-500">
                  {filtered.length === 0 ? "0 projects" : `${pageIndex * ITEMS_PER_PAGE + 1}–${Math.min((pageIndex + 1) * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} project${filtered.length === 1 ? "" : "s"}`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                    disabled={pageIndex === 0}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                    style={{ background: "var(--border-col)", color: "#94a3b8" }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPageIndex(pageIndex + 1)}
                    disabled={(pageIndex + 1) * ITEMS_PER_PAGE >= filtered.length}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                    style={{ background: "var(--border-col)", color: "#94a3b8" }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Project Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">New Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
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
              <Label className={labelCls}>Project name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Website Redesign Q2" className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Budget</Label>
                <Input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)}
                  placeholder="5000" className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
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
              <div className="space-y-1.5">
                <Label className={labelCls}>Start date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                  className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Deadline (optional)</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                  className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Notes</Label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any context about this project…" rows={2}
                className="w-full px-3 py-2 rounded-md text-sm border resize-none outline-none"
                style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:opacity-80"
                onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} size="sm" disabled={isCreating || !formClientId || !formName}
                className="font-semibold" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                {isCreating ? "Creating…" : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
