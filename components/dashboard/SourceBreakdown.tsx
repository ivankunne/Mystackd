"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import type { IncomeEntry } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/calculations";

const SOURCE_COLORS: Record<string, string> = {
  stripe: "#635BFF",
  paypal: "#0070E0",
  upwork: "#14A800",
  fiverr: "#1DBF73",
  manual: "#94a3b8",
};

const SOURCE_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  upwork: "Upwork",
  fiverr: "Fiverr",
  manual: "Manual",
};

interface SourceBreakdownProps {
  entries: IncomeEntry[];
  currency?: string;
}

export function SourceBreakdown({ entries, currency = "EUR" }: SourceBreakdownProps) {
  const now = dayjs();
  const currentYear = now.year();
  const currentMonth = now.month();

  const breakdown = useMemo(() => {
    const sources = Array.from(new Set(entries.map((e) => e.source)));

    return sources
      .map((source) => {
        const sourceEntries = entries.filter((e) => e.source === source);

        const thisMonth = sourceEntries
          .filter(
            (e) =>
              dayjs(e.date).month() === currentMonth &&
              dayjs(e.date).year() === currentYear
          )
          .reduce((s, e) => s + e.amount, 0);

        const ytd = sourceEntries
          .filter((e) => dayjs(e.date).year() === currentYear)
          .reduce((s, e) => s + e.amount, 0);

        return { source, thisMonth, ytd };
      })
      .sort((a, b) => b.ytd - a.ytd);
  }, [entries, currentYear, currentMonth]);

  const totalYtd = breakdown.reduce((s, b) => s + b.ytd, 0);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Source Breakdown
      </h3>

      <div className="space-y-4">
        {breakdown.map(({ source, thisMonth, ytd }) => {
          const pct = totalYtd > 0 ? (ytd / totalYtd) * 100 : 0;
          const color = SOURCE_COLORS[source] ?? "#94a3b8";

          return (
            <div key={source}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-sm flex-1 font-medium" style={{ color: "var(--text-secondary)" }}>
                  {SOURCE_LABELS[source] ?? source}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(ytd, currency)}
                  </span>
                  <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>YTD</span>
                </div>
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {pct.toFixed(0)}% of total
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatCurrency(thisMonth, currency)} this month
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {breakdown.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          No income data yet
        </p>
      )}
    </div>
  );
}
