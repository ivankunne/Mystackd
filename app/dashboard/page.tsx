"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HeroNumbers } from "@/components/dashboard/HeroNumbers";
import { IncomeChart } from "@/components/dashboard/IncomeChart";
import { SourceBreakdown } from "@/components/dashboard/SourceBreakdown";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { MonthBanner } from "@/components/dashboard/MonthBanner";
import { InlineAddIncome } from "@/components/dashboard/InlineAddIncome";
import { ImportIncomeDialog } from "@/components/dashboard/ImportIncomeDialog";
import { getIncomeEntries } from "@/lib/data/income";
import { processRecurringIncome } from "@/lib/data/recurring";
import { getExpenses } from "@/lib/data/expenses";
import { useAuth } from "@/lib/context/AuthContext";
import { InsightCards } from "@/components/dashboard/InsightCards";
import { ExpenseBreakdown } from "@/components/dashboard/ExpenseBreakdown";
import { ActionCards } from "@/components/dashboard/ActionCards";
import { FinancialHealthDashboard } from "@/components/dashboard/FinancialHealthDashboard";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";
import { BusinessIntelligenceSummary } from "@/components/dashboard/BusinessIntelligenceSummary";
import { getInvoices } from "@/lib/data/invoices";
import { getAcceptedProposals } from "@/lib/data/proposals";
import type { IncomeEntry, Expense, Invoice, Proposal } from "@/lib/mock-data";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: "#e2e8f0", border: "1px solid var(--border-col)" }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-5 lg:p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
      </div>
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-72" />
      <SkeletonCard className="h-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
      <SkeletonCard className="h-80" />
      <SkeletonCard className="h-72" />
    </div>
  );
}


export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    setIsLoading(true);
    const incomePromise = getIncomeEntries(user.id);
    Promise.all([
      incomePromise,
      getExpenses(user.id),
      getInvoices(user.id),
      getAcceptedProposals(user.id),
    ]).then(async ([inc, exp, inv, props]) => {
      if (mounted) {
        // Process recurring income with pre-fetched entries (avoid double-fetch)
        const newRecurring = await processRecurringIncome(inc);
        // Merge any auto-created recurring entries (deduped by id)
        const merged = newRecurring.length > 0
          ? [...newRecurring, ...inc.filter((e) => !newRecurring.some((n) => n.id === e.id))]
          : inc;
        setEntries(merged);
        setExpenses(exp);
        setInvoices(inv);
        setProposals(props);
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to load dashboard data:", error);
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <AppShell title="Dashboard">
      {isLoading ? (
        <LoadingSkeleton />
      ) : entries.length === 0 ? (
        <InlineAddIncome onAdded={(entry) => setEntries((prev) => [entry, ...prev])} />
      ) : (
        <div className="p-5 lg:p-6 space-y-5">
          {/* Contextual banners */}
          <MonthBanner entries={entries} user={user ?? undefined} />

          {/* Import CSV button */}
          <div className="flex justify-end">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-col)",
                color: "var(--text-secondary)",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>
          </div>

          {/* Hero stats */}
          {user && <HeroNumbers user={user} entries={entries} expenses={expenses} />}

          {/* Smart insights */}
          {user && <InsightCards user={user} entries={entries} />}

          {/* Action cards */}
          <ActionCards invoices={invoices} proposals={proposals} expenses={expenses} currency={user?.currency || "EUR"} />

          {/* Income chart */}
          <IncomeChart entries={entries} currency={user?.currency} />

          {/* Financial health */}
          <FinancialHealthDashboard user={user} entries={entries} expenses={expenses} />

          {/* Two-column: Source breakdown + Expense breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SourceBreakdown entries={entries} currency={user?.currency} />
            <ExpenseBreakdown expenses={expenses} currency={user?.currency} />
          </div>

          {/* Income pipeline */}
          <IncomePipeline invoices={invoices} proposals={proposals} entries={entries} currency={user?.currency || "EUR"} />

          {/* Business intelligence */}
          <BusinessIntelligenceSummary entries={entries} expenses={expenses} currency={user?.currency || "EUR"} isPro={user?.isPro} />

          {/* Recent activity: combined income + expenses */}
          <RecentTransactions entries={entries} expenses={expenses} limit={12} />
        </div>
      )}
      <ImportIncomeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(newEntries) => {
          setEntries((prev) => {
            const ids = new Set(prev.map((e) => e.id));
            return [...newEntries.filter((e) => !ids.has(e.id)), ...prev];
          });
        }}
      />
    </AppShell>
  );
}
