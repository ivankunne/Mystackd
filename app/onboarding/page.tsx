"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SourceCard } from "@/components/connections/SourceCard";
import { MOCK_CONNECTIONS, type Connection } from "@/lib/mock-data";
import { updateUserProfile } from "@/lib/data/user";
import { createExpense } from "@/lib/data/expenses";
import { useAuth } from "@/lib/context/AuthContext";

const STEPS = [
  { label: "Location" },
  { label: "Expenses" },
  { label: "Sources" },
];

const COUNTRIES = [
  { code: "NO", name: "Norway" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "OTHER", name: "Other" },
];

const CURRENCIES = ["EUR", "USD", "GBP", "NOK", "SEK", "DKK"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [connections, setConnections] = useState<Connection[]>(
    MOCK_CONNECTIONS.map((c) => ({ ...c, status: "disconnected" as const, connectedAt: null }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const [location, setLocation] = useState({ country: "NO", currency: "EUR" });
  const [expenses, setExpenses] = useState({ rent: 1500, subscriptions: 200, other: 100 });

  const totalExpenses = expenses.rent + expenses.subscriptions + expenses.other;

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const updated = await updateUserProfile({
        country: location.country,
        currency: location.currency as "EUR" | "USD" | "GBP" | "NOK",
        monthlyExpenses: expenses,
      }, user?.id);
      updateUser(updated);

      // Create expense entries from the onboarding monthly expenses
      const expenseCategories = [
        { amount: expenses.rent, category: "coworking" as const, description: "Monthly rent" },
        { amount: expenses.subscriptions, category: "software" as const, description: "Monthly subscriptions" },
        { amount: expenses.other, category: "other" as const, description: "Other monthly expenses" },
      ];

      const userId = user?.id ?? "user_mock_001";
      const currency = (location.currency as "EUR" | "USD" | "GBP" | "NOK") ?? "EUR";
      const today = dayjs().format("YYYY-MM-DD");

      // Create individual expense entries for each category
      for (const exp of expenseCategories) {
        if (exp.amount > 0) {
          await createExpense({
            userId,
            date: today,
            amount: exp.amount,
            currency,
            category: exp.category,
            description: exp.description,
            isTaxDeductible: true,
            isRecurring: true,
          });
        }
      }

      router.push("/dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  const labelClass = "text-xs font-medium";
  const inputClass =
    "h-10 text-sm focus:border-accent";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
        >
          M
        </div>
        <span className="font-semibold text-white tracking-tight">MyStackd</span>
      </Link>

      <OnboardingStep
        currentStep={step}
        steps={STEPS}
        title={
          step === 1
            ? "Where are you based?"
            : step === 2
            ? "What are your monthly expenses?"
            : "Connect your income sources"
        }
        description={
          step === 1
            ? "We use this to estimate your tax bracket."
            : step === 2
            ? "Helps us calculate what's safe to spend each month."
            : "Connect now or skip and add later — you can always change this."
        }
      >
        {/* Step 1: Country + Currency */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Country</Label>
              <Select
                value={location.country}
                onValueChange={(v) => v && setLocation((l) => ({ ...l, country: v }))}
              >
                <SelectTrigger className={`${inputClass} `}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-white text-sm">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Preferred currency</Label>
              <Select
                value={location.currency}
                onValueChange={(v) => v && setLocation((l) => ({ ...l, currency: v }))}
              >
                <SelectTrigger className={`${inputClass} `}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-white text-sm">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full font-semibold h-10 mt-2"
              style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Expenses */}
        {step === 2 && (
          <div className="space-y-4">
            {(["rent", "subscriptions", "other"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label className={labelClass}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  <span className="text-slate-600 ml-1">/ month</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    {["NOK", "SEK", "DKK"].includes(location.currency) ? "kr" : location.currency === "GBP" ? "£" : location.currency === "USD" ? "$" : "€"}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={expenses[field]}
                    onChange={(e) =>
                      setExpenses((ex) => ({
                        ...ex,
                        [field]: Number(e.target.value) || 0,
                      }))
                    }
                    className={`${inputClass} pl-8`}
                    style={{ background: "var(--bg-card)" }}
                  />
                </div>
              </div>
            ))}

            {/* Running total */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
            >
              <span className="text-slate-400">Monthly total</span>
              <span className="font-semibold" style={{ color: "#22C55E" }}>
                {location.currency === "NOK" || location.currency === "SEK" || location.currency === "DKK"
                  ? `kr ${totalExpenses.toLocaleString()}`
                  : location.currency === "GBP"
                  ? `£${totalExpenses.toLocaleString()}`
                  : location.currency === "USD"
                  ? `$${totalExpenses.toLocaleString()}`
                  : `€${totalExpenses.toLocaleString()}`}
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                className="flex-1 h-10 border-[var(--border-col)] hover:border-[var(--border-col)]"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                className="flex-1 font-semibold h-10"
                style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Connections */}
        {step === 3 && (
          <div className="space-y-3">
            {connections.map((conn) => (
              <SourceCard
                key={conn.source}
                connection={conn}
                onUpdate={(updated) => {
                  setConnections((prev) =>
                    prev.map((c) => (c.source === updated.source ? updated : c))
                  );
                }}
              />
            ))}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="h-10 border-[var(--border-col)] hover:border-[var(--border-col)]"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-10 text-slate-400 hover:text-white"
                onClick={handleFinish}
                disabled={isSaving}
              >
                Skip for now
              </Button>
              <Button
                className="flex-1 font-semibold h-10"
                style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
                onClick={handleFinish}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Go to dashboard"}
              </Button>
            </div>
          </div>
        )}
      </OnboardingStep>
    </div>
  );
}
