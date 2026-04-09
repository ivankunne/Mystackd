"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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

interface IncomeChartProps {
  entries: IncomeEntry[];
  currency?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
  currency?: string;
}

function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/[\d,.\s]/g, "")
      .trim() || currency
  );
}

function CustomTooltip({ active, payload, label, currency = "EUR" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
      }}
    >
      <p className="font-semibold mb-2 text-xs" style={{ color: "#0f172a" }}>{label}</p>
      {payload.map((p) =>
        p.value > 0 ? (
          <div key={p.name} className="flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            <span className="capitalize">{p.name}:</span>
            <span className="font-semibold ml-auto pl-4" style={{ color: "#0f172a" }}>
              {formatCurrency(p.value, currency)}
            </span>
          </div>
        ) : null
      )}
      <div
        className="mt-2 pt-2 border-t text-xs font-semibold flex justify-between"
        style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
      >
        <span>Total</span>
        <span>{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}

export function IncomeChart({ entries, currency = "EUR" }: IncomeChartProps) {
  const { chartData, sources, thisMonth, lastMonth } = useMemo(() => {
    const now = dayjs();
    const months = Array.from({ length: 6 }, (_, i) =>
      now.subtract(5 - i, "month")
    );

    const sources = Array.from(new Set(entries.map((e) => e.source)));

    const chartData = months.map((m) => {
      const monthEntries = entries.filter(
        (e) =>
          dayjs(e.date).month() === m.month() &&
          dayjs(e.date).year() === m.year()
      );
      const row: Record<string, string | number> = { month: m.format("MMM") };
      for (const src of sources) {
        row[src] = monthEntries
          .filter((e) => e.source === src)
          .reduce((s, e) => s + e.amount, 0);
      }
      return row;
    });

    const thisMonthEntries = entries.filter(
      (e) =>
        dayjs(e.date).month() === now.month() &&
        dayjs(e.date).year() === now.year()
    );
    const lastMonthEntries = entries.filter(
      (e) =>
        dayjs(e.date).month() === now.subtract(1, "month").month() &&
        dayjs(e.date).year() === now.subtract(1, "month").year()
    );

    return {
      chartData,
      sources,
      thisMonth: thisMonthEntries.reduce((s, e) => s + e.amount, 0),
      lastMonth: lastMonthEntries.reduce((s, e) => s + e.amount, 0),
    };
  }, [entries]);

  const delta = thisMonth - lastMonth;
  const deltaPositive = delta >= 0;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Income Overview
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Last 6 months by source
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          barSize={14}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v) => {
              const sym = getCurrencySymbol(currency);
              return v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}k` : `${sym}${v}`;
            }}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "#0f172a08" }} />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: "11px", color: "#64748b", paddingTop: "12px" }}
            formatter={(value) => SOURCE_LABELS[value] ?? value}
          />
          {sources.map((src) => (
            <Bar
              key={src}
              dataKey={src}
              stackId="a"
              fill={SOURCE_COLORS[src] ?? "#94a3b8"}
              radius={sources.indexOf(src) === sources.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary row */}
      <div
        className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-sm"
        style={{ borderColor: "var(--border-col)" }}
      >
        <div>
          <span style={{ color: "var(--text-muted)" }}>This month: </span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatCurrency(thisMonth, currency)}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Last month: </span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatCurrency(lastMonth, currency)}
          </span>
        </div>
        {lastMonth > 0 && (
          <div
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: deltaPositive ? "#dcfce7" : "#fee2e2",
              color:      deltaPositive ? "#16a34a" : "#dc2626",
            }}
          >
            {deltaPositive ? "+" : ""}
            {formatCurrency(delta, currency)}
          </div>
        )}
      </div>
    </div>
  );
}
