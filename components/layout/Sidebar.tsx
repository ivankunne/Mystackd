"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plug,
  Settings,
  Zap,
  Receipt,
  Users,
  Calendar,
  TrendingDown,
  Timer,
  Bell,
  FileText,
  Layers,
  BrainCircuit,
  TrendingUp,
  Globe,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/lib/context/AlertContext";

type NavItem =
  | { href: string; label: string; icon: React.ElementType; dividerBefore?: false }
  | { dividerBefore: true; href?: never; label?: never; icon?: never };

const NAV_LINKS: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard },
  { href: "/connections",  label: "Connections",   icon: Plug },
  // ── Work ──────────────────────────────────────────────────────────────────
  { dividerBefore: true },
  { href: "/leads",        label: "Leads",         icon: TrendingUp },
  { href: "/clients",      label: "Clients",       icon: Users },
  { href: "/proposals",    label: "Proposals",     icon: FileText },
  { href: "/contracts",    label: "Contracts",     icon: ScrollText },
  { href: "/projects",     label: "Projects",      icon: Layers },
  { href: "/calendar",     label: "Calendar",      icon: Calendar },
  { href: "/time",         label: "Time Tracking", icon: Timer },
  // ── Bill ──────────────────────────────────────────────────────────────────
  { dividerBefore: true },
  { href: "/invoices",     label: "Invoices",      icon: Receipt },
  { href: "/reminders",    label: "Reminders",     icon: Bell },
  { href: "/expenses",     label: "Expenses",      icon: TrendingDown },
  // ── Plan ──────────────────────────────────────────────────────────────────
  { dividerBefore: true },
  { href: "/tax",          label: "Tax Calendar",  icon: Calendar },
  { href: "/intelligence", label: "Intelligence",  icon: BrainCircuit },
  { href: "/portal",       label: "Client Portals",icon: Globe },
  { href: "/settings",     label: "Settings",      icon: Settings },
  { href: "/upgrade",      label: "Upgrade",       icon: Zap },
];

function formatAlertAmount(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  if (amount >= 10000) return `${symbol}${(amount / 1000).toFixed(0)}k`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1).replace(".0", "")}k`;
  return `${symbol}${Math.round(amount)}`;
}

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { overdueCount, overdueTotal, currency, taxDaysLeft } = useAlerts();

  return (
    <nav className="flex flex-col gap-0.5 px-2.5 py-2.5 flex-1 overflow-y-auto">
      {NAV_LINKS.map((item, idx) => {
        if (item.dividerBefore) {
          return (
            <div
              key={`divider-${idx}`}
              className="my-1 mx-1 h-px"
              style={{ background: "var(--border-col)" }}
            />
          );
        }

        const { href, label, icon: Icon } = item;
        const isActive = pathname === href || pathname.startsWith(href + "/");

        let badge: { text: string; color: string; bg: string } | null = null;

        if (href === "/reminders" && overdueCount > 0) {
          badge = { text: formatAlertAmount(overdueTotal, currency), color: "#dc2626", bg: "#fee2e2" };
        } else if (href === "/invoices" && overdueCount > 0) {
          badge = { text: String(overdueCount), color: "#dc2626", bg: "#fee2e2" };
        } else if (href === "/tax" && taxDaysLeft !== null) {
          const isUrgent = taxDaysLeft <= 14;
          badge = {
            text: taxDaysLeft === 0 ? "today" : `${taxDaysLeft}d`,
            color: isUrgent ? "#dc2626" : "#b45309",
            bg:    isUrgent ? "#fee2e2"  : "#fef3c7",
          };
        } else if (href === "/upgrade") {
          badge = { text: "Pro", color: "#16a34a", bg: "#dcfce7" };
        }

        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
            )}
            style={
              isActive
                ? { background: "#f0fdf4", color: "#15803d" }
                : { color: "var(--text-secondary)" }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }
            }}
          >
            <Icon
              className="h-4 w-4 flex-shrink-0"
              style={{ color: isActive ? "#16a34a" : "var(--text-muted)" }}
            />
            {label}
            {badge && (
              <span
                className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{ color: badge.color, background: badge.bg }}
              >
                {badge.text}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
