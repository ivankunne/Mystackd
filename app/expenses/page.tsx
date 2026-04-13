"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, Receipt, Trash2, TrendingDown, AlertTriangle, RefreshCw, Search, Download, ChevronUp, ChevronDown } from "lucide-react";
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
import { getExpenses, createExpense, deleteExpense } from "@/lib/data/expenses";
import { processRecurringExpenses } from "@/lib/data/recurringExpenses";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import { exportExpensesCSV } from "@/lib/csv";
import type { Expense, ExpenseCategory, Currency } from "@/lib/mock-data";

const CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: "software", label: "Software", emoji: "💻" },
  { value: "hardware", label: "Hardware", emoji: "🖥️" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "coworking", label: "Coworking", emoji: "🏢" },
  { value: "marketing", label: "Marketing", emoji: "📣" },
  { value: "education", label: "Education", emoji: "📚" },
  { value: "fees", label: "Fees", emoji: "💸" },
  { value: "other", label: "Other", emoji: "📦" },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  software: "#635BFF",
  hardware: "#3B82F6",
  travel: "#F59E0B",
  coworking: "#10B981",
  marketing: "#EC4899",
  education: "#8B5CF6",
  fees: "#EF4444",
  other: "#64748b",
};

function CategoryBadge({ category }: { category: ExpenseCategory }) {
  const cat = CATEGORIES.find((c) => c.value === category);
  const color = CATEGORY_COLORS[category];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${color}20`, color }}
    >
      {cat?.emoji} {cat?.label}
    </span>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function ExpensesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "category">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageIndex, setPageIndex] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Form state
  const [fDate, setFDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [fAmount, setFAmount] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fVendor, setFVendor] = useState("");
  const [fCategory, setFCategory] = useState<ExpenseCategory>("software");
  const [fDeductible, setFDeductible] = useState(true);
  const [fRecurring, setFRecurring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    if (authLoading) return; // wait until auth is resolved before fetching
    let mounted = true;
    getExpenses(user?.id).then(async (data) => {
      if (!mounted) return;
      try {
        // Process recurring expenses with pre-fetched expenses (avoid double-fetch)
        const newRecurring = await processRecurringExpenses(data);
        const merged = newRecurring.length > 0
          ? [...newRecurring, ...data.filter((e) => !newRecurring.some((n) => n.id === e.id))]
          : data;
        setExpenses(merged);
        setIsLoading(false);
      } catch {
        if (mounted) setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.id, authLoading]);

  const currentYear = new Date().getFullYear();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = expenses.filter((e) => {
      const year = new Date(e.date).getFullYear();
      // Use date range if provided, otherwise fall back to year filter
      if (filterFrom || filterTo) {
        if (filterFrom && e.date < filterFrom) return false;
        if (filterTo && e.date > filterTo) return false;
      } else {
        if (year !== filterYear) return false;
      }
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (q && !e.description.toLowerCase().includes(q) && !(e.vendor ?? "").toLowerCase().includes(q)) return false;
      return true;
    });

    // Apply sorting
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortKey === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortKey === "category") {
        cmp = a.category.localeCompare(b.category);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [expenses, filterYear, filterCategory, search, filterFrom, filterTo, sortKey, sortDir]);

  // Reset pageIndex when filters/sort change
  useEffect(() => {
    setPageIndex(0);
  }, [filterYear, filterCategory, search, filterFrom, filterTo, sortKey, sortDir]);

  const paginated = useMemo(() => {
    return filtered.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
  }, [filtered, pageIndex]);

  const stats = useMemo(() => {
    const ytd = expenses.filter((e) => new Date(e.date).getFullYear() === currentYear);
    const total = ytd.reduce((s, e) => s + e.amount, 0);
    const deductible = ytd.filter((e) => e.isTaxDeductible).reduce((s, e) => s + e.amount, 0);
    const byCategory = CATEGORIES.map((cat) => ({
      ...cat,
      total: ytd.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
    })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
    return { total, deductible, byCategory };
  }, [expenses, currentYear]);

  const handleCreate = async () => {
    if (!fAmount || !fDescription) return;
    setIsCreating(true);
    try {
      const recurringId = fRecurring ? `rec_exp_${Date.now()}` : undefined;
      const expense = await createExpense({
        userId: user?.id ?? "user_mock_001",
        date: fDate,
        amount: parseFloat(fAmount),
        currency: (user?.currency ?? "EUR") as Currency,
        category: fCategory,
        description: fDescription,
        vendor: fVendor || undefined,
        isTaxDeductible: fDeductible,
        isRecurring: fRecurring || undefined,
        recurringId,
      });
      setExpenses((prev) => [expense, ...prev]);
      setCreateOpen(false);
      setFDate(dayjs().format("YYYY-MM-DD"));
      setFAmount(""); setFDescription(""); setFVendor("");
      setFCategory("software"); setFDeductible(true); setFRecurring(false);
      toast("Expense added");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast("Expense deleted");
    } finally {
      setDeletingId(null);
    }
  };

  const currency = user?.currency ?? "EUR";

  // Monthly overhead configured in the user's profile (set during onboarding / settings)
  const profileExpenses = user?.monthlyExpenses ?? { rent: 0, subscriptions: 0, other: 0 };
  const profileMonthlyTotal =
    (profileExpenses.rent ?? 0) +
    (profileExpenses.subscriptions ?? 0) +
    (profileExpenses.other ?? 0);

  // When no transactions have been tracked yet, fall back to the profile estimate
  const hasTracked = stats.total > 0;
  const displayTotal        = hasTracked ? stats.total : profileMonthlyTotal * (new Date().getMonth() + 1);
  const displayDeductible   = hasTracked ? stats.deductible : profileExpenses.subscriptions + profileExpenses.other;
  const displayAvgPerMonth  = hasTracked
    ? stats.total / Math.max(new Date().getMonth() + 1, 1)
    : profileMonthlyTotal;

  const inputClass = "h-9 text-sm";
  const labelClass = "text-xs font-medium";

  return (
    <AppShell title="Expenses">
      <div className="p-5 lg:p-6 space-y-5">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search description or vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-3 rounded-lg text-sm border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
            />
          </div>
          <span className="text-sm text-slate-500 flex-shrink-0">{filtered.length} expenses</span>
          <Button
            onClick={() => exportExpensesCSV(filtered)}
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
            Add Expense
          </Button>
        </div>

        {/* Stats */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                label={hasTracked ? "Total expenses (YTD)" : "Estimated total (YTD)"}
                value={formatCurrency(displayTotal, currency)}
                sub={hasTracked ? `${currentYear} tracked` : "Based on monthly overhead"}
              />
              <StatTile
                label={hasTracked ? "Tax-deductible" : "Est. deductible"}
                value={formatCurrency(displayDeductible, currency)}
                sub="Lowers your tax bill"
              />
              {hasTracked && stats.byCategory[0] && (
                <StatTile
                  label="Largest category"
                  value={formatCurrency(stats.byCategory[0].total, currency)}
                  sub={`${stats.byCategory[0].emoji} ${stats.byCategory[0].label}`}
                />
              )}
              <StatTile
                label={hasTracked ? "Avg per month" : "Monthly overhead"}
                value={formatCurrency(displayAvgPerMonth, currency)}
                sub={hasTracked ? "Monthly average" : "Configured in settings"}
              />
            </div>

            {/* Monthly overhead card — shows profile-configured values */}
            {profileMonthlyTotal > 0 && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Monthly overhead
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configured in your profile · used for safe-to-spend calculation
                    </p>
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(profileMonthlyTotal, currency)}/mo
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "🏠 Rent / Office", value: profileExpenses.rent ?? 0 },
                    { label: "🔁 Subscriptions", value: profileExpenses.subscriptions ?? 0 },
                    { label: "📦 Other", value: profileExpenses.other ?? 0 },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg px-3 py-2"
                      style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border-col)" }}
                    >
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-semibold">{formatCurrency(value, currency)}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">per month</p>
                    </div>
                  ))}
                </div>
                {!hasTracked && (
                  <p className="text-xs text-slate-500">
                    No transactions tracked yet. Add your first expense above to start tracking actuals.
                    <a href="/settings" className="ml-1 text-slate-400 underline underline-offset-2">Edit monthly overhead →</a>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Subscription tracker */}
        {!isLoading && (() => {
          const ytd = expenses.filter((e) => new Date(e.date).getFullYear() === currentYear);
          // Group software + marketing expenses by vendor/description as proxy for subscriptions
          const subCategories = ["software", "marketing"] as const;
          const subExpenses = ytd.filter((e) => subCategories.includes(e.category as typeof subCategories[number]));
          const byVendor: Record<string, { total: number; count: number; category: string }> = {};
          for (const e of subExpenses) {
            const key = e.vendor || e.description;
            if (!byVendor[key]) byVendor[key] = { total: 0, count: 0, category: e.category };
            byVendor[key].total += e.amount;
            byVendor[key].count++;
          }
          const subscriptions = Object.entries(byVendor)
            .filter(([, v]) => v.count >= 2) // recurring = appeared 2+ times
            .sort(([, a], [, b]) => b.total - a.total);
          const monthlyTotal = subscriptions.reduce((s, [, v]) => s + v.total / Math.max(new Date().getMonth() + 1, 1), 0);

          if (subscriptions.length === 0) return null;

          return (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">SaaS Subscriptions</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Monthly avg</p>
                  <p className="text-sm font-bold">{formatCurrency(monthlyTotal, currency)}/mo</p>
                </div>
              </div>

              <div className="space-y-2">
                {subscriptions.map(([vendor, data]) => (
                  <div key={vendor} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[data.category as ExpenseCategory] + "20", color: CATEGORY_COLORS[data.category as ExpenseCategory] }}>
                        {vendor.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm">{vendor}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(data.total / Math.max(new Date().getMonth() + 1, 1), currency)}/mo
                      </p>
                      <p className="text-[10px] text-slate-600">{formatCurrency(data.total, currency)} YTD</p>
                    </div>
                  </div>
                ))}
              </div>

              {monthlyTotal > 150 && (
                <div className="rounded-lg px-3 py-2 flex items-start gap-2"
                  style={{ background: "#f59e0b10", border: "1px solid #f59e0b30" }}>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">
                    You're spending {formatCurrency(monthlyTotal, currency)}/mo on software subscriptions.
                    Review to cut unused tools.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Category breakdown bar */}
        {!isLoading && stats.byCategory.length > 0 && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <p className="text-xs font-medium">Breakdown by category</p>
            <div className="space-y-2">
              {stats.byCategory.map((cat) => {
                const pct = stats.total > 0 ? (cat.total / stats.total) * 100 : 0;
                const color = CATEGORY_COLORS[cat.value as ExpenseCategory];
                return (
                  <div key={cat.value} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-28 flex-shrink-0">
                      {cat.emoji} {cat.label}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-col)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 w-16 text-right flex-shrink-0">
                      {formatCurrency(cat.total, currency)}
                    </span>
                    <span className="text-xs text-slate-500 w-8 text-right flex-shrink-0">
                      {Math.round(pct)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border text-slate-300"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
            >
              {[currentYear, currentYear - 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {/* Date range filters */}
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="auth-input text-xs px-3 py-1.5 rounded-lg border text-slate-300"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
              placeholder="From"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="auth-input text-xs px-3 py-1.5 rounded-lg border text-slate-300"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
              placeholder="To"
            />
          </div>

          {/* Sort pills */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "date" as const, label: "Date" },
                { key: "amount" as const, label: "Amount" },
                { key: "category" as const, label: "Category" },
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory("all")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: filterCategory === "all" ? "#22C55E" : "var(--border-col)",
                color: filterCategory === "all" ? "var(--bg-sidebar)" : "#94a3b8",
              }}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(filterCategory === cat.value ? "all" : cat.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: filterCategory === cat.value ? CATEGORY_COLORS[cat.value] : "var(--border-col)",
                  color: filterCategory === cat.value ? "#fff" : "#94a3b8",
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expense list */}
        {isLoading ? (
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_140px_100px_40px] gap-4 px-5 py-3 border-b" style={{ borderColor: "var(--border-col)" }}>
              <span className="text-xs font-medium text-slate-500">Description</span>
              <span className="text-xs font-medium text-slate-500 hidden sm:block">Category</span>
              <span className="text-xs font-medium text-slate-500 text-right">Amount</span>
              <span />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_140px_100px_40px] gap-4 px-5 py-3.5 items-center" style={{ borderTop: "1px solid var(--border-col)30" }}>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-3 w-24 bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="hidden sm:block h-6 w-20 bg-slate-700 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-slate-700 rounded animate-pulse"></div>
                <div />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingDown className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No expenses found. Add your first expense.</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_140px_100px_40px] gap-4 px-5 py-3 border-b"
              style={{ borderColor: "var(--border-col)" }}>
              <span className="text-xs font-medium text-slate-500">Description</span>
              <span className="text-xs font-medium text-slate-500 hidden sm:block">Category</span>
              <span className="text-xs font-medium text-slate-500 text-right">Amount</span>
              <span />
            </div>
            {paginated.map((expense, idx) => (
              <div
                key={expense.id}
                className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_140px_100px_40px] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
                style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-col)30" }}
              >
                <div>
                  <p className="text-sm font-medium">{expense.description}</p>
                  <p className="text-xs text-slate-500">
                    {dayjs(expense.date).format("MMM D, YYYY")}
                    {expense.vendor && ` · ${expense.vendor}`}
                    {expense.isTaxDeductible && (
                      <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: "#22C55E15", color: "#22C55E" }}>
                        deductible
                      </span>
                    )}
                    {expense.isRecurring && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: "#38bdf820", color: "#38bdf8" }}>
                        <RefreshCw className="h-2.5 w-2.5" /> monthly
                      </span>
                    )}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <CategoryBadge category={expense.category} />
                </div>
                <p className="text-sm font-semibold text-right">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Pagination controls */}
            {filtered.length > ITEMS_PER_PAGE && (
              <div className="px-5 py-3 border-t flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: "var(--border-col)" }}>
                <p className="text-xs text-slate-500">
                  {filtered.length === 0 ? "0 expenses" : `${pageIndex * ITEMS_PER_PAGE + 1}–${Math.min((pageIndex + 1) * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} expense${filtered.length === 1 ? "" : "s"}`}
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

            {/* Footer total */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_140px_100px_40px] gap-4 px-5 py-3 border-t"
              style={{ borderColor: "var(--border-col)" }}>
              <span className="text-xs font-semibold text-slate-400 sm:col-span-2">Total ({filtered.length} items)</span>
              <span className="text-sm font-bold text-right">
                {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0), currency)}
              </span>
              <span />
            </div>
          </div>
        )}
      </div>

      {/* Add expense dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-base">Add Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Date *</Label>
                <Input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className={inputClass}
                  style={{ background: "var(--bg-card)" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                  style={{ background: "var(--bg-card)" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Description *</Label>
              <Input
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                placeholder="Figma Professional subscription"
                className={inputClass}
                style={{ background: "var(--bg-card)" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Vendor</Label>
              <Input
                value={fVendor}
                onChange={(e) => setFVendor(e.target.value)}
                placeholder="Figma"
                className={inputClass}
                style={{ background: "var(--bg-card)" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFCategory(cat.value)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                    style={{
                      background: fCategory === cat.value ? CATEGORY_COLORS[cat.value] : "var(--border-col)",
                      color: fCategory === cat.value ? "#fff" : "#94a3b8",
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={fDeductible}
                onChange={(e) => setFDeductible(e.target.checked)}
                className="w-4 h-4 rounded accent-[#22C55E]"
              />
              <span className="text-sm text-slate-300">Tax-deductible business expense</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={fRecurring}
                onChange={(e) => setFRecurring(e.target.checked)}
                className="w-4 h-4 rounded accent-[#38bdf8]"
              />
              <span className="text-sm text-slate-300">Recurring monthly expense</span>
            </label>
            {fRecurring && (
              <p className="text-xs text-slate-500 -mt-1 flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3" />
                A new entry will be created automatically each month on the same day.
              </p>
            )}

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
                disabled={isCreating || !fAmount || !fDescription}
              >
                {isCreating ? "Saving…" : "Add Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
