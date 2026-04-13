"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProGateModal } from "@/components/ui/pro-gate-modal";
import { SourceCard } from "@/components/connections/SourceCard";
import { AddIncomeModal } from "@/components/connections/AddIncomeModal";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { getConnections } from "@/lib/data/connections";
import { getIncomeEntries } from "@/lib/data/income";
import type { Connection, IncomeEntry } from "@/lib/mock-data";
import { useAuth } from "@/lib/context/AuthContext";

export default function ConnectionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [manualEntries, setManualEntries] = useState<IncomeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProModal, setShowProModal] = useState(false);

  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const canAddConnection = user?.isPro || connectedCount < 1;

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    Promise.all([getConnections(user.id), getIncomeEntries(user.id)])
      .then(([conns, entries]) => {
        if (mounted) {
          setConnections(conns);
          setManualEntries(entries.filter((e) => e.source === "manual"));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading connections:", err);
        if (mounted) {
          setConnections([]);
          setManualEntries([]);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleConnectionUpdate = (updated: Connection) => {
    setConnections((prev) =>
      prev.map((c) => (c.source === updated.source ? updated : c))
    );
  };

  const handleEntryAdded = (entry: IncomeEntry) => {
    if (entry.source === "manual") {
      setManualEntries((prev) => [entry, ...prev]);
    }
  };

  return (
    <AppShell title="Connections">
      <ProGateModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="Multiple Income Connections"
        description="Connect unlimited income sources including Stripe, PayPal, Upwork, and Fiverr. Sync earnings automatically and keep all income in one place."
      />
      <div className="p-5 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Income Sources</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Connect your platforms or add income manually
            </p>
          </div>
          {canAddConnection ? (
            <AddIncomeModal onAdded={handleEntryAdded} />
          ) : (
            <button
              onClick={() => setShowProModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-opacity hover:opacity-80"
              style={{ background: "#fbbf2420", color: "#fbbf24", border: "1px solid #fbbf2430" }}
            >
              <Lock className="h-4 w-4" />
              Add another source
            </button>
          )}
        </div>

        {/* Connection limit notice for free users */}
        {!user?.isPro && connectedCount > 0 && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "#fbbf2415", border: "1px solid #fbbf2430" }}
          >
            <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>Free plan limited to 1 connection</p>
              <p className="text-xs text-slate-400 mt-0.5">Upgrade to Pro to connect unlimited income sources from Stripe, PayPal, Upwork, Fiverr, and more.</p>
            </div>
          </div>
        )}

        {/* Source cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl h-40 animate-pulse"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn) => (
              <SourceCard
                key={conn.source}
                connection={conn}
                onUpdate={handleConnectionUpdate}
              />
            ))}
          </div>
        )}

        {/* Manual entries */}
        {manualEntries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Recent Manual Entries
            </h3>
            <RecentTransactions
              entries={manualEntries}
              limit={8}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
