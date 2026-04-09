"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  Bell, X, AlertTriangle, Calendar, FileText, CheckCircle,
} from "lucide-react";
import { getInvoices } from "@/lib/data/invoices";
import { getTaxPeriods, getNextTaxDeadline } from "@/lib/tax-calendar";
import { useAuth } from "@/lib/context/AuthContext";

interface Notification {
  id: string;
  kind: "overdue" | "tax" | "upcoming" | "info";
  title: string;
  body: string;
  href?: string;
  date: string;
}

const KIND_COLORS: Record<Notification["kind"], { icon: React.ElementType; color: string; bg: string }> = {
  overdue:  { icon: AlertTriangle, color: "#f87171", bg: "#ef444415" },
  tax:      { icon: Calendar,      color: "#f59e0b", bg: "#f59e0b15" },
  upcoming: { icon: FileText,      color: "#60a5fa", bg: "#3b82f615" },
  info:     { icon: CheckCircle,   color: "#22C55E", bg: "#22C55E15" },
};

export function NotificationCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const buildNotifications = useCallback(async () => {
    if (!user) return;
    const notes: Notification[] = [];
    const today = dayjs().format("YYYY-MM-DD");

    try {
      const invoices = await getInvoices(user.id);

      // Overdue invoices
      invoices
        .filter((inv) => inv.status === "overdue" || (inv.status === "sent" && inv.dueDate < today))
        .slice(0, 5)
        .forEach((inv) => {
          notes.push({
            id: `overdue_${inv.id}`,
            kind: "overdue",
            title: `Invoice overdue: ${inv.invoiceNumber}`,
            body: `${inv.clientName} · due ${dayjs(inv.dueDate).format("MMM D")}`,
            href: "/invoices",
            date: inv.dueDate,
          });
        });

      // Invoices due in the next 7 days
      invoices
        .filter((inv) => inv.status === "sent" && inv.dueDate >= today && inv.dueDate <= dayjs().add(7, "day").format("YYYY-MM-DD"))
        .slice(0, 3)
        .forEach((inv) => {
          notes.push({
            id: `due_soon_${inv.id}`,
            kind: "upcoming",
            title: `Invoice due soon: ${inv.invoiceNumber}`,
            body: `${inv.clientName} · due ${dayjs(inv.dueDate).format("MMM D")}`,
            href: "/invoices",
            date: inv.dueDate,
          });
        });
    } catch { /* skip if invoices not accessible */ }

    // Upcoming tax deadline
    try {
      const country = user.country ?? "NL";
      const currentYear = dayjs().year();
      const taxPeriods = [
        ...getTaxPeriods(country, currentYear),
        ...getTaxPeriods(country, currentYear + 1),
      ];
      const next = getNextTaxDeadline(country);
      if (next) {
        const daysUntil = dayjs(next.dueDate).diff(dayjs(), "day");
        if (daysUntil >= 0 && daysUntil <= 30) {
          notes.push({
            id: `tax_${next.quarter}_${currentYear}`,
            kind: "tax",
            title: `Tax payment due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
            body: `${next.label ?? `Q${next.quarter}`} · ${dayjs(next.dueDate).format("MMM D, YYYY")}`,
            href: "/tax",
            date: next.dueDate,
          });
        }
      }
    } catch { /* skip */ }

    // Sort by date ascending (soonest first), then filter out dismissed
    notes.sort((a, b) => a.date.localeCompare(b.date));
    setNotifications(notes);
  }, [user]);

  useEffect(() => {
    if (user) buildNotifications();
  }, [user, buildNotifications]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const unread = visible.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: unread > 0 ? "#ef4444" : "#16a34a" }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-col)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Notifications
              {unread > 0 && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#ef444420", color: "#f87171" }}>
                  {unread}
                </span>
              )}
            </p>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:opacity-70 transition-opacity">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "var(--border-col)" }}>
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2" style={{ color: "#22C55E" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>All caught up!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>No new notifications</p>
              </div>
            ) : visible.map((n) => {
              const cfg = KIND_COLORS[n.kind];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => { if (n.href) router.push(n.href); setOpen(false); }}
                >
                  <div className="rounded-lg p-1.5 flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{n.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{n.body}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDismissed((prev) => new Set([...prev, n.id])); }}
                    className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {visible.length > 0 && (
            <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border-col)" }}>
              <button
                onClick={() => setDismissed(new Set(notifications.map((n) => n.id)))}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                Dismiss all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
