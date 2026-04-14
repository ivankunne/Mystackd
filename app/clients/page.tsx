"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, Users, ChevronDown, ChevronUp, Search, Trash2, Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { getClients, createClient, deleteClient } from "@/lib/data/clients";
import { getInvoices } from "@/lib/data/invoices";
import { getIncomeEntries } from "@/lib/data/income";
import { getAllPortals } from "@/lib/data/portal";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import { exportClientsCSV } from "@/lib/csv";
import type { Client, Invoice, IncomeEntry, ClientPortal } from "@/lib/mock-data";

export default function ClientsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [portals, setPortals] = useState<Record<string, ClientPortal | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "recent">("recent");
  const [pageIndex, setPageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = clients;
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }
    // Apply sorting
    if (sortBy === "name-asc") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "recent") {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [clients, search, sortBy]);

  // New client form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    Promise.all([
      getClients(user.id),
      getInvoices(user.id),
      getIncomeEntries(user.id),
      getAllPortals(),
    ]).then(([c, inv, ent, portalsData]) => {
      if (!mounted) return;
      setClients(c);
      setInvoices(inv);
      setEntries(ent);
      // Build portal map from getAllPortals result
      const portalMap: Record<string, ClientPortal | null> = {};
      portalsData.forEach((portal) => {
        portalMap[portal.clientId] = portal;
      });
      if (mounted) {
        setPortals(portalMap);
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to load clients data:", error);
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const paginatedClients = useMemo(() => {
    return filteredClients.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
  }, [filteredClients, pageIndex]);

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [search, sortBy]);

  const currentYear = new Date().getFullYear();

  const getTotalEarnedThisYear = useMemo(() => {
    return entries
      .filter((e) => new Date(e.date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [entries]);

  // Type for client stats
  type ClientStats = { totalEarned: number; invoiceCount: number; lastPayment: string | null; entries: IncomeEntry[]; invoices: Invoice[] };

  // Pre-compute stats for all clients to avoid O(n) filtering per render
  const clientStatsMap = useMemo<Record<string, ClientStats>>(() => {
    const map: Record<string, ClientStats> = {};
    const uniqueClientNames = new Set<string>();

    entries.forEach((e) => {
      if (e.clientName) uniqueClientNames.add(e.clientName);
    });
    invoices.forEach((inv) => {
      if (inv.clientName) uniqueClientNames.add(inv.clientName);
    });

    uniqueClientNames.forEach((clientName) => {
      const clientEntries = entries.filter((e) => e.clientName === clientName);
      const clientInvoices = invoices.filter((inv) => inv.clientName === clientName);
      const totalEarned = clientEntries
        .filter((e) => new Date(e.date).getFullYear() === currentYear)
        .reduce((sum, e) => sum + e.amount, 0);
      const lastEntry = clientEntries.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      map[clientName] = { totalEarned, invoiceCount: clientInvoices.length, lastPayment: lastEntry?.date ?? null, entries: clientEntries, invoices: clientInvoices };
    });

    return map;
  }, [entries, invoices, currentYear]);

  const getClientStats = (clientName: string): ClientStats => {
    return clientStatsMap[clientName] ?? { totalEarned: 0, invoiceCount: 0, lastPayment: null, entries: [], invoices: [] };
  };

  const handleCreate = async () => {
    if (!newName) return;
    setIsCreating(true);
    try {
      const client = await createClient({
        userId: user?.id ?? "user_mock_001",
        name: newName,
        email: newEmail || undefined,
        company: newCompany || undefined,
        country: newCountry || undefined,
        notes: newNotes || undefined,
      });
      setClients((prev) => [client, ...prev]);
      setCreateOpen(false);
      setNewName(""); setNewEmail(""); setNewCompany(""); setNewCountry(""); setNewNotes("");
      toast(`${client.name} added`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) return;
    const confirm = window.confirm(`Delete ${selectedClients.size} client${selectedClients.size > 1 ? "s" : ""}? This cannot be undone.`);
    if (!confirm) return;
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedClients).map((id) => deleteClient(id)));
      setClients((prev) => prev.filter((c) => !selectedClients.has(c.id)));
      setSelectedClients(new Set());
      toast(`${selectedClients.size} client${selectedClients.size > 1 ? "s" : ""} deleted`);
    } catch (err) {
      toast("Failed to delete clients", "error");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = "h-9 text-sm";
  const labelClass = "text-xs font-medium";

  return (
    <AppShell title="Clients">
      <div className="p-5 lg:p-6 space-y-5">
        {/* Stat strip */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total clients</p>
            <p className="text-lg font-semibold">{clients.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Earned this year</p>
            <p className="text-lg font-semibold">{formatCurrency(getTotalEarnedThisYear, user?.currency ?? "EUR")}</p>
          </div>
        </div>

        {/* Bulk action toolbar */}
        {selectedClients.size > 0 && (
          <div className="w-full px-4 py-3 rounded-lg flex items-center justify-between flex-wrap gap-3" style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
            <span className="text-sm font-medium text-slate-400">{selectedClients.size} selected</span>
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
              style={{ background: "rgba(220, 38, 38, 0.1)", color: "#dc2626" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, company or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-3 rounded-lg text-sm border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort pills */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("recent")}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: sortBy === "recent" ? "#22C55E" : "var(--border-col)",
                  color: sortBy === "recent" ? "white" : "#94a3b8",
                }}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy("name-asc")}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: sortBy === "name-asc" ? "#22C55E" : "var(--border-col)",
                  color: sortBy === "name-asc" ? "white" : "#94a3b8",
                }}
              >
                A–Z
              </button>
              <button
                onClick={() => setSortBy("name-desc")}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: sortBy === "name-desc" ? "#22C55E" : "var(--border-col)",
                  color: sortBy === "name-desc" ? "white" : "#94a3b8",
                }}
              >
                Z–A
              </button>
            </div>
            <span className="text-sm text-slate-500 flex-shrink-0">{filteredClients.length} of {clients.length}</span>
            <Button
              onClick={() => exportClientsCSV(filteredClients)}
              className="font-semibold flex-shrink-0 gap-2 text-xs"
              style={{ background: "var(--border-col)", color: "#94a3b8" }}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="font-semibold flex-shrink-0"
              style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Client
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                <div className="w-full px-5 py-4 flex items-center justify-between">
                  {/* Left: Avatar + name + company */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-32" />
                      <div className="h-3 bg-slate-700 rounded w-24" />
                    </div>
                  </div>
                  {/* Right: Stats placeholders */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-24" />
                      <div className="h-3 bg-slate-700 rounded w-20" />
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-20" />
                      <div className="h-3 bg-slate-700 rounded w-20" />
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-24" />
                      <div className="h-3 bg-slate-700 rounded w-20" />
                    </div>
                    <div className="w-4 h-4 bg-slate-700 rounded flex-shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No clients yet. Add your first client.</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">No clients match your search.</p>
            <button
              onClick={() => setSearch("")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: "#22C55E", color: "white" }}
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedClients.map((client) => {
              const stats = getClientStats(client.name);
              const isExpanded = expandedId === client.id;
              return (
                <div
                  key={client.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
                >
                  {/* Client card header */}
                  <button
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedClients.has(client.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedClients((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              next.add(client.id);
                            } else {
                              next.delete(client.id);
                            }
                            return next;
                          });
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "#22C55E15", color: "#22C55E" }}
                      >
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.company ?? client.email ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(stats.totalEarned, user?.currency ?? "EUR")}
                        </p>
                        <p className="text-xs text-slate-500">this year</p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-semibold">{stats.invoiceCount}</p>
                        <p className="text-xs text-slate-500">invoices</p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="text-sm text-slate-400">
                          {stats.lastPayment ? dayjs(stats.lastPayment).format("MMM D, YYYY") : "—"}
                        </p>
                        <p className="text-xs text-slate-500">last payment</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Mobile stats */}
                  <div className="sm:hidden px-5 pb-3 flex gap-4">
                    <div>
                      <p className="text-xs text-slate-500">This year</p>
                      <p className="text-sm font-semibold">{formatCurrency(stats.totalEarned, user?.currency ?? "EUR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Invoices</p>
                      <p className="text-sm font-semibold">{stats.invoiceCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last payment</p>
                      <p className="text-sm text-slate-400">{stats.lastPayment ? dayjs(stats.lastPayment).format("MMM D") : "—"}</p>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-4 pt-0 border-t space-y-4"
                      style={{ borderColor: "var(--border-col)" }}
                    >
                      {/* Quick actions */}
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <Link href={`/clients/${client.id}`}>
                          <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}>
                            Manage client →
                          </button>
                        </Link>
                        {portals[client.id]?.isEnabled && (
                          <a href={`/portal/${portals[client.id]!.token}`} target="_blank" rel="noopener noreferrer">
                            <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                              style={{ background: "var(--border-col)", color: "#94a3b8" }}>
                              View portal ↗
                            </button>
                          </a>
                        )}
                        <span className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            background: portals[client.id]?.isEnabled ? "#22C55E15" : "var(--border-col)",
                            color: portals[client.id]?.isEnabled ? "#22C55E" : "#64748b",
                          }}>
                          Portal {portals[client.id]?.isEnabled ? "live" : "inactive"}
                        </span>
                      </div>
                      {/* Summary */}
                      <div
                        className="mt-4 px-4 py-3 rounded-lg text-sm"
                        style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
                      >
                        <span className="font-semibold">{client.name}</span>
                        <span className="text-slate-400">
                          {" "}— {formatCurrency(stats.totalEarned, user?.currency ?? "EUR")} this year across {stats.invoiceCount} invoice{stats.invoiceCount !== 1 ? "s" : ""}
                        </span>
                        {client.country && (
                          <span className="text-slate-500"> · {client.country}</span>
                        )}
                      </div>

                      {/* Recent income entries */}
                      {stats.entries.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2">Income entries</p>
                          <div className="space-y-1">
                            {stats.entries.slice(0, 5).map((e: IncomeEntry) => (
                              <div key={e.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">{dayjs(e.date).format("MMM D, YYYY")} · {e.note || e.projectName || "—"}</span>
                                <span className="font-medium">{formatCurrency(e.amount, e.currency)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Invoices */}
                      {stats.invoices.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2">Invoices</p>
                          <div className="space-y-1">
                            {stats.invoices.slice(0, 5).map((inv: Invoice) => (
                              <div key={inv.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 font-mono">{inv.invoiceNumber} · Due {dayjs(inv.dueDate).format("MMM D")}</span>
                                <span className="font-medium">{formatCurrency(inv.total, inv.currency)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Pagination controls */}
            {filteredClients.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border-col)" }}>
                <button
                  onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                  disabled={pageIndex === 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: "var(--border-col)", color: "#94a3b8" }}
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  {pageIndex * ITEMS_PER_PAGE + 1}–{Math.min((pageIndex + 1) * ITEMS_PER_PAGE, filteredClients.length)} of {filteredClients.length}
                </span>
                <button
                  onClick={() => setPageIndex((i) => i + 1)}
                  disabled={(pageIndex + 1) * ITEMS_PER_PAGE >= filteredClients.length}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: "var(--border-col)", color: "#94a3b8" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New client dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-base">New Client</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className={labelClass}>Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Acme Corp"
                className={inputClass}
                style={{ background: "var(--bg-card)" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="contact@acme.com"
                className={inputClass}
                style={{ background: "var(--bg-card)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Company</Label>
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Acme Corp Ltd."
                  className={inputClass}
                  style={{ background: "var(--bg-card)" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Country</Label>
                <Input
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder="NO"
                  className={inputClass}
                  style={{ background: "var(--bg-card)" }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Notes</Label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any notes about this client..."
                rows={2}
                className="w-full px-3 py-2 rounded-md text-sm border resize-none"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:opacity-80"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                size="sm"
                className="font-semibold"
                style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                disabled={isCreating || !newName}
              >
                {isCreating ? "Creating…" : "Add Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
