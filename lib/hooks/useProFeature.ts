import { useAuth } from "@/lib/context/AuthContext";
import { useState, useCallback } from "react";

export type ProFeature =
  | "recurring-invoices"
  | "payment-integrations"
  | "client-portal"
  | "payment-reminders"
  | "analytics";

const FEATURE_LABELS: Record<ProFeature, string> = {
  "recurring-invoices": "Recurring Invoices",
  "payment-integrations": "Payment Integrations",
  "client-portal": "Client Portal",
  "payment-reminders": "Automated Payment Reminders",
  analytics: "Advanced Analytics",
};

const FEATURE_DESCRIPTIONS: Record<ProFeature, string> = {
  "recurring-invoices":
    "Set up recurring invoices to automatically bill clients on a schedule. Save time on repetitive invoice creation.",
  "payment-integrations":
    "Accept payments directly in invoices with Stripe and PayPal integration. Get paid faster with one-click payments.",
  "client-portal":
    "Give clients a personalized portal to view proposals, sign contracts, and make payments. Improve collaboration and reduce email clutter.",
  "payment-reminders":
    "Automatically send payment reminders to clients before and after invoice due dates. Reduce overdue invoices with minimal effort.",
  analytics:
    "Deep dive into your business with revenue trends by client, monthly comparisons, and profitability analysis. Make data-driven decisions.",
};

export function useProFeature(feature: ProFeature) {
  const { user } = useAuth();
  const [showGateModal, setShowGateModal] = useState(false);

  const isAvailable = user?.isPro ?? false;

  const checkAccess = useCallback(() => {
    if (!isAvailable) {
      setShowGateModal(true);
      return false;
    }
    return true;
  }, [isAvailable]);

  return {
    isAvailable,
    showGateModal,
    setShowGateModal,
    checkAccess,
    featureLabel: FEATURE_LABELS[feature],
    featureDescription: FEATURE_DESCRIPTIONS[feature],
  };
}
