"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { AlertCircle, Clock, FileText, RefreshCw } from "lucide-react";
import type { Invoice, Proposal, Expense } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/calculations";

interface ActionCardsProps {
  invoices: Invoice[];
  proposals: Proposal[];
  expenses: Expense[];
  currency: string;
}

interface ActionCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  link?: string;
}

export function ActionCards({ invoices, proposals, expenses, currency }: ActionCardsProps) {
  const today = dayjs();

  // 1. Awaiting payment: sent invoices
  const awaitingPayment = invoices.filter((i) => i.status === "sent");
  const awaitingTotal = awaitingPayment.reduce((s, i) => s + i.total, 0);
  const awaitingDays = awaitingPayment.length > 0
    ? Math.max(...awaitingPayment.map(i => today.diff(dayjs(i.dueDate), "day")))
    : 0;

  // 2. Overdue invoices
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.total, 0);

  // 3. Expiring proposals: sent, validUntil within 7 days
  const expiringProposals = proposals.filter((p) => {
    if (p.status !== "sent") return false;
    const daysLeft = dayjs(p.validUntil).diff(today, "day");
    return daysLeft >= 0 && daysLeft <= 7;
  });
  const expiringCount = expiringProposals.length;

  // 4. Recurring subscriptions: isRecurring && software/marketing category
  const recurringExpenses = expenses.filter(
    (e) => e.isRecurring && ["software", "marketing"].includes(e.category)
  );
  const recurringTotal = recurringExpenses.reduce((s, e) => s + e.amount, 0);

  const cards: ActionCard[] = [];

  if (awaitingPayment.length > 0) {
    cards.push({
      id: "awaiting",
      icon: <Clock className="w-5 h-5" />,
      title: "Awaiting payment",
      value: `${awaitingPayment.length} invoices`,
      subtitle: `${formatCurrency(awaitingTotal, currency)} · ${awaitingDays} days outstanding`,
      accent: "#3B82F6",
      link: "/invoices",
    });
  }

  if (overdueInvoices.length > 0) {
    cards.push({
      id: "overdue",
      icon: <AlertCircle className="w-5 h-5" />,
      title: "Overdue",
      value: `${overdueInvoices.length} invoices`,
      subtitle: `${formatCurrency(overdueTotal, currency)} overdue`,
      accent: "#EF4444",
      link: "/invoices",
    });
  }

  if (expiringProposals.length > 0) {
    cards.push({
      id: "expiring",
      icon: <FileText className="w-5 h-5" />,
      title: "Expiring proposals",
      value: `${expiringCount} expiring soon`,
      subtitle: `Action needed within 7 days`,
      accent: "#F59E0B",
      link: "/proposals",
    });
  }

  if (recurringExpenses.length > 0) {
    cards.push({
      id: "recurring",
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Recurring subscriptions",
      value: `${recurringExpenses.length} active`,
      subtitle: `${formatCurrency(recurringTotal, currency)}/month`,
      accent: "#8B5CF6",
      link: "/expenses",
    });
  }

  // Return null if no cards to display
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Link key={card.id} href={card.link || "#"}>
          <div
            className="rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-col)",
              borderLeft: `3px solid ${card.accent}`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div style={{ color: card.accent }}>{card.icon}</div>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {card.title}
            </h3>
            <p className="text-lg font-bold mb-1" style={{ color: card.accent }}>
              {card.value}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {card.subtitle}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
