"use client";

import { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { getNextTaxDeadline } from "@/lib/tax-calendar";
import { getNotifPrefs } from "@/lib/data/notification-prefs";
import type { IncomeEntry, User } from "@/lib/mock-data";

interface MonthBannerProps {
  entries: IncomeEntry[];
  user?: User;
}

const DISMISSED_KEY = "mystackd_record_month_dismissed";

type BannerType = "record" | "no-income" | "tax-soon" | "gap" | null;

export function MonthBanner({ entries, user }: MonthBannerProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [recordDismissed, setRecordDismissed] = useState(false);
  const [taxDismissed, setTaxDismissed] = useState(false);
  const [bannersEnabled, setBannersEnabled] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "true") setRecordDismissed(true);
      if (localStorage.getItem(`${DISMISSED_KEY}_tax`) === "true") setTaxDismissed(true);
    } catch { /* ignore */ }
    // treat undefined (old rows without the field) as true
    getNotifPrefs().then((p) => setBannersEnabled(p.dashboardBanners !== false)).catch(() => {});
  }, []);

  const dismiss = (type: "record" | "tax") => {
    try {
      const key = type === "record" ? DISMISSED_KEY : `${DISMISSED_KEY}_tax`;
      localStorage.setItem(key, "true");
    } catch { /* ignore */ }
    if (type === "record") setRecordDismissed(true);
    else setTaxDismissed(true);
  };

  const currentMonthTotal = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [entries, currentMonth, currentYear]);

  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      totals[key] = (totals[key] ?? 0) + e.amount;
    });
    return totals;
  }, [entries]);

  const daysSinceLastEntry = useMemo(() => {
    if (entries.length === 0) return null;
    const latest = entries
      .map((e) => new Date(e.date).getTime())
      .sort((a, b) => b - a)[0];
    return Math.floor((now.getTime() - latest) / 86_400_000);
  }, [entries, now]);

  const nextDeadline = useMemo(
    () => (user ? getNextTaxDeadline(user.country) : null),
    [user]
  );
  const daysUntilTax = nextDeadline
    ? Math.ceil(
        (new Date(nextDeadline.dueDate).getTime() - now.getTime()) / 86_400_000
      )
    : null;

  const maxMonthTotal = Math.max(...Object.values(monthlyTotals), 0);
  const isRecordMonth =
    currentMonthTotal > 0 &&
    currentMonthTotal >= maxMonthTotal &&
    Object.keys(monthlyTotals).length > 1;

  const bannerType = useMemo((): BannerType => {
    if (entries.length === 0 || currentMonthTotal === 0) return "no-income";
    if (daysUntilTax !== null && daysUntilTax >= 0 && daysUntilTax <= 14 && !taxDismissed)
      return "tax-soon";
    if (daysSinceLastEntry !== null && daysSinceLastEntry >= 10) return "gap";
    if (isRecordMonth && !recordDismissed) return "record";
    return null;
  }, [entries, currentMonthTotal, daysUntilTax, taxDismissed, daysSinceLastEntry, isRecordMonth, recordDismissed]);

  if (!bannersEnabled) return null;

  if (bannerType === "no-income") {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 banner-warning">
        <span className="text-lg">💡</span>
        <p className="text-sm flex-1 banner-warning-text">
          You haven&apos;t logged any income this month yet.{" "}
          <a href="/connections" className="underline underline-offset-2 font-medium">
            Add your first entry →
          </a>
        </p>
      </div>
    );
  }

  if (bannerType === "tax-soon" && nextDeadline && daysUntilTax !== null) {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 banner-info">
        <span className="text-lg">{daysUntilTax <= 7 ? "🚨" : "⚠️"}</span>
        <p className="text-sm flex-1 banner-info-text">
          <span className="font-semibold">
            {nextDeadline.label} tax payment due in {daysUntilTax} day{daysUntilTax !== 1 ? "s" : ""}
          </span>{" "}
          — check your estimated amount in the{" "}
          <a href="/tax" className="underline underline-offset-2 font-medium">
            tax calendar
          </a>
          .
        </p>
        <button
          onClick={() => dismiss("tax")}
          className="banner-dismiss flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (bannerType === "gap" && daysSinceLastEntry !== null) {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 banner-warning">
        <span className="text-lg">🔔</span>
        <p className="text-sm flex-1 banner-warning-text">
          <span className="font-semibold">No income logged in {daysSinceLastEntry} days.</span>{" "}
          Missing entries will skew your tax estimate and safe-to-spend.{" "}
          <a href="/connections" className="underline underline-offset-2 font-medium">
            Add now →
          </a>
        </p>
      </div>
    );
  }

  if (bannerType === "record") {
    const currency = user?.currency ?? "EUR";
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 banner-success">
        <span className="text-lg">🎉</span>
        <p className="text-sm flex-1 banner-success-text">
          <span className="font-semibold">Your biggest month ever!</span> You&apos;ve earned{" "}
          {formatCurrency(currentMonthTotal, currency)} this month — a new record.
        </p>
        <button
          onClick={() => dismiss("record")}
          className="banner-dismiss flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
