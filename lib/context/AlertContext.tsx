"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getInvoices } from "@/lib/data/invoices";
import { getNextTaxDeadline } from "@/lib/tax-calendar";
import { getNotifPrefs } from "@/lib/data/notification-prefs";
import { useAuth } from "./AuthContext";

interface AlertState {
  overdueCount: number;
  overdueTotal: number;
  currency: string;
  taxDaysLeft: number | null; // null = no deadline within 45 days
  refresh: () => void;
}

const AlertContext = createContext<AlertState>({
  overdueCount: 0,
  overdueTotal: 0,
  currency: "EUR",
  taxDaysLeft: null,
  refresh: () => {},
});

export function AlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [taxDaysLeft, setTaxDaysLeft] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const prefs = await getNotifPrefs();

    if (prefs.invoiceOverdue) {
      const invoices = await getInvoices(user.id);
      const overdue = invoices.filter((inv) => inv.status === "overdue");
      setOverdueCount(overdue.length);
      setOverdueTotal(overdue.reduce((sum, inv) => sum + inv.total, 0));
    } else {
      setOverdueCount(0);
      setOverdueTotal(0);
    }

    if (prefs.taxReminders) {
      const deadline = getNextTaxDeadline(user.country);
      if (deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(deadline.dueDate);
        const diff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
        setTaxDaysLeft(diff >= 0 && diff <= 45 ? diff : null);
      } else {
        setTaxDaysLeft(null);
      }
    } else {
      setTaxDaysLeft(null);
    }
  }, [user?.id, user?.country]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AlertContext.Provider
      value={{
        overdueCount,
        overdueTotal,
        currency: user?.currency ?? "EUR",
        taxDaysLeft,
        refresh: load,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
}
