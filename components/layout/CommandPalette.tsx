"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, ChevronRight,
  LayoutDashboard, Receipt, Users, Layers, Timer, FileText,
  ScrollText, Calendar, TrendingDown, BrainCircuit, Settings,
  Zap, Plug, Globe, Bell, TrendingUp,
} from "lucide-react";
import { getClients } from "@/lib/data/clients";
import { getInvoices } from "@/lib/data/invoices";
import { getProjects } from "@/lib/data/projects";
import { useAuth } from "@/lib/context/AuthContext";
import { formatCurrency } from "@/lib/calculations";
import type { Currency } from "@/lib/mock-data";

// ── Static nav pages ──────────────────────────────────────────────────────────

const PAGES = [
  { label: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard, desc: "Overview & income summary" },
  { label: "Connections",    href: "/connections",  icon: Plug,            desc: "Payment source integrations" },
  { label: "Leads",          href: "/leads",        icon: TrendingUp,      desc: "Lead pipeline & Kanban" },
  { label: "Clients",        href: "/clients",      icon: Users,           desc: "Client management" },
  { label: "Proposals",      href: "/proposals",    icon: FileText,        desc: "Create & send proposals" },
  { label: "Contracts",      href: "/contracts",    icon: ScrollText,      desc: "Contract management" },
  { label: "Projects",       href: "/projects",     icon: Layers,          desc: "Project tracking" },
  { label: "Calendar",       href: "/calendar",     icon: Calendar,        desc: "Schedule & events" },
  { label: "Time Tracking",  href: "/time",         icon: Timer,           desc: "Log & bill time" },
  { label: "Invoices",       href: "/invoices",     icon: Receipt,         desc: "Create & manage invoices" },
  { label: "Reminders",      href: "/reminders",    icon: Bell,            desc: "Payment reminders" },
  { label: "Expenses",       href: "/expenses",     icon: TrendingDown,    desc: "Track expenses" },
  { label: "Tax Calendar",   href: "/tax",          icon: Calendar,        desc: "Tax estimates & deadlines" },
  { label: "Intelligence",   href: "/intelligence", icon: BrainCircuit,    desc: "Financial insights" },
  { label: "Client Portals", href: "/portal",       icon: Globe,           desc: "Shared client portals" },
  { label: "Settings",       href: "/settings",     icon: Settings,        desc: "Account & preferences" },
  { label: "Upgrade",        href: "/upgrade",      icon: Zap,             desc: "Upgrade to Pro" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Result {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ElementType;
  group: string;
  accent?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery]         = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [clients,  setClients]    = useState<Awaited<ReturnType<typeof getClients>>>([]);
  const [invoices, setInvoices]   = useState<Awaited<ReturnType<typeof getInvoices>>>([]);
  const [projects, setProjects]   = useState<Awaited<ReturnType<typeof getProjects>>>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const { user } = useAuth();

  // Keyboard shortcut (Escape only — Cmd+K is handled by AppShell)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lazy-load data on first open
  useEffect(() => {
    if (!open || dataLoaded || !user?.id) return;
    Promise.all([
      getClients(user.id),
      getInvoices(user.id),
      getProjects(user.id),
    ]).then(([c, inv, proj]) => {
      setClients(c);
      setInvoices(inv);
      setProjects(proj);
      setDataLoaded(true);
    }).catch(() => {});
  }, [open, dataLoaded, user?.id]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  // Build results
  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();

    // Before typing: show all pages
    if (!q) {
      return PAGES.map((p) => ({
        id:       `page-${p.href}`,
        label:    p.label,
        sublabel: p.desc,
        href:     p.href,
        icon:     p.icon,
        group:    "Navigate to",
      }));
    }

    const out: Result[] = [];

    // Pages
    PAGES.forEach((p) => {
      if (p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)) {
        out.push({ id: `page-${p.href}`, label: p.label, sublabel: p.desc, href: p.href, icon: p.icon, group: "Pages" });
      }
    });

    // Clients
    clients.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q)) {
        out.push({
          id:       `client-${c.id}`,
          label:    c.name,
          sublabel: [c.company, c.email].filter(Boolean).join(" · "),
          href:     `/clients/${c.id}`,
          icon:     Users,
          group:    "Clients",
          accent:   "#3b82f6",
        });
      }
    });

    // Invoices
    invoices.forEach((inv) => {
      if (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q)
      ) {
        out.push({
          id:       `invoice-${inv.id}`,
          label:    inv.invoiceNumber,
          sublabel: `${inv.clientName} · ${formatCurrency(inv.total, inv.currency as Currency)} · ${inv.status}`,
          href:     "/invoices",
          icon:     Receipt,
          group:    "Invoices",
          accent:   inv.status === "paid" ? "#22C55E" : inv.status === "overdue" ? "#ef4444" : "#94a3b8",
        });
      }
    });

    // Projects
    projects.forEach((proj) => {
      if (proj.name.toLowerCase().includes(q) || proj.clientName.toLowerCase().includes(q)) {
        out.push({
          id:       `project-${proj.id}`,
          label:    proj.name,
          sublabel: proj.clientName,
          href:     "/projects",
          icon:     Layers,
          group:    "Projects",
          accent:   "#a78bfa",
        });
      }
    });

    return out;
  }, [query, clients, invoices, projects]);

  // Group for display
  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    results.forEach((r) => {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    });
    return Array.from(map.entries());
  }, [results]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      navigate(results[activeIdx].href);
    }
  };

  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-col)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b" style={{ borderColor: "var(--border-col)" }}>
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, clients, invoices, projects…"
            className="flex-1 h-12 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {query ? (
            <button onClick={() => setQuery("")} className="flex-shrink-0 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd
              className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono hidden sm:inline-block"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }}
            >
              esc
            </kbd>
          )}
        </div>

        {/* Results list */}
        <div className="max-h-[22rem] overflow-y-auto py-1.5 px-2">
          {results.length === 0 && query && (
            <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {grouped.map(([group, items]) => (
            <div key={group}>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                {group}
              </p>
              {items.map((item) => {
                const idx   = results.indexOf(item);
                const isActive = idx === activeIdx;
                const Icon  = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                    style={{ background: isActive ? "var(--bg-elevated)" : "transparent" }}
                  >
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: isActive ? "#22C55E15" : "var(--bg-page)" }}
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: item.accent ?? (isActive ? "#22C55E" : "var(--text-muted)") }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className="h-3.5 w-3.5 flex-shrink-0 transition-opacity"
                      style={{ color: "var(--text-muted)", opacity: isActive ? 1 : 0 }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-[11px]"
          style={{ borderColor: "var(--border-col)", color: "var(--text-muted)" }}
        >
          {[
            { key: "↑↓", hint: "navigate" },
            { key: "↵", hint: "open" },
            { key: "esc", hint: "close" },
          ].map(({ key, hint }) => (
            <span key={key} className="flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded font-mono text-[10px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-col)" }}
              >
                {key}
              </kbd>
              {hint}
            </span>
          ))}
          {dataLoaded && query && (
            <span className="ml-auto">{results.length} result{results.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}
