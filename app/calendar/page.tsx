"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { ChevronLeft, ChevronRight, Circle, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getProjects } from "@/lib/data/projects";
import { getInvoices } from "@/lib/data/invoices";
import { getTaxPeriods } from "@/lib/tax-calendar";
import { useAuth } from "@/lib/context/AuthContext";
import type { Project, Invoice } from "@/lib/mock-data";

dayjs.extend(isBetween);

// ─── Client color palette ──────────────────────────────────────────────────────

const PALETTE = [
  "#3B82F6", "#22C55E", "#f59e0b", "#a78bfa",
  "#f472b6", "#34d399", "#fb923c", "#60a5fa",
];
const colorMap: Record<string, string> = {};
let colorIdx = 0;
function clientColor(name: string): string {
  if (!colorMap[name]) {
    colorMap[name] = PALETTE[colorIdx % PALETTE.length];
    colorIdx++;
  }
  return colorMap[name];
}

// ─── Event model ───────────────────────────────────────────────────────────────

type EventKind = "project" | "invoice" | "tax";

interface CalEvent {
  id: string;
  kind: EventKind;
  label: string;
  sublabel?: string;
  date: string; // YYYY-MM-DD
  color: string;
  /** Only for project spans */
  spanStart?: string;
  spanEnd?: string;
}

// ─── Calendar helpers ──────────────────────────────────────────────────────────

function buildCalendar(month: Dayjs): Dayjs[] {
  const start = month.startOf("month").startOf("week");
  const end = month.endOf("month").endOf("week");
  const days: Dayjs[] = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    days.push(cur);
    cur = cur.add(1, "day");
  }
  return days;
}

function eventsForDay(day: Dayjs, events: CalEvent[]): CalEvent[] {
  return events.filter((ev) => {
    if (ev.kind === "project" && ev.spanStart && ev.spanEnd) {
      return day.isBetween(ev.spanStart, ev.spanEnd, "day", "[]");
    }
    return day.isSame(ev.date, "day");
  });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const country = user?.country ?? "NL";

  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs().startOf("month"));
  const [selected, setSelected] = useState<CalEvent | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProjects(user?.id), getInvoices(user?.id)]).then(([proj, inv]) => {
      if (mounted) { setProjects(proj); setInvoices(inv); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  // Seed client colors
  projects.forEach((p) => clientColor(p.clientName));

  // ─── Build unified event list ──────────────────────────────────────────────

  const events: CalEvent[] = [];

  // Project spans (start → endDate) with deadline marker on endDate.
  // Projects with no end date are treated as ongoing — their span extends
  // 3 months past today so they remain visible on the calendar.
  for (const p of projects) {
    if (!p.startDate) continue;
    const isOngoing = !p.endDate;
    const spanEnd = p.endDate ?? dayjs().add(3, "month").format("YYYY-MM-DD");
    events.push({
      id: `proj_${p.id}`,
      kind: "project",
      label: p.name,
      sublabel: isOngoing ? `${p.clientName} · ongoing` : p.clientName,
      date: spanEnd,
      color: clientColor(p.clientName),
      spanStart: p.startDate,
      spanEnd,
    });
  }

  // Invoice due dates (sent or overdue only — paid ones aren't pending)
  for (const inv of invoices) {
    if (inv.status === "paid" || inv.status === "draft") continue;
    events.push({
      id: `inv_${inv.id}`,
      kind: "invoice",
      label: `${inv.invoiceNumber}`,
      sublabel: inv.clientName,
      date: inv.dueDate,
      color: "#f59e0b",
    });
  }

  // Tax deadlines for current year and next year
  const currentYear = month.year();
  const taxPeriods = [
    ...getTaxPeriods(country, currentYear),
    ...getTaxPeriods(country, currentYear + 1),
  ];
  for (const tp of taxPeriods) {
    events.push({
      id: `tax_${tp.quarter}_${tp.label.replace(" ", "_")}`,
      kind: "tax",
      label: `Tax: ${tp.label}`,
      date: tp.dueDate,
      color: "#a78bfa",
    });
  }

  // ─── Per-month lists ───────────────────────────────────────────────────────

  const today = dayjs();
  const days = buildCalendar(month);

  const monthEvents = events
    .filter((ev) => dayjs(ev.date).isSame(month, "month"))
    .sort((a, b) => a.date.localeCompare(b.date));

  const activeProjects = projects.filter((p) => p.status === "active");

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Calendar">
      <div className="p-5 lg:p-6 space-y-5">

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMonth((m) => m.subtract(1, "month"))}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border-col)" }}
            >
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            </button>
            <h2 className="text-base font-semibold text-white w-36 text-center">
              {month.format("MMMM YYYY")}
            </h2>
            <button
              onClick={() => setMonth((m) => m.add(1, "month"))}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border-col)" }}
            >
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
            <button
              onClick={() => setMonth(dayjs().startOf("month"))}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "var(--border-col)", color: "#94a3b8" }}
            >
              Today
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              <span className="font-semibold text-white">{activeProjects.length}</span> active
            </span>
            <span className="text-slate-400">
              <span className="font-semibold text-white">{monthEvents.length}</span> events this month
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#3B82F620", border: "1px solid #3B82F6" }} />
            <span className="text-slate-500">Project</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#f59e0b20", border: "1px solid #f59e0b" }} />
            <span className="text-slate-500">Invoice due</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#a78bfa20", border: "1px solid #a78bfa" }} />
            <span className="text-slate-500">Tax deadline</span>
          </div>
        </div>

        {/* Calendar grid */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          {/* Day headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border-col)" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-slate-500">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div
                className="h-8 w-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "#3B82F640", borderTopColor: "#3B82F6" }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const isCurrentMonth = day.isSame(month, "month");
                const isToday = day.isSame(today, "day");
                const isWeekend = day.day() === 0 || day.day() === 6;
                const dayEvents = eventsForDay(day, events);
                const visibleEvents = dayEvents.slice(0, 3);
                const overflow = dayEvents.length - visibleEvents.length;

                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-[90px] p-1.5 transition-colors"
                    style={{
                      borderRight: (i + 1) % 7 === 0 ? "none" : "1px solid var(--border-col)30",
                      borderBottom: i < days.length - 7 ? "1px solid var(--border-col)30" : "none",
                      background: isWeekend && isCurrentMonth ? "#1F2A4430" : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          !isCurrentMonth ? "text-slate-700" : isToday ? "font-bold" : "text-slate-400"
                        }`}
                        style={isToday ? { background: "#22C55E", color: "var(--bg-sidebar)" } : {}}
                      >
                        {day.date()}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {visibleEvents.map((ev) => {
                        const isSpanStart = ev.spanStart && day.isSame(ev.spanStart, "day");
                        const isSpanEnd = ev.spanEnd && day.isSame(ev.spanEnd, "day");
                        const isPointEvent = ev.kind !== "project";
                        return (
                          <button
                            key={ev.id}
                            onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                            className="w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-opacity hover:opacity-80"
                            style={{
                              background: `${ev.color}22`,
                              color: ev.color,
                              border: isPointEvent ? `1px solid ${ev.color}50` : "none",
                            }}
                            title={ev.sublabel ? `${ev.label} · ${ev.sublabel}` : ev.label}
                          >
                            {ev.kind === "project" && (isSpanStart ? "▶ " : isSpanEnd ? "■ " : "")}
                            {ev.kind === "invoice" && "$ "}
                            {ev.kind === "tax" && "⚑ "}
                            {ev.label}
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <span className="text-[10px] text-slate-600 pl-1">+{overflow} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected event detail */}
        {selected && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--bg-card)",
              borderTop: "1px solid var(--border-col)",
              borderRight: "1px solid var(--border-col)",
              borderBottom: "1px solid var(--border-col)",
              borderLeft: `3px solid ${selected.color}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: `${selected.color}20`, color: selected.color }}
                  >
                    {selected.kind === "project" ? "Project" : selected.kind === "invoice" ? "Invoice" : "Tax"}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-1.5">{selected.label}</p>
                {selected.sublabel && <p className="text-xs text-slate-400 mt-0.5">{selected.sublabel}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-slate-400">
              {selected.spanStart && (
                <span>Start: {dayjs(selected.spanStart).format("MMM D, YYYY")}</span>
              )}
              <span>
                {selected.kind === "project" ? "Deadline" : selected.kind === "invoice" ? "Due" : "Due"}:{" "}
                {dayjs(selected.date).format("MMM D, YYYY")}
              </span>
              {(() => {
                const diff = dayjs(selected.date).diff(today, "day");
                return (
                  <span style={{ color: diff < 0 ? "#ef4444" : diff <= 7 ? "#f59e0b" : "#94a3b8" }}>
                    {diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Today" : `${diff}d left`}
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {/* This month's events list */}
        {!loading && monthEvents.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Events in {month.format("MMMM YYYY")}
            </p>
            <div className="space-y-2">
              {monthEvents.map((ev) => {
                const daysLeft = dayjs(ev.date).diff(today, "day");
                const isPast = daysLeft < 0;
                return (
                  <div
                    key={ev.id}
                    className="rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
                    onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                  >
                    <div className="flex items-center gap-3">
                      <Circle className="h-2 w-2 flex-shrink-0" style={{ color: ev.color, fill: ev.color }} />
                      <div>
                        <p className="text-sm font-medium text-white">{ev.label}</p>
                        <p className="text-xs text-slate-500">
                          {ev.sublabel && `${ev.sublabel} · `}
                          <span style={{ color: `${ev.color}cc` }}>
                            {ev.kind === "project" ? "deadline" : ev.kind === "invoice" ? "invoice due" : "tax due"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{dayjs(ev.date).format("MMM D")}</p>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: isPast ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "#94a3b8" }}
                      >
                        {isPast ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && monthEvents.length === 0 && (
          <p className="text-sm text-slate-600 text-center py-4">No events this month.</p>
        )}

        {/* Client legend */}
        {!loading && projects.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Array.from(new Set(projects.map((p) => p.clientName))).map((name) => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: clientColor(name) }} />
                <span className="text-xs text-slate-500">{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
