"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import {
  ArrowLeft, ExternalLink, Copy, Check, Plus, Trash2,
  FileText, MessageSquare, Clock, Settings, AlertCircle,
  CheckCircle2, Upload, Eye, EyeOff, History, Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { formatCurrency } from "@/lib/calculations";
import { getClients } from "@/lib/data/clients";
import { getInvoices, createInvoice } from "@/lib/data/invoices";
import { getIncomeEntries } from "@/lib/data/income";
import {
  getPortal, savePortal,
  getProjectUpdates, createProjectUpdate, deleteProjectUpdate,
  getSharedFiles, createSharedFile, deleteSharedFile,
  getFeedback, markFeedbackRead,
} from "@/lib/data/portal";
import { getProposalsForClient, updateProposal } from "@/lib/data/proposals";
import { getContractsForClient } from "@/lib/data/contracts";
import { getProjectsForClient, updateProject } from "@/lib/data/projects";
import type {
  Client, Invoice, IncomeEntry, ClientPortal, ProjectUpdate, SharedFile, ClientFeedback,
  Proposal, Contract, Project, ProjectStatus,
} from "@/lib/mock-data";
import type { PortalUpdateStatus } from "@/lib/mock-data";

// ─── Tab ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "proposals" | "contracts" | "projects" | "portal" | "updates" | "files" | "activity" | "feedback";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",  Icon: CheckCircle2 },
  { id: "proposals", label: "Proposals", Icon: FileText },
  { id: "contracts", label: "Contracts", Icon: AlertCircle },
  { id: "projects",  label: "Projects",  Icon: Clock },
  { id: "portal",    label: "Portal",    Icon: Settings },
  { id: "updates",   label: "Updates",   Icon: Clock },
  { id: "files",     label: "Files",     Icon: FileText },
  { id: "activity",  label: "Activity",  Icon: History },
  { id: "feedback",  label: "Feedback",  Icon: MessageSquare },
];

const STATUS_OPTIONS: { value: PortalUpdateStatus; label: string; color: string }[] = [
  { value: "on-track",  label: "On track",  color: "#22C55E" },
  { value: "review",    label: "In review", color: "#F59E0B" },
  { value: "completed", label: "Completed", color: "#60a5fa" },
  { value: "blocked",   label: "Blocked",   color: "#f87171" },
];

function StatusBadge({ status }: { status: PortalUpdateStatus }) {
  const s = STATUS_OPTIONS.find((o) => o.value === status)!;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.color + "20", color: s.color }}>
      {s.label}
    </span>
  );
}

function InvoiceStatus({ status }: { status: Invoice["status"] }) {
  const map = {
    paid:    { label: "Paid",    color: "#22C55E" },
    sent:    { label: "Sent",    color: "#60a5fa" },
    overdue: { label: "Overdue", color: "#f87171" },
    draft:   { label: "Draft",   color: "#64748b" },
  };
  const s = map[status];
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
    style={{ background: s.color + "20", color: s.color }}>{s.label}</span>;
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? "#22C55E" : "var(--border-col)" }}>
      <span className="absolute h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

// ─── Activity timeline builder ────────────────────────────────────────────────
type ActivityEvent = {
  date: string;
  timestamp: number;
  label: string;
  icon: "file" | "check" | "pen" | "zap";
  color: string;
};

function buildActivityTimeline(
  invoices: Invoice[],
  contracts: Contract[],
  proposals: Proposal[],
  updates: ProjectUpdate[]
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Invoices
  invoices.forEach((inv) => {
    events.push({
      date: inv.issueDate,
      timestamp: new Date(inv.issueDate).getTime(),
      label: `Invoice #${inv.invoiceNumber} created`,
      icon: "file",
      color: "#3B82F6",
    });
    if (inv.paidAt) {
      events.push({
        date: inv.paidAt,
        timestamp: new Date(inv.paidAt).getTime(),
        label: `Invoice #${inv.invoiceNumber} marked paid`,
        icon: "check",
        color: "#22C55E",
      });
    }
  });

  // Contracts
  contracts.forEach((c) => {
    events.push({
      date: c.createdAt,
      timestamp: new Date(c.createdAt).getTime(),
      label: `Contract "${c.projectName}" created`,
      icon: "pen",
      color: "#F59E0B",
    });
    if (c.signedAt) {
      events.push({
        date: c.signedAt,
        timestamp: new Date(c.signedAt).getTime(),
        label: `Contract "${c.projectName}" signed by you`,
        icon: "check",
        color: "#22C55E",
      });
    }
    if (c.clientSignedAt) {
      events.push({
        date: c.clientSignedAt,
        timestamp: new Date(c.clientSignedAt).getTime(),
        label: `Contract "${c.projectName}" signed by client`,
        icon: "check",
        color: "#22C55E",
      });
    }
  });

  // Proposals
  proposals
    .filter((p) => p.status !== "draft")
    .forEach((p) => {
      const sentDate = p.sentAt ?? p.createdAt;
      events.push({
        date: sentDate,
        timestamp: new Date(sentDate).getTime(),
        label: `Proposal "${p.projectName}" sent`,
        icon: "zap",
        color: "#8B5CF6",
      });
    });

  // Project updates
  updates.forEach((u) => {
    events.push({
      date: u.createdAt,
      timestamp: new Date(u.createdAt).getTime(),
      label: `Project update: "${u.title}"`,
      icon: "pen",
      color: "#60a5fa",
    });
  });

  // Sort by date (newest first)
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  const initialTab = (searchParams.get("tab") as Tab | null) ?? "overview";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [feedback, setFeedback] = useState<ClientFeedback[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Update form
  const [newUpdateTitle, setNewUpdateTitle] = useState("");
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [newUpdateStatus, setNewUpdateStatus] = useState<PortalUpdateStatus>("on-track");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  // File form
  const [newFileDesc, setNewFileDesc] = useState("");
  const [newFileType, setNewFileType] = useState<SharedFile["type"]>("document");
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [clients, invs, ents, portalData, upds, fls, fb, props, cons, projs] = await Promise.all([
        getClients(user.id),
        getInvoices(user.id),
        getIncomeEntries(user.id),
        getPortal(clientId),
        getProjectUpdates(clientId),
        getSharedFiles(clientId),
        getFeedback(clientId),
        getProposalsForClient(clientId),
        getContractsForClient(clientId),
        getProjectsForClient(clientId),
      ]);
      const c = clients.find((cl) => cl.id === clientId);
      if (!c) { router.push("/clients"); return; }
      setClient(c);
      // Prefer clientId FK match; fall back to name string for legacy rows
      setInvoices(invs.filter((inv) => inv.clientId ? inv.clientId === clientId : inv.clientName === c.name));
      setEntries(ents.filter((e) => e.clientId ? e.clientId === clientId : e.clientName === c.name));

      // Build default portal if none exists
      const defaultPortal: ClientPortal = {
        clientId,
        token: `ptk_${clientId.replace("client_", "")}${Date.now().toString(36)}`,
        isEnabled: false,
        freelancerName: user?.name ?? "Freelancer",
        headerNote: "",
        allowFeedback: true,
        showInvoices: true,
        showFiles: true,
        showUpdates: true,
      };
      setPortal(portalData ?? defaultPortal);
      setUpdates(upds);
      setFiles(fls);
      setFeedback(fb);
      setProposals(props);
      setContracts(cons);
      setProjects(projs);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load client data:", error);
      setIsLoading(false);
    }
  }, [clientId, user, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const portalUrl = portal
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${portal.token}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSavePortal = async (updated: ClientPortal) => {
    const saved = await savePortal(updated);
    setPortal(saved);
  };

  const handlePostUpdate = async () => {
    if (!newUpdateTitle.trim() || !newUpdateContent.trim() || !user) return;
    setIsPostingUpdate(true);
    const u = await createProjectUpdate({
      clientId,
      userId: user.id,
      title: newUpdateTitle.trim(),
      content: newUpdateContent.trim(),
      status: newUpdateStatus,
    });
    setUpdates((prev) => [u, ...prev]);
    setNewUpdateTitle(""); setNewUpdateContent(""); setNewUpdateStatus("on-track");
    setIsPostingUpdate(false);
  };

  const handleDeleteUpdate = async (id: string) => {
    await deleteProjectUpdate(id);
    setUpdates((prev) => prev.filter((u) => u.id !== id));
  };

  const handleAddFile = async () => {
    if (!selectedFile || !user) return;
    setIsAddingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", newFileType);
      formData.append("description", newFileDesc.trim());
      const res = await fetch(`/api/clients/${clientId}/file`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const f = await res.json() as SharedFile;
      setFiles((prev) => [f, ...prev]);
      setSelectedFile(null);
      setNewFileDesc("");
      setNewFileType("document");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsAddingFile(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.storagePath) {
      await fetch(`/api/clients/${clientId}/file`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id }),
      });
    } else {
      await deleteSharedFile(id);
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleConvertProposalToInvoice = async (p: Proposal) => {
    setConvertingId(p.id);
    try {
      const inv = await createInvoice({
        userId: user?.id ?? "user_mock_001",
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        clientName: p.clientName,
        clientEmail: client?.email,
        clientAddress: undefined,
        items: p.items,
        currency: p.currency,
        subtotal: p.subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: p.total,
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

  const handleProposalStatus = async (p: Proposal, status: Proposal["status"]) => {
    const updated = await updateProposal(p.id, {
      status,
      ...(status === "sent" ? { sentAt: new Date().toISOString() } : {}),
      ...(status === "accepted" || status === "declined" ? { respondedAt: new Date().toISOString() } : {}),
    });
    setProposals((prev) => prev.map((x) => x.id === updated.id ? updated : x));
  };

  const handleProjectStatusChange = async (proj: Project, status: ProjectStatus) => {
    const updated = await updateProject(proj.id, { status });
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  };

  const unreadFeedback = feedback.filter((f) => !f.isRead).length;

  // Compute activity timeline
  const activityTimeline = useMemo(
    () => buildActivityTimeline(invoices, contracts, proposals, updates),
    [invoices, contracts, proposals, updates]
  );

  const currentYear = new Date().getFullYear();
  const totalEarned = entries
    .filter((e) => new Date(e.date).getFullYear() === currentYear)
    .reduce((s, e) => s + e.amount, 0);

  const inputCls = "h-9 text-sm";
  const labelCls = "text-xs font-medium";

  return (
    <AppShell title={client?.name ?? "Client"}>
      <div className="p-5 lg:p-6 space-y-5">
        {/* Back button */}
        <button onClick={() => router.push("/clients")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:opacity-80 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          All clients
        </button>

        {isLoading || !client || !portal ? (
          <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-700 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-6 bg-slate-700 rounded w-32" />
                  <div className="h-4 bg-slate-700 rounded w-48" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 bg-slate-700 rounded-full w-20" />
              </div>
            </div>

            {/* Tabs skeleton */}
            <div className="flex gap-3 border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-6 bg-slate-700 rounded w-20" />
              ))}
            </div>

            {/* Content rows skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div className="h-4 bg-slate-700 rounded w-32" />
                  <div className="h-3 bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-slate-700 rounded w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Client header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0"
                  style={{ background: "#22C55E15", color: "#22C55E" }}>
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{client.name}</h1>
                  <p className="text-sm text-slate-500">{client.company ?? client.email ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {portal.isEnabled && (
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:opacity-80 gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" /> View portal
                    </Button>
                  </a>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: portal.isEnabled ? "#22C55E15" : "var(--border-col)", color: portal.isEnabled ? "#22C55E" : "#64748b" }}>
                  {portal.isEnabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Portal {portal.isEnabled ? "live" : "inactive"}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-col)" }}>
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className="relative flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors"
                  style={{ color: tab === id ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: tab === id ? 600 : 400 }}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {id === "feedback" && unreadFeedback > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                      style={{ background: "#f87171", color: "#fff" }}>{unreadFeedback}</span>
                  )}
                  {tab === id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#22C55E" }} />
                  )}
                </button>
              ))}
            </div>

            {/* ── Overview ─────────────────────────────────────────── */}
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Earned this year", value: formatCurrency(totalEarned, user?.currency ?? "EUR"), color: "#22C55E" },
                    { label: "Total invoices", value: String(invoices.length), color: "#635BFF" },
                    { label: "Open invoices", value: String(invoices.filter((i) => i.status === "sent" || i.status === "overdue").length), color: "#F59E0B" },
                    { label: "Project updates", value: String(updates.length), color: "#1DBF73" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Client info */}
                <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Client Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Name", value: client.name },
                      { label: "Company", value: client.company ?? "—" },
                      { label: "Email", value: client.email ?? "—" },
                      { label: "Country", value: client.country ?? "—" },
                      { label: "Client since", value: dayjs(client.createdAt).format("MMMM YYYY") },
                      { label: "Notes", value: client.notes ?? "—" },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-xs text-slate-500">{f.label}</p>
                        <p className="text-white mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoices */}
                {invoices.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    <p className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest border-b" style={{ borderColor: "var(--border-col)" }}>Invoices</p>
                    <div className="divide-y" style={{ borderColor: "var(--border-col)" }}>
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-slate-400">{inv.invoiceNumber}</span>
                            <InvoiceStatus status={inv.status} />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(inv.total, inv.currency)}</p>
                            <p className="text-xs text-slate-500">Due {dayjs(inv.dueDate).format("MMM D, YYYY")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Proposals ────────────────────────────────────────── */}
            {tab === "proposals" && (
              <div className="space-y-3">
                {proposals.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No proposals for this client yet.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Go to <a href="/proposals" className="underline" style={{ color: "#22C55E" }}>Proposals</a> to create one.
                    </p>
                  </div>
                ) : proposals.map((p) => {
                  const SCFG: Record<string, { label: string; color: string; bg: string }> = {
                    draft: { label: "Draft", color: "#94a3b8", bg: "#64748b20" },
                    sent: { label: "Sent", color: "#60a5fa", bg: "#3b82f620" },
                    accepted: { label: "Accepted", color: "#22C55E", bg: "#22C55E20" },
                    declined: { label: "Declined", color: "#f87171", bg: "#ef444420" },
                    expired: { label: "Expired", color: "#f59e0b", bg: "#f59e0b20" },
                  };
                  const sc = SCFG[p.status];
                  return (
                    <div key={p.id} className="rounded-xl p-5 space-y-3"
                      style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold">{p.projectName}</p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                            {p.convertedToInvoiceId && (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "#22C55E15", color: "#22C55E" }}>→ Invoiced</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(p.total, p.currency)} · Valid until {dayjs(p.validUntil).format("MMM D, YYYY")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.status === "draft" && (
                            <button onClick={() => handleProposalStatus(p, "sent")}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg"
                              style={{ background: "#3b82f620", color: "#60a5fa", border: "1px solid #3b82f640" }}>
                              Mark sent
                            </button>
                          )}
                          {p.status === "sent" && (
                            <>
                              <button onClick={() => handleProposalStatus(p, "accepted")}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                                style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E40" }}>
                                Accepted
                              </button>
                              <button onClick={() => handleProposalStatus(p, "declined")}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                                style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444440" }}>
                                Declined
                              </button>
                            </>
                          )}
                          {p.status === "accepted" && !p.convertedToInvoiceId && (
                            <button onClick={() => handleConvertProposalToInvoice(p)}
                              disabled={convertingId === p.id}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                              style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                              {convertingId === p.id ? "Creating…" : "Convert to invoice →"}
                            </button>
                          )}
                        </div>
                      </div>
                      {p.scope && <p className="text-xs text-slate-400 leading-relaxed">{p.scope}</p>}
                      <div className="space-y-1 pt-1 border-t" style={{ borderColor: "var(--border-col)" }}>
                        {p.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-500">{item.description}</span>
                            <span className="text-slate-300">{formatCurrency(item.total, p.currency)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold pt-1">
                          <span className="text-white">Total</span>
                          <span className="text-white">{formatCurrency(p.total, p.currency)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Contracts ─────────────────────────────────────────── */}
            {tab === "contracts" && (
              <div className="space-y-3">
                {contracts.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No contracts for this client.</p>
                  </div>
                ) : contracts.map((con) => {
                  const CSTATUS: Record<string, { label: string; color: string; bg: string }> = {
                    draft: { label: "Draft", color: "#94a3b8", bg: "#64748b20" },
                    sent: { label: "Sent", color: "#60a5fa", bg: "#3b82f620" },
                    signed: { label: "Signed", color: "#22C55E", bg: "#22C55E20" },
                    active: { label: "Active", color: "#22C55E", bg: "#22C55E20" },
                    completed: { label: "Completed", color: "#60a5fa", bg: "#3b82f620" },
                    cancelled: { label: "Cancelled", color: "#f87171", bg: "#ef444420" },
                  };
                  const cs = CSTATUS[con.status];
                  return (
                    <div key={con.id} className="rounded-xl p-5 space-y-3"
                      style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold">{con.projectName}</p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: cs.bg, color: cs.color }}>{cs.label}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(con.rate, con.currency)}/{con.rateType} · Net {con.paymentTermsDays} days · Started {dayjs(con.startDate).format("MMM D, YYYY")}
                            {con.endDate && ` · Ends ${dayjs(con.endDate).format("MMM D, YYYY")}`}
                          </p>
                          {con.signedAt && (
                            <p className="text-xs text-slate-600">Signed {dayjs(con.signedAt).format("MMM D, YYYY")}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-500 mb-0.5 font-medium">Scope</p>
                          <p className="text-slate-400 leading-relaxed">{con.scope}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-0.5 font-medium">Deliverables</p>
                          <p className="text-slate-400 leading-relaxed">{con.deliverables}</p>
                        </div>
                        {con.revisionPolicy && (
                          <div>
                            <p className="text-slate-500 mb-0.5 font-medium">Revisions</p>
                            <p className="text-slate-400 leading-relaxed">{con.revisionPolicy}</p>
                          </div>
                        )}
                        {con.terminationClause && (
                          <div>
                            <p className="text-slate-500 mb-0.5 font-medium">Termination</p>
                            <p className="text-slate-400 leading-relaxed">{con.terminationClause}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Projects ──────────────────────────────────────────── */}
            {tab === "projects" && (
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No projects for this client.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Go to <a href="/projects" className="underline" style={{ color: "#22C55E" }}>Projects</a> to create one.
                    </p>
                  </div>
                ) : projects.map((proj) => {
                  const PSTATUS: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
                    "active":    { label: "Active",    color: "#22C55E", bg: "#22C55E20" },
                    "on-hold":   { label: "On hold",   color: "#f59e0b", bg: "#f59e0b20" },
                    "completed": { label: "Completed", color: "#60a5fa", bg: "#3b82f620" },
                    "cancelled": { label: "Cancelled", color: "#f87171", bg: "#ef444420" },
                  };
                  const ps = PSTATUS[proj.status];
                  const daysLeft = proj.endDate
                    ? Math.ceil((new Date(proj.endDate).getTime() - Date.now()) / 86_400_000)
                    : null;
                  return (
                    <div key={proj.id} className="rounded-xl p-5"
                      style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold">{proj.name}</p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: ps.bg, color: ps.color }}>{ps.label}</span>
                            {daysLeft !== null && proj.status === "active" && (
                              <span className="text-xs"
                                style={{ color: daysLeft < 7 ? "#f87171" : daysLeft < 21 ? "#f59e0b" : "#64748b" }}>
                                {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Started {dayjs(proj.startDate).format("MMM D, YYYY")}
                            {proj.endDate && ` · Due ${dayjs(proj.endDate).format("MMM D, YYYY")}`}
                          </p>
                          {proj.notes && <p className="text-xs text-slate-600 mt-1">{proj.notes}</p>}
                        </div>
                        <select value={proj.status}
                          onChange={(e) => handleProjectStatusChange(proj, e.target.value as ProjectStatus)}
                          className="h-8 px-2 rounded-lg text-xs font-medium border outline-none"
                          style={{ background: ps.bg, color: ps.color, borderColor: ps.color + "40" }}>
                          {(Object.keys(PSTATUS) as ProjectStatus[]).map((s) => (
                            <option key={s} value={s} style={{ background: "var(--bg-card)", color: "#fff" }}>
                              {PSTATUS[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {proj.budgetAmount && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Budget</span>
                          <span className="text-white font-semibold">{formatCurrency(proj.budgetAmount, proj.currency)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Portal settings ──────────────────────────────────── */}
            {tab === "portal" && (
              <div className="space-y-4">
                {/* Enable / link */}
                <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Client portal</p>
                      <p className="text-xs text-slate-500 mt-0.5">Share a link with your client to view updates, files, and invoices.</p>
                    </div>
                    <Toggle
                      checked={portal.isEnabled}
                      onChange={(v) => handleSavePortal({ ...portal, isEnabled: v })}
                    />
                  </div>

                  {portal.isEnabled && (
                    <div className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border-col)" }}>
                      <p className="text-xs text-slate-400 flex-1 truncate font-mono">{portalUrl}</p>
                      <button onClick={copyLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 flex-shrink-0"
                        style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Visibility toggles */}
                <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <p className="text-sm font-semibold">What clients can see</p>
                  {[
                    { key: "showUpdates" as const, label: "Project updates", desc: "Timeline of updates you post" },
                    { key: "showFiles" as const, label: "Shared files", desc: "Files you upload to this portal" },
                    { key: "showInvoices" as const, label: "Invoices", desc: "Invoice history and status" },
                    { key: "allowFeedback" as const, label: "Feedback form", desc: "Client can leave comments and questions" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                      <Toggle
                        checked={portal[key]}
                        onChange={(v) => handleSavePortal({ ...portal, [key]: v })}
                      />
                    </div>
                  ))}
                </div>

                {/* Header note */}
                <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div>
                    <Label className={labelCls}>Welcome message (optional)</Label>
                    <p className="text-xs text-slate-600 mt-0.5">Shown to the client at the top of their portal.</p>
                  </div>
                  <textarea
                    value={portal.headerNote ?? ""}
                    onChange={(e) => setPortal({ ...portal, headerNote: e.target.value })}
                    onBlur={() => handleSavePortal(portal)}
                    placeholder={`Hi ${client.name} — use this portal to track progress, access files, and leave feedback.`}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border-col)" }}
                  />
                </div>
              </div>
            )}

            {/* ── Updates ──────────────────────────────────────────── */}
            {tab === "updates" && (
              <div className="space-y-4">
                {/* Post new update */}
                <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <p className="text-sm font-semibold">Post a new update</p>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Title</Label>
                    <Input value={newUpdateTitle} onChange={(e) => setNewUpdateTitle(e.target.value)}
                      placeholder="e.g. First draft ready for review" className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Message</Label>
                    <textarea
                      value={newUpdateContent} onChange={(e) => setNewUpdateContent(e.target.value)}
                      placeholder="What did you complete? What should the client look at or decide?"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map((s) => (
                        <button key={s.value} onClick={() => setNewUpdateStatus(s.value)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: newUpdateStatus === s.value ? s.color + "25" : "var(--border-col)",
                            color: newUpdateStatus === s.value ? s.color : "#64748b",
                            border: `1px solid ${newUpdateStatus === s.value ? s.color + "50" : "transparent"}`,
                          }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <Button onClick={handlePostUpdate} size="sm" disabled={isPostingUpdate || !newUpdateTitle.trim() || !newUpdateContent.trim()}
                      className="font-semibold flex-shrink-0" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                      <Plus className="h-4 w-4 mr-1" />
                      {isPostingUpdate ? "Posting…" : "Post"}
                    </Button>
                  </div>
                </div>

                {/* Update list */}
                {updates.length === 0 ? (
                  <div className="py-10 text-center">
                    <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No updates posted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {updates.map((u) => (
                      <div key={u.id} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-sm font-semibold">{u.title}</p>
                              <StatusBadge status={u.status} />
                            </div>
                            <p className="text-xs text-slate-500">{dayjs(u.createdAt).format("MMMM D, YYYY [at] h:mm A")}</p>
                          </div>
                          <button onClick={() => handleDeleteUpdate(u.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{u.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Files ────────────────────────────────────────────── */}
            {tab === "files" && (
              <div className="space-y-4">
                {/* Upload file */}
                <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <p className="text-sm font-semibold">Upload a file</p>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />

                  {/* Drop / select area */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl py-6 flex flex-col items-center gap-2 transition-colors border-2 border-dashed"
                    style={{ borderColor: selectedFile ? "#22C55E" : "var(--border-col)", background: "var(--bg-sidebar)" }}
                  >
                    <Upload className="h-5 w-5" style={{ color: selectedFile ? "#22C55E" : "#64748b" }} />
                    {selectedFile ? (
                      <span className="text-sm font-medium" style={{ color: "#22C55E" }}>{selectedFile.name}</span>
                    ) : (
                      <span className="text-sm text-slate-500">Click to choose a file</span>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Type</Label>
                      <select
                        value={newFileType}
                        onChange={(e) => setNewFileType(e.target.value as SharedFile["type"])}
                        className="h-9 w-full rounded-xl px-3 text-sm border outline-none"
                        style={{ background: "var(--bg-sidebar)", borderColor: "var(--border-col)" }}>
                        <option value="design">Design</option>
                        <option value="document">Document</option>
                        <option value="video">Video</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Description (optional)</Label>
                      <Input value={newFileDesc} onChange={(e) => setNewFileDesc(e.target.value)}
                        placeholder="e.g. Homepage first draft" className={inputCls} style={{ background: "var(--bg-sidebar)" }} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleAddFile} size="sm" disabled={isAddingFile || !selectedFile}
                      className="font-semibold" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                      <Upload className="h-4 w-4 mr-1" />
                      {isAddingFile ? "Uploading…" : "Upload"}
                    </Button>
                  </div>
                </div>

                {/* File list */}
                {files.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No files shared yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center gap-4 px-5 py-4 rounded-xl"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <div className="flex-1 min-w-0">
                          {f.storageUrl ? (
                            <a href={f.storageUrl} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold truncate hover:underline block"
                              style={{ color: "#60a5fa" }}>
                              {f.name}
                            </a>
                          ) : (
                            <p className="text-sm font-semibold truncate">{f.name}</p>
                          )}
                          {f.description && <p className="text-xs text-slate-500 truncate mt-0.5">{f.description}</p>}
                          <p className="text-xs text-slate-600 mt-0.5">
                            {f.type} · {f.sizeLabel} · {dayjs(f.uploadedAt).format("MMM D, YYYY")}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteFile(f.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Activity Timeline ─────────────────────────────────── */}
            {tab === "activity" && (
              <div className="space-y-4">
                {activityTimeline.length === 0 ? (
                  <div className="py-10 text-center">
                    <History className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No activity yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityTimeline.map((event, idx) => {
                      const iconMap = {
                        file: FileText,
                        check: CheckCircle2,
                        pen: FileText,
                        zap: Zap,
                      };
                      const Icon = iconMap[event.icon];
                      return (
                        <div key={`${event.timestamp}-${idx}`} className="flex gap-4">
                          {/* Timeline connector */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: event.color + "20" }}
                            >
                              <Icon className="h-4 w-4" style={{ color: event.color }} />
                            </div>
                            {idx < activityTimeline.length - 1 && (
                              <div
                                className="w-0.5 h-8 mt-2"
                                style={{ background: "var(--border-col)" }}
                              />
                            )}
                          </div>
                          {/* Event content */}
                          <div className="pt-1 pb-4">
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {dayjs(event.date).format("MMM D, YYYY")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Feedback ─────────────────────────────────────────── */}
            {tab === "feedback" && (
              <div className="space-y-3">
                {feedback.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No feedback received yet.</p>
                    <p className="text-xs text-slate-600 mt-1">Enable the portal and share the link with your client.</p>
                  </div>
                ) : (
                  <>
                    {unreadFeedback > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ background: "#22C55E0D", border: "1px solid #22C55E20" }}>
                        <p className="text-sm">{unreadFeedback} unread message{unreadFeedback !== 1 ? "s" : ""}</p>
                        <button onClick={() => markFeedbackRead(clientId).then(() =>
                          setFeedback((prev) => prev.map((f) => ({ ...f, isRead: true })))
                        )} className="text-xs font-medium" style={{ color: "#22C55E" }}>
                          Mark all read
                        </button>
                      </div>
                    )}
                    {feedback.map((fb) => (
                      <div key={fb.id} className="rounded-xl p-5"
                        style={{ background: "var(--bg-card)", border: `1px solid ${fb.isRead ? "var(--border-col)" : "#22C55E30"}` }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: "var(--border-col)", color: "#94a3b8" }}>
                              {fb.authorName.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{fb.authorName}</p>
                              <p className="text-xs text-slate-500">{dayjs(fb.submittedAt).format("MMM D, YYYY [at] h:mm A")}</p>
                            </div>
                          </div>
                          {!fb.isRead && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: "#22C55E20", color: "#22C55E" }}>New</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{fb.content}</p>
                        {fb.fileId && (
                          <p className="text-xs text-slate-500 mt-2">
                            Re: {files.find((f) => f.id === fb.fileId)?.name ?? "a file"}
                          </p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
