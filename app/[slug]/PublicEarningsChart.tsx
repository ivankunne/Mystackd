"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PublicEarningsChartProps {
  data: { month: string; total: number }[];
  currency?: string;
}

const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", NOK: "kr", SEK: "kr", DKK: "kr", CHF: "Fr", AUD: "A$", CAD: "C$", JPY: "¥", SGD: "S$" };

export function PublicEarningsChart({ data, currency = "EUR" }: PublicEarningsChartProps) {
  const sym = SYMBOLS[currency] ?? currency;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-col)",
            borderRadius: "8px",
            padding: "8px 12px",
          }}
          labelStyle={{ color: "#94a3b8", fontSize: 12 }}
          formatter={(value) => [`${sym}${Number(value).toLocaleString()}`, "Total"]}
        />
        <Bar dataKey="total" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
