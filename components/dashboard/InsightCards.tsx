"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { getNextTaxDeadline } from "@/lib/tax-calendar";
import type { IncomeEntry, User } from "@/lib/mock-data";

interface InsightCardsProps {
  user: User;
  entries: IncomeEntry[];
}

interface Insight {
  id: string;
  emoji: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  accent: string; // border/glow color
  priority: number; // lower = shown first
}

// ─── Day-of-year helpers ──────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

// ─── Insight generators ───────────────────────────────────────────────────────

export function InsightCards({ user, entries }: InsightCardsProps) {
  const insights = useMemo<Insight[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const result: Insight[] = [];

    // ── 1. Tax deadline countdown ────────────────────────────────────────────
    const nextDeadline = getNextTaxDeadline(user.country);
    if (nextDeadline) {
      const daysLeft = daysUntil(nextDeadline.dueDate);
      if (daysLeft >= 0 && daysLeft <= 45) {
        const urgency = daysLeft <= 7 ? "🚨" : daysLeft <= 21 ? "⚠️" : "📅";
        result.push({
          id: "tax-deadline",
          emoji: urgency,
          title: `${nextDeadline.label} tax payment in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          body:
            daysLeft <= 7
              ? "This is urgent — review your tax estimate and arrange payment now."
              : `Your next estimated tax payment is due ${nextDeadline.dueDate}. Make sure you have the right amount set aside.`,
          cta: { label: "View tax calendar", href: "/tax" },
          accent: daysLeft <= 7 ? "#ef4444" : daysLeft <= 21 ? "#f59e0b" : "#635BFF",
          priority: daysLeft <= 7 ? 0 : daysLeft <= 21 ? 1 : 5,
        });
      }
    }

    // ── 2. Income gap / logging nudge ────────────────────────────────────────
    if (entries.length > 0) {
      const sortedDates = [...entries]
        .map((e) => new Date(e.date))
        .sort((a, b) => b.getTime() - a.getTime());
      const lastEntry = sortedDates[0];
      const gapDays = daysBetween(lastEntry, now);

      if (gapDays >= 7) {
        result.push({
          id: "income-gap",
          emoji: "💭",
          title: `No income logged in ${gapDays} days`,
          body: `Your last entry was ${gapDays} days ago. If you've earned since then, adding it keeps your tax estimate and safe-to-spend accurate.`,
          cta: { label: "Add income", href: "/connections" },
          accent: "#f59e0b",
          priority: gapDays >= 14 ? 2 : 6,
        });
      }
    }

    // ── 3. Month-over-month pace ─────────────────────────────────────────────
    const thisMonthEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const thisMonthTotal = thisMonthEntries.reduce((s, e) => s + e.amount, 0);

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthTotal = entries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
      })
      .reduce((s, e) => s + e.amount, 0);

    // Compare pace: current month's total vs where last month was at this day
    const dayOfMonth = now.getDate();
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
    const prevMonthPaceAdjusted =
      daysInPrevMonth > 0
        ? (prevMonthTotal / daysInPrevMonth) * dayOfMonth
        : prevMonthTotal;

    if (prevMonthPaceAdjusted > 0 && thisMonthTotal > 0) {
      const pacePct = Math.round(
        ((thisMonthTotal - prevMonthPaceAdjusted) / prevMonthPaceAdjusted) * 100
      );
      if (pacePct >= 15) {
        result.push({
          id: "pace-ahead",
          emoji: "🚀",
          title: `You're ${pacePct}% ahead of last month's pace`,
          body: `By day ${dayOfMonth} last month you'd earned ${formatCurrency(Math.round(prevMonthPaceAdjusted), user.currency)}. You're at ${formatCurrency(thisMonthTotal, user.currency)} — keep going.`,
          accent: "#22C55E",
          priority: 4,
        });
      } else if (pacePct <= -20) {
        result.push({
          id: "pace-behind",
          emoji: "📉",
          title: `${Math.abs(pacePct)}% behind last month's pace`,
          body: `At this point last month you had ${formatCurrency(Math.round(prevMonthPaceAdjusted), user.currency)}. You're at ${formatCurrency(thisMonthTotal, user.currency)} — still time to catch up.`,
          accent: "#f59e0b",
          priority: 3,
        });
      }
    }

    // ── 4. Top source insight ────────────────────────────────────────────────
    if (thisMonthEntries.length > 0) {
      const sourceMap: Record<string, number> = {};
      thisMonthEntries.forEach((e) => {
        sourceMap[e.source] = (sourceMap[e.source] ?? 0) + e.amount;
      });
      const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0];
      if (topSource && thisMonthTotal > 0) {
        const pct = Math.round((topSource[1] / thisMonthTotal) * 100);
        if (pct >= 60) {
          result.push({
            id: "source-concentration",
            emoji: "🔍",
            title: `${pct}% of this month's income is from ${topSource[0]}`,
            body: `High concentration on a single platform is a risk. Consider diversifying income sources or creating a backup channel.`,
            accent: "#635BFF",
            priority: 8,
          });
        } else {
          result.push({
            id: "top-source",
            emoji: "💳",
            title: `${topSource[0]} is your top source this month`,
            body: `${formatCurrency(topSource[1], user.currency)} (${pct}% of this month's total) has come from ${topSource[0]}.`,
            accent: "#1DBF73",
            priority: 9,
          });
        }
      }
    }

    // ── 5. Annual goal pace ──────────────────────────────────────────────────
    if (user.incomeGoal) {
      const ytdTotal = entries
        .filter((e) => new Date(e.date).getFullYear() === currentYear)
        .reduce((s, e) => s + e.amount, 0);
      const monthsElapsed = currentMonth + 1;
      const projectedAnnual =
        monthsElapsed > 0 ? (ytdTotal / monthsElapsed) * 12 : 0;
      const goalPct = Math.round((ytdTotal / user.incomeGoal) * 100);

      if (projectedAnnual >= user.incomeGoal * 1.1) {
        result.push({
          id: "goal-beat",
          emoji: "🏆",
          title: `On pace to beat your ${formatCurrency(user.incomeGoal, user.currency)} goal`,
          body: `At your current rate you'll reach ${formatCurrency(Math.round(projectedAnnual), user.currency)} by year end — ${Math.round(((projectedAnnual - user.incomeGoal) / user.incomeGoal) * 100)}% above target.`,
          accent: "#22C55E",
          priority: 7,
        });
      } else if (goalPct >= 50 && goalPct < 100) {
        result.push({
          id: "goal-halfway",
          emoji: "🎯",
          title: `${goalPct}% to your annual goal`,
          body: `You need ${formatCurrency(user.incomeGoal - ytdTotal, user.currency)} more to hit your ${formatCurrency(user.incomeGoal, user.currency)} target — that's ${formatCurrency(Math.round((user.incomeGoal - ytdTotal) / Math.max(1, 12 - monthsElapsed)), user.currency)}/month from here.`,
          cta: { label: "Adjust goal", href: "/settings#goals" },
          accent: "#635BFF",
          priority: 7,
        });
      }
    }

    // ── 6. Best month streak / record potential ──────────────────────────────
    const monthTotals: Record<string, number> = {};
    entries.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthTotals[key] = (monthTotals[key] ?? 0) + e.amount;
    });
    const currentKey = `${currentYear}-${currentMonth}`;
    const previousMonthMaxes = Object.entries(monthTotals)
      .filter(([k]) => k !== currentKey)
      .map(([, v]) => v);
    const allTimeMax = Math.max(...previousMonthMaxes, 0);

    if (
      thisMonthTotal > 0 &&
      allTimeMax > 0 &&
      thisMonthTotal >= allTimeMax * 0.85 &&
      thisMonthTotal < allTimeMax
    ) {
      const needed = allTimeMax - thisMonthTotal;
      result.push({
        id: "record-within-reach",
        emoji: "⚡",
        title: "Record month within reach",
        body: `You're just ${formatCurrency(needed, user.currency)} away from your best month ever (${formatCurrency(allTimeMax, user.currency)}). You've got ${new Date(currentYear, currentMonth + 1, 0).getDate() - new Date().getDate()} days left this month.`,
        accent: "#f59e0b",
        priority: 3,
      });
    }

    // Sort by priority and return top 3
    return result.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [entries, user]);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{
            background: "var(--bg-card)",
            borderTop: "1px solid var(--border-col)",
            borderRight: "1px solid var(--border-col)",
            borderBottom: "1px solid var(--border-col)",
            borderLeft: `3px solid ${insight.accent}`,
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">{insight.emoji}</span>
            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{insight.title}</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insight.body}</p>
          {insight.cta && (
            <Link
              href={insight.cta.href}
              className="inline-flex items-center gap-1 text-xs font-medium mt-1 transition-opacity hover:opacity-70"
              style={{ color: insight.accent }}
            >
              {insight.cta.label} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
