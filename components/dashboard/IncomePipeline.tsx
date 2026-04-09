"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import type { Invoice, Proposal, IncomeEntry } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/calculations";

interface IncomePipelineProps {
  invoices: Invoice[];
  proposals: Proposal[];
  entries: IncomeEntry[];
  currency: string;
}

const SOURCE_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  upwork: "Upwork",
  fiverr: "Fiverr",
  manual: "Manual",
};

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

function CustomTooltip({
  active,
  payload,
  label,
  currency = "EUR",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
      }}
    >
      <p className="font-semibold text-xs" style={{ color: "#0f172a" }}>
        {label}
      </p>
      {payload[0] && (
        <p className="font-semibold mt-1" style={{ color: "#0f172a" }}>
          {formatCurrency(payload[0].value, currency)}
        </p>
      )}
    </div>
  );
}

export function IncomePipeline({
  invoices,
  proposals,
  entries,
  currency,
}: IncomePipelineProps) {
  const {
    expectedIncome30d,
    winRate,
    avgDealSize,
    chartData,
  } = useMemo(() => {
    const today = dayjs();
    const in30Days = today.add(30, "day");

    // 30-day expected income: sent invoices due + unconverted accepted proposals
    const sentInvoicesDue = invoices
      .filter(
        (i) =>
          i.status === "sent" &&
          dayjs(i.dueDate).isAfter(today) &&
          dayjs(i.dueDate).isBefore(in30Days.add(1, "day"))
      )
      .reduce((s, i) => s + i.total, 0);

    const unconvertedProposals = proposals
      .filter((p) => p.status === "accepted" && !p.convertedToInvoiceId)
      .reduce((s, p) => s + p.total, 0);

    const expectedIncome30d = sentInvoicesDue + unconvertedProposals;

    // Win rate: accepted / (accepted + declined)
    const acceptedCount = proposals.filter((p) => p.status === "accepted").length;
    const declinedCount = proposals.filter((p) => p.status === "declined").length;
    const totalProposals = acceptedCount + declinedCount;
    const winRate =
      totalProposals > 0 ? ((acceptedCount / totalProposals) * 100).toFixed(0) : 0;

    // Average deal size: paid invoices total / count
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalPaid = paidInvoices.reduce((s, i) => s + i.total, 0);
    const avgDealSize =
      paidInvoices.length > 0 ? totalPaid / paidInvoices.length : 0;

    // Revenue by source (YTD)
    const yearStart = dayjs().startOf("year");
    const sourceRevenue: Record<string, number> = {};
    entries.forEach((e) => {
      if (dayjs(e.date).isAfter(yearStart)) {
        sourceRevenue[e.source] =
          (sourceRevenue[e.source] ?? 0) +
          (e.amountInHomeCurrency ?? e.amount);
      }
    });

    // Filter to only sources with > 0 YTD income
    const chartData = Object.entries(sourceRevenue)
      .filter(([, amount]) => amount > 0)
      .map(([source, amount]) => ({
        name: SOURCE_LABELS[source] ?? source,
        value: amount,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      expectedIncome30d,
      winRate,
      avgDealSize,
      chartData,
    };
  }, [invoices, proposals, entries]);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Income Pipeline
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          30-day outlook & conversion metrics
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Expected (30d)
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: "#22C55E" }}>
            {formatCurrency(expectedIncome30d, currency)}
          </p>
        </div>

        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Win rate
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: "#3B82F6" }}>
            {winRate}%
          </p>
        </div>

        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Avg deal size
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: "#8B5CF6" }}>
            {formatCurrency(avgDealSize, currency)}
          </p>
        </div>
      </div>

      {/* Horizontal bar chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 40)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 70, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => {
                const sym = getCurrencySymbol(currency);
                return v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}k` : `${sym}${v}`;
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              width={70}
            />
            <Tooltip
              content={<CustomTooltip currency={currency} />}
              cursor={{ fill: "#0f172a08" }}
            />
            <Bar
              dataKey="value"
              fill="#635BFF"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: "var(--bg-page)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>No income sources yet</p>
        </div>
      )}
    </div>
  );
}
