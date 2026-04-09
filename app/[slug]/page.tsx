"use client";

// Public freelancer earnings page — /[slug]
// All named routes (dashboard, login, etc.) take precedence over this catch-all.
// Fetches profile by public_page_slug from Supabase (no auth required).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getIncomeEntries } from "@/lib/data/income";
import { formatCurrency } from "@/lib/calculations";
import { PublicEarningsChart } from "./PublicEarningsChart";
import type { User, IncomeEntry } from "@/lib/mock-data";

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-page)" }}>
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-slate-700">404</p>
        <h1 className="text-xl font-semibold text-white">Page not found</h1>
        <p className="text-sm text-slate-400">This page is private or doesn&apos;t exist.</p>
        <Link href="/" className="inline-block text-sm font-medium mt-4 hover:opacity-80 transition-opacity" style={{ color: "#22C55E" }}>
          Go home →
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "ready"; user: User; entries: IncomeEntry[] };

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("public_page_slug", slug)
      .eq("public_page_enabled", true)
      .single()
      .then(async ({ data }) => {
        if (!data) { setState({ status: "not-found" }); return; }
        // Only map fields safe to expose publicly — never include email, referralCode,
        // taxBracket, monthlyExpenses, or payment details.
        const profile: User = {
          id: data.id,
          name: data.name,
          email: "",                                          // never expose on public page
          currency: data.currency,
          country: data.country,
          isPro: data.is_pro,
          emailVerified: false,                              // not relevant for public display
          taxBracket: 0,                                     // not exposed publicly
          monthlyExpenses: { rent: 0, subscriptions: 0, other: 0 }, // not exposed publicly
          publicPageEnabled: data.public_page_enabled,
          publicPageSlug: data.public_page_slug,
        };
        const entries = await getIncomeEntries(data.id);
        setState({ status: "ready", user: profile, entries });
      });
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (state.status === "not-found") return <NotFound />;

  const { user, entries } = state;
  const currentYear = new Date().getFullYear();
  const yearEntries = entries.filter((e) => new Date(e.date).getFullYear() === currentYear);
  const totalEarned = yearEntries.reduce((sum, e) => sum + e.amount, 0);
  const uniqueSources = new Set(entries.map((e) => e.source)).size;

  // "Active since" — oldest entry date, fallback to current year
  const oldestEntry = entries.reduce<IncomeEntry | null>(
    (oldest, e) => (!oldest || e.date < oldest.date ? e : oldest),
    null,
  );
  const activeSince = oldestEntry
    ? new Date(oldestEntry.date).toLocaleString("default", { month: "short", year: "numeric" })
    : String(currentYear);

  // Monthly totals for chart
  const monthlyData: Record<string, number> = {};
  yearEntries.forEach((e) => {
    const month = e.date.slice(0, 7);
    monthlyData[month] = (monthlyData[month] ?? 0) + e.amount;
  });
  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: new Date(month + "-01").toLocaleString("default", { month: "short" }),
      total,
    }));

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const stats = [
    { label: "Total earned this year", value: formatCurrency(totalEarned, user.currency) },
    { label: "Active since",           value: activeSince },
    { label: "Income sources",         value: String(uniqueSources) },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto"
            style={{ background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E30" }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-sm text-slate-400 mt-1">Freelance Income Report — {currentYear}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="rounded-xl p-5 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-2xl font-bold" style={{ color: "#22C55E" }}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Monthly chart */}
        {chartData.length > 0 ? (
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <h2 className="text-sm font-semibold text-white mb-4">Monthly earnings — {currentYear}</h2>
            <PublicEarningsChart data={chartData} currency={user.currency} />
          </div>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <p className="text-sm text-slate-500">No income recorded for {currentYear} yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pb-4">
          <p className="text-xs text-slate-600">
            Powered by{" "}
            <Link href="/" className="hover:text-slate-400 transition-colors">MyStackd</Link>
          </p>
          <Link href="/signup" className="inline-block text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: "#22C55E" }}>
            Make your own earnings page →
          </Link>
        </div>
      </div>
    </div>
  );
}
