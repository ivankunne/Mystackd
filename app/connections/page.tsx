"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
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

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getConnections(user?.id), getIncomeEntries(user?.id)]).then(
      ([conns, entries]) => {
        if (mounted) {
          setConnections(conns);
          setManualEntries(entries.filter((e) => e.source === "manual"));
          setIsLoading(false);
        }
      }
    );
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
      <div className="p-5 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Income Sources</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Connect your platforms or add income manually
            </p>
          </div>
          <AddIncomeModal onAdded={handleEntryAdded} />
        </div>

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
