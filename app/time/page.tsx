"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Play, Square, Plus, Trash2, FileText, Clock, CheckSquare, Square as SquareIcon, Search, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTimeEntries,
  createTimeEntry,
  deleteTimeEntry,
  markEntriesBilled,
} from "@/lib/data/time";
import { createInvoice } from "@/lib/data/invoices";
import { getClients } from "@/lib/data/clients";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import { getCurrencySymbol } from "@/lib/fx";
import type { TimeEntry, Currency } from "@/lib/mock-data";

// ─── Timer persistence ────────────────────────────────────────────────────────

const TIMER_KEY = "msd_timer";

interface TimerState {
  startedAt: string; // ISO timestamp
  clientName: string;
  projectName: string;
  description: string;
  hourlyRate: number;
}

function loadTimer(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

function saveTimer(state: TimerState | null) {
  if (state) {
    localStorage.setItem(TIMER_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(TIMER_KEY);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function entryValue(entry: TimeEntry): number {
  return (entry.durationMinutes / 60) * entry.hourlyRate;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const currency = (user?.currency ?? "EUR") as Currency;
  const [clientNames, setClientNames] = useState<string[]>([]);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Live timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerState, setTimerStateRaw] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer form fields
  const [tClient, setTClient] = useState("");
  const [tProject, setTProject] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tRate, setTRate] = useState(String(90));

  // Manual log dialog
  const [logOpen, setLogOpen] = useState(false);
  const [lDate, setLDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [lClient, setLClient] = useState("");
  const [lProject, setLProject] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [lHours, setLHours] = useState("");
  const [lMins, setLMins] = useState("");
  const [lRate, setLRate] = useState(String(90));
  const [lCurrency, setLCurrency] = useState<Currency>(currency);
  const [isLogging, setIsLogging] = useState(false);

  // Invoice dialog
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invTaxRate, setInvTaxRate] = useState("");
  const [invDueDate, setInvDueDate] = useState(dayjs().add(30, "day").format("YYYY-MM-DD"));
  const [invNotes, setInvNotes] = useState("");
  const [isInvoicing, setIsInvoicing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  // Load entries
  useEffect(() => {
    let mounted = true;
    getTimeEntries(user?.id).then((data) => {
      if (mounted) { setEntries(data); setIsLoading(false); }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  // Load clients for dropdowns
  useEffect(() => {
    if (user?.id) {
      getClients(user.id).then((c) => setClientNames(c.map((cl) => cl.name)));
    }
  }, [user?.id]);

  // Restore timer from localStorage on mount
  useEffect(() => {
    const saved = loadTimer();
    if (saved) {
      setTimerStateRaw(saved);
      setTClient(saved.clientName);
      setTProject(saved.projectName);
      setTDesc(saved.description);
      setTRate(String(saved.hourlyRate));
      setTimerRunning(true);
      const diffSec = Math.floor((Date.now() - new Date(saved.startedAt).getTime()) / 1000);
      setElapsed(diffSec);
    }
  }, []);

  // Tick interval
  useEffect(() => {
    if (timerRunning) {
      tickRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [timerRunning]);

  const startTimer = useCallback(() => {
    const state: TimerState = {
      startedAt: new Date().toISOString(),
      clientName: tClient,
      projectName: tProject,
      description: tDesc,
      hourlyRate: parseFloat(tRate) || 90,
    };
    saveTimer(state);
    setTimerStateRaw(state);
    setElapsed(0);
    setTimerRunning(true);
  }, [tClient, tProject, tDesc, tRate]);

  const stopTimer = useCallback(async () => {
    if (!timerState) return;
    setTimerRunning(false);
    saveTimer(null);

    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const entry = await createTimeEntry({
      userId: user?.id ?? "user_mock_001",
      date: dayjs(timerState.startedAt).format("YYYY-MM-DD"),
      clientName: timerState.clientName || "Unknown",
      projectName: timerState.projectName || undefined,
      description: timerState.description || "Tracked time",
      durationMinutes,
      hourlyRate: timerState.hourlyRate,
      currency,
      isBilled: false,
    });
    setEntries((prev) => [entry, ...prev]);
    setTimerStateRaw(null);
    setElapsed(0);
    setTClient(""); setTProject(""); setTDesc("");
  }, [timerState, elapsed, user?.id, currency]);

  const discardTimer = useCallback(() => {
    setTimerRunning(false);
    saveTimer(null);
    setTimerStateRaw(null);
    setElapsed(0);
    setTClient(""); setTProject(""); setTDesc("");
  }, []);

  const handleLogManual = async () => {
    const hours = parseInt(lHours) || 0;
    const mins = parseInt(lMins) || 0;
    const durationMinutes = hours * 60 + mins;
    if (!lClient || durationMinutes <= 0 || !lDesc) return;
    setIsLogging(true);
    try {
      const entry = await createTimeEntry({
        userId: user?.id ?? "user_mock_001",
        date: lDate,
        clientName: lClient,
        projectName: lProject || undefined,
        description: lDesc,
        durationMinutes,
        hourlyRate: parseFloat(lRate) || 90,
        currency: lCurrency,
        isBilled: false,
      });
      setEntries((prev) => [entry, ...prev]);
      setLogOpen(false);
      setLClient(""); setLProject(""); setLDesc("");
      setLHours(""); setLMins("");
      setLDate(dayjs().format("YYYY-MM-DD"));
      toast("Time entry logged");
    } finally {
      setIsLogging(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTimeEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const selectedEntries = useMemo(
    () => entries.filter((e) => selected.has(e.id)),
    [entries, selected]
  );

  const unbilledEntries = useMemo(() => entries.filter((e) => !e.isBilled), [entries]);

  // Only allow invoicing entries with the same client
  const selectedClient = selectedEntries.length > 0 ? selectedEntries[0].clientName : null;
  const selectionMixedClients = selectedEntries.some((e) => e.clientName !== selectedClient);

  const handleCreateInvoice = async () => {
    if (!selectedClient || selectionMixedClients || selectedEntries.length === 0) return;
    setIsInvoicing(true);
    try {
      const taxRate = parseFloat(invTaxRate) / 100 || 0;
      const lineItems = selectedEntries.map((e) => ({
        description: `${e.description}${e.projectName ? ` (${e.projectName})` : ""} — ${fmtDuration(e.durationMinutes)} @ ${formatCurrency(e.hourlyRate, e.currency)}/hr`,
        quantity: parseFloat((e.durationMinutes / 60).toFixed(2)),
        unitPrice: e.hourlyRate,
        total: parseFloat(((e.durationMinutes / 60) * e.hourlyRate).toFixed(2)),
      }));
      const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;
      const entryCurrency = selectedEntries[0].currency;
      const year = new Date().getFullYear();

      const inv = await createInvoice({
        userId: user?.id ?? "user_mock_001",
        invoiceNumber: `INV-${year}-T${Date.now().toString().slice(-4)}`,
        clientName: selectedClient,
        items: lineItems,
        currency: entryCurrency,
        subtotal,
        taxRate: taxRate || undefined,
        taxAmount: taxAmount || undefined,
        total,
        status: "draft",
        issueDate: dayjs().format("YYYY-MM-DD"),
        dueDate: invDueDate,
        notes: invNotes || `Time tracking invoice — ${selectedEntries.length} entr${selectedEntries.length === 1 ? "y" : "ies"}`,
      });

      await markEntriesBilled(Array.from(selected), inv.id);
      setEntries((prev) =>
        prev.map((e) => selected.has(e.id) ? { ...e, isBilled: true, invoiceId: inv.id } : e)
      );
      setSelected(new Set());
      setInvoiceOpen(false);
      setInvTaxRate(""); setInvNotes("");
      toast(`Invoice created for ${selectedClient}`);
      router.push("/invoices");
    } finally {
      setIsInvoicing(false);
    }
  };

  // Stats
  const currentYear = new Date().getFullYear();
  const ytdEntries = useMemo(
    () => entries.filter((e) => new Date(e.date).getFullYear() === currentYear),
    [entries, currentYear]
  );
  const totalHoursYTD = useMemo(
    () => ytdEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60,
    [ytdEntries]
  );
  const unbilledValue = useMemo(
    () => unbilledEntries.reduce((s, e) => s + entryValue(e), 0),
    [unbilledEntries]
  );
  const unbilledHours = useMemo(
    () => unbilledEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60,
    [unbilledEntries]
  );

  // Group entries by date (with search filter)
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = q
      ? entries.filter(
          (e) =>
            e.description.toLowerCase().includes(q) ||
            e.clientName.toLowerCase().includes(q) ||
            (e.projectName ?? "").toLowerCase().includes(q)
        )
      : entries;
    const map = new Map<string, TimeEntry[]>();
    visible.forEach((e) => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [entries, search]);

  const inputClass = "h-9 text-sm";
  const labelClass = "text-xs font-medium";

  const liveValue = timerRunning
    ? ((elapsed / 3600) * (parseFloat(tRate) || 90)).toFixed(2)
    : null;

  return (
    <AppShell title="Time Tracking">
      <div className="p-5 lg:p-6 space-y-5">

        {/* ── Live Timer ─────────────────────────────────────────── */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: timerRunning ? "#0A1A10" : "var(--bg-card)",
            border: `1px solid ${timerRunning ? "#22C55E40" : "var(--border-col)"}`,
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: timerRunning ? "#22C55E" : "#64748b" }} />
              {timerRunning ? "Timer running" : "Start a timer"}
            </p>
            {timerRunning && (
              <span className="text-3xl font-mono font-bold" style={{ color: "#22C55E" }}>
                {fmtElapsed(elapsed)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clientNames.length > 0 ? (
              <Select
                value={tClient}
                onValueChange={(v) => !timerRunning && setTClient(v === "__none__" ? "" : (v ?? ""))}
                disabled={timerRunning}
              >
                <SelectTrigger className="h-9 text-sm border  disabled:opacity-50">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <SelectItem value="__none__" className="text-slate-400 text-sm">No client</SelectItem>
                  {clientNames.map((n) => (
                    <SelectItem key={n} value={n} className="text-white text-sm">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                type="text"
                placeholder="Client"
                value={tClient}
                onChange={(e) => setTClient(e.target.value)}
                disabled={timerRunning}
                className="h-9 px-3 rounded-lg text-sm border disabled:opacity-50"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
              />
            )}
            <input
              type="text"
              placeholder="Project (optional)"
              value={tProject}
              onChange={(e) => setTProject(e.target.value)}
              disabled={timerRunning}
              className="h-9 px-3 rounded-lg text-sm border disabled:opacity-50"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
            />
            <input
              type="text"
              placeholder="What are you working on? *"
              value={tDesc}
              onChange={(e) => setTDesc(e.target.value)}
              disabled={timerRunning}
              className="h-9 px-3 rounded-lg text-sm border disabled:opacity-50"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{getCurrencySymbol(currency)}</span>
                <input
                  type="number"
                  placeholder="Rate/hr"
                  value={tRate}
                  onChange={(e) => setTRate(e.target.value)}
                  disabled={timerRunning}
                  className="h-9 w-full pl-6 pr-3 rounded-lg text-sm border disabled:opacity-50"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
                />
              </div>
              {timerRunning ? (
                <>
                  <button
                    onClick={stopTimer}
                    className="h-9 px-4 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    Stop
                  </button>
                  <button
                    onClick={discardTimer}
                    title="Discard timer"
                    className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                    style={{ border: "1px solid var(--border-col)" }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={startTimer}
                  disabled={!tDesc}
                  className="h-9 px-4 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start
                </button>
              )}
            </div>
          </div>

          {timerRunning && liveValue && (
            <p className="text-xs text-slate-500">
              Running value: <span style={{ color: "#22C55E" }}>{formatCurrency(parseFloat(liveValue), currency)}</span>
              {" "}at {formatCurrency(parseFloat(tRate) || 90, currency)}/hr
              {tClient && <> · <span className="text-slate-400">{tClient}</span></>}
              {tProject && <> · <span className="text-slate-400">{tProject}</span></>}
            </p>
          )}
        </div>

        {/* ── Stats ──────────────────────────────────────────────── */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Hours logged (YTD)"
              value={`${totalHoursYTD.toFixed(1)}h`}
              sub={`${currentYear} year to date`}
            />
            <StatTile
              label="Unbilled hours"
              value={`${unbilledHours.toFixed(1)}h`}
              sub={`${unbilledEntries.length} entr${unbilledEntries.length === 1 ? "y" : "ies"}`}
            />
            <StatTile
              label="Unbilled value"
              value={formatCurrency(unbilledValue, currency)}
              sub="Ready to invoice"
            />
            <StatTile
              label="Avg hourly rate"
              value={ytdEntries.length > 0
                ? formatCurrency(ytdEntries.reduce((s, e) => s + e.hourlyRate, 0) / ytdEntries.length, currency)
                : "—"}
              sub="Across all clients"
            />
          </div>
        )}

        {/* ── Search ─────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-8 pr-3 rounded-lg text-sm border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
          />
        </div>

        {/* ── Action bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-xs text-slate-400">{selected.size} selected</span>
                {!selectionMixedClients ? (
                  <button
                    onClick={() => setInvoiceOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Generate invoice
                  </button>
                ) : (
                  <span className="text-xs text-red-400">Select entries from one client to invoice</span>
                )}
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              </>
            )}
            {selected.size === 0 && unbilledEntries.length > 0 && (
              <button
                onClick={() => setSelected(new Set(unbilledEntries.map((e) => e.id)))}
                className="text-xs text-slate-400 hover:opacity-80 transition-colors flex items-center gap-1"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Select all unbilled
              </button>
            )}
          </div>
          <Button
            onClick={() => setLogOpen(true)}
            size="sm"
            className="font-semibold"
            style={{ background: "var(--border-col)", color: "#94a3b8" }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Log manually
          </Button>
        </div>

        {/* ── Entry list ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl h-14 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No time logged yet. Start a timer or log manually.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, dayEntries]) => {
              const dayTotal = dayEntries.reduce((s, e) => s + e.durationMinutes, 0);
              const dayValue = dayEntries.reduce((s, e) => s + entryValue(e), 0);
              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-xs font-semibold text-slate-400">
                      {dayjs(date).format("ddd, MMM D, YYYY")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {fmtDuration(dayTotal)} · {formatCurrency(dayValue, currency)}
                    </span>
                  </div>

                  {/* Entries for this date */}
                  <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    {dayEntries.map((entry, idx) => {
                      const isSelected = selected.has(entry.id);
                      const value = entryValue(entry);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                          style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-col)30" }}
                          onClick={() => !entry.isBilled && toggleSelect(entry.id)}
                        >
                          {/* Checkbox */}
                          <button
                            className="flex-shrink-0 transition-colors"
                            onClick={(ev) => { ev.stopPropagation(); if (!entry.isBilled) toggleSelect(entry.id); }}
                            disabled={entry.isBilled}
                          >
                            {entry.isBilled ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ background: "#22C55E15", color: "#22C55E" }}>
                                invoiced
                              </span>
                            ) : isSelected ? (
                              <CheckSquare className="h-4 w-4" style={{ color: "#22C55E" }} />
                            ) : (
                              <SquareIcon className="h-4 w-4 text-slate-600" />
                            )}
                          </button>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{entry.description}</p>
                            <p className="text-xs text-slate-500">
                              {entry.clientName}
                              {entry.projectName && ` · ${entry.projectName}`}
                              {" · "}{formatCurrency(entry.hourlyRate, entry.currency)}/hr
                            </p>
                          </div>

                          {/* Duration + value */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold">{fmtDuration(entry.durationMinutes)}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(value, entry.currency)}</p>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={(ev) => { ev.stopPropagation(); handleDelete(entry.id); }}
                            className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Manual log dialog ──────────────────────────────────────────── */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Date *</Label>
                <Input type="date" value={lDate} onChange={(e) => setLDate(e.target.value)}
                  className={inputClass} style={{ background: "var(--bg-card)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Duration *</Label>
                <div className="flex gap-1.5">
                  <Input type="number" min="0" placeholder="h" value={lHours}
                    onChange={(e) => setLHours(e.target.value)}
                    className={`${inputClass} w-16 text-center`} style={{ background: "var(--bg-card)" }} />
                  <Input type="number" min="0" max="59" placeholder="m" value={lMins}
                    onChange={(e) => setLMins(e.target.value)}
                    className={`${inputClass} w-16 text-center`} style={{ background: "var(--bg-card)" }} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Client *</Label>
              {clientNames.length > 0 ? (
                <Select
                  value={lClient}
                  onValueChange={(v) => setLClient(v === "__none__" ? "" : (v ?? ""))}
                >
                  <SelectTrigger className={`${inputClass} `}>
                    <SelectValue placeholder="Select a client…" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    <SelectItem value="__none__" className="text-slate-400 text-sm">No client</SelectItem>
                    {clientNames.map((n) => (
                      <SelectItem key={n} value={n} className="text-white text-sm">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input type="text" placeholder="Acme Corp"
                  value={lClient} onChange={(e) => setLClient(e.target.value)}
                  className={inputClass} style={{ background: "var(--bg-card)" }} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Project</Label>
              <Input placeholder="Website Redesign" value={lProject}
                onChange={(e) => setLProject(e.target.value)}
                className={inputClass} style={{ background: "var(--bg-card)" }} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Description *</Label>
              <Input placeholder="What did you work on?" value={lDesc}
                onChange={(e) => setLDesc(e.target.value)}
                className={inputClass} style={{ background: "var(--bg-card)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Hourly rate</Label>
                <Input type="number" min="0" placeholder="90" value={lRate}
                  onChange={(e) => setLRate(e.target.value)}
                  className={inputClass} style={{ background: "var(--bg-card)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Currency</Label>
                <select value={lCurrency} onChange={(e) => setLCurrency(e.target.value as Currency)}
                  className="h-9 w-full px-3 rounded-md text-sm border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}>
                  {["EUR", "USD", "GBP", "NOK"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {(parseInt(lHours) > 0 || parseInt(lMins) > 0) && lRate && (
              <div className="text-xs text-slate-400 px-1">
                Value: <span className="text-white font-medium">
                  {formatCurrency(
                    ((parseInt(lHours) || 0) + (parseInt(lMins) || 0) / 60) * (parseFloat(lRate) || 0),
                    lCurrency
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:opacity-80"
                onClick={() => setLogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogManual} size="sm" className="font-semibold"
                style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                disabled={isLogging || !lClient || !lDesc || (!lHours && !lMins)}>
                {isLogging ? "Saving…" : "Log Time"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Generate invoice dialog ────────────────────────────────────── */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-md" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Summary */}
            <div className="rounded-lg px-4 py-3 space-y-1" style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs text-slate-500 mb-2">
                {selectedEntries.length} time entr{selectedEntries.length === 1 ? "y" : "ies"} for{" "}
                <span className="text-white font-medium">{selectedClient}</span>
              </p>
              {selectedEntries.map((e) => (
                <div key={e.id} className="flex justify-between text-sm">
                  <span className="text-slate-400 truncate mr-2">{e.description} · {fmtDuration(e.durationMinutes)}</span>
                  <span className="text-white flex-shrink-0">{formatCurrency(entryValue(e), e.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-2 border-t mt-2" style={{ borderColor: "var(--border-col)" }}>
                <span className="text-slate-300">Subtotal</span>
                <span className="text-white">{formatCurrency(selectedEntries.reduce((s, e) => s + entryValue(e), 0), currency)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Tax rate (%)</Label>
                <Input type="number" min="0" max="100" placeholder="0" value={invTaxRate}
                  onChange={(e) => setInvTaxRate(e.target.value)}
                  className={inputClass} style={{ background: "var(--bg-card)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Due date</Label>
                <Input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)}
                  className={inputClass} style={{ background: "var(--bg-card)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Notes (optional)</Label>
              <textarea placeholder="Payment terms, bank details…" value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-md text-sm border resize-none"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }} />
            </div>

            <p className="text-xs text-slate-500">
              Invoice will be created as a draft. Entries will be marked as billed.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:opacity-80"
                onClick={() => setInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} size="sm" className="font-semibold"
                style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                disabled={isInvoicing}>
                {isInvoicing ? "Creating…" : "Create Invoice →"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
