"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Minus, CreditCard, Sparkles, Zap, Shield, ArrowRight, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCheckoutSession } from "@/lib/data/billing";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { parseStripeError } from "@/lib/stripe-errors";

// Stripe price IDs from environment
const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || "";
const ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || "";

// ── Comparison data ───────────────────────────────────────────────────────────

type RowValue = true | false | "partial";

interface CompareRow {
  label: string;
  free: RowValue;
  pro: RowValue;
  freeNote?: string;
}

const COMPARE: { group: string; rows: CompareRow[] }[] = [
  {
    group: "Core tracking",
    rows: [
      { label: "Manual income entry",        free: true,      pro: true },
      { label: "Expense tracking",           free: true,      pro: true },
      { label: "Time tracking",              free: true,      pro: true },
      { label: "Client & project tracking",  free: true,      pro: true },
      { label: "Invoice generation",         free: true,      pro: true },
      { label: "Proposals & contracts",      free: true,      pro: true },
    ],
  },
  {
    group: "Financial insights (Pro)",
    rows: [
      { label: "Multi-currency & FX rates",  free: false,     pro: true },
      { label: "Safe to spend calculator",   free: false,     pro: true },
      { label: "Tax estimates by country",   free: false,     pro: true },
      { label: "Advanced analytics dashboard", free: false,     pro: true },
      { label: "Quarterly tax calendar",     free: false,     pro: true },
    ],
  },
  {
    group: "Client & automation (Pro)",
    rows: [
      { label: "Client portals",             free: false, pro: true },
      { label: "Recurring invoices",         free: false, pro: true },
      { label: "Automated payment reminders", free: false,     pro: true },
      { label: "Multiple income connections", free: "partial", pro: true, freeNote: "1 connection" },
      { label: "Webhook integrations",       free: false, pro: true },
    ],
  },
  {
    group: "Export & sharing",
    rows: [
      { label: "CSV & PDF export",           free: true,      pro: true },
      { label: "Public earnings page",       free: true, pro: true },
    ],
  },
];

function Cell({ value, note }: { value: RowValue; note?: string }) {
  if (value === true)
    return <Check className="h-4 w-4 mx-auto" style={{ color: "#22C55E" }} />;
  if (value === false)
    return <X className="h-4 w-4 mx-auto" style={{ color: "var(--text-muted)" }} />;
  return (
    <div className="text-center">
      <Minus className="h-4 w-4 mx-auto" style={{ color: "var(--text-muted)" }} />
      {note && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{note}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UpgradePageContent() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [successShown, setSuccessShown] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorSuggestion, setErrorSuggestion] = useState("");
  const isPro = user?.isPro ?? false;

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    // Show success banner if coming from Stripe checkout
    if (searchParams.get("success") === "true" && !successShown) {
      // Refresh user data to get updated Pro status from webhook
      refreshUser().then(() => {
        toast("🎉 You're now on Pro! Enjoy all premium features.", "success");
      });
      setSuccessShown(true);
      // Clean up URL
      router.replace("/upgrade");
    }
  }, [searchParams, successShown, toast, router, refreshUser]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const priceId = billingPeriod === "monthly" ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID;
      const { url } = await createCheckoutSession(user!.id, user!.email, priceId);
      if (url && url !== "#") {
        window.location.href = url;
      } else {
        setConfirmOpen(false);
        toast("Stripe not connected yet — coming soon.", "info");
      }
    } catch (error: any) {
      setConfirmOpen(false);
      setIsUpgrading(false);

      // Parse the error to get user-friendly message
      const { message, suggestion } = parseStripeError(error);
      setErrorMessage(message);
      setErrorSuggestion(suggestion || "");
      setErrorOpen(true);
    } finally {
      setIsUpgrading(false);
    }
  };

  // ── Already Pro ────────────────────────────────────────────────────────────
  if (isPro) {
    return (
      <AppShell title="Upgrade">
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-3 max-w-sm">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "#22C55E20", border: "1px solid #22C55E30" }}
            >
              <Sparkles className="h-5 w-5" style={{ color: "#22C55E" }} />
            </div>
            <p className="text-white font-semibold">You&apos;re on Pro</p>
            <p className="text-sm text-slate-400">
              You have full access to every feature. Manage your subscription in{" "}
              <button
                onClick={() => router.push("/settings")}
                className="underline text-slate-300 hover:text-white"
              >
                Settings → Billing
              </button>.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Upgrade">
      <div className="p-5 lg:p-6 space-y-7">

        {/* Page header — matches every other page */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Unlock your full potential</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Get advanced insights, automation, and powerful tools to grow your business.
          </p>
        </div>

        {/* Billing period toggle — prominent at top */}
        <div className="flex justify-center">
          <div
            className="inline-flex rounded-lg p-1 gap-0"
            style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
          >
            <button
              onClick={() => setBillingPeriod("monthly")}
              className="px-6 py-3 rounded-md text-sm font-semibold transition-all duration-200"
              style={{
                color: billingPeriod === "monthly" ? "#0f172a" : "var(--text-secondary)",
                background: billingPeriod === "monthly" ? "#22C55E" : "transparent",
                boxShadow: billingPeriod === "monthly" ? "0 0 12px #22C55E30" : "none",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className="px-6 py-3 rounded-md text-sm font-semibold transition-all duration-200 relative"
              style={{
                color: billingPeriod === "annual" ? "#0f172a" : "var(--text-secondary)",
                background: billingPeriod === "annual" ? "#22C55E" : "transparent",
                boxShadow: billingPeriod === "annual" ? "0 0 12px #22C55E30" : "none",
              }}
            >
              Annual
              {billingPeriod === "annual" && (
                <span
                  className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ background: "#22C55E", color: "#0f172a" }}
                >
                  Save €29
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-6">

          {/* Free card */}
          <div
            className="rounded-2xl p-6 transition-all hover:border-slate-500"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Free Plan</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>€0</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>forever</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Perfect for getting started with essential tracking features.
              </p>
              <span
                className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "var(--bg-page)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }}
              >
                Your current plan
              </span>
            </div>
          </div>

          {/* Pro card */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden shadow-lg transition-all"
            style={{
              background: "linear-gradient(135deg, #0d1f12 0%, #091510 100%)",
              border: "2px solid #22C55E50",
              boxShadow: "0 10px 40px #22C55E15",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top right, #22C55E0C 0%, transparent 65%)" }}
            />
            <div className="relative space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>
                  Pro Plan
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold" style={{ color: "#ffffff" }}>
                    {billingPeriod === "monthly" ? "€9" : "€79"}
                  </span>
                  <span className="text-sm" style={{ color: "#94a3b8" }}>
                    {billingPeriod === "monthly" ? "/ month" : "/ year"}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
                Get advanced insights, automation, and priority support to scale your business.
              </p>
              <Button
                onClick={() => setConfirmOpen(true)}
                className="w-full font-semibold text-sm h-10"
                style={{ background: "#22C55E", color: "#0f172a" }}
              >
                <Zap className="h-4 w-4 mr-2 fill-current" />
                Go to payment
              </Button>
              <p className="text-xs text-center" style={{ color: "#6b7280" }}>Cancel anytime • No questions asked</p>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          {/* Table header */}
          <div
              className="grid text-xs font-semibold uppercase tracking-wider"
            style={{
              color: "var(--text-secondary)",
              gridTemplateColumns: "1fr 120px 120px",
              borderBottom: "1px solid var(--border-col)",
              background: "var(--bg-page)",
            }}
          >
            <div className="px-5 py-3">Feature</div>
            <div className="px-4 py-3 text-center" style={{ borderLeft: "1px solid var(--border-col)" }}>Free</div>
            <div
              className="px-4 py-3 text-center"
              style={{ borderLeft: "1px solid #22C55E20", color: "#22C55E" }}
            >
              Pro
            </div>
          </div>

          {/* Groups */}
          {COMPARE.map((section, si) => (
            <div key={section.group}>
              {/* Group header */}
              <div
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                style={{
                  color: "var(--text-muted)",
                  background: "var(--bg-page)",
                  borderTop: si > 0 ? "1px solid var(--border-col)" : "1px solid var(--border-col)",
                }}
              >
                {section.group}
              </div>

              {/* Rows */}
              {section.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: "1fr 120px 120px",
                    borderTop: "1px solid var(--border-col)",
                  }}
                >
                  <div className="px-5 py-3">
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{row.label}</span>
                  </div>
                  <div
                    className="px-4 py-3 flex justify-center"
                    style={{ borderLeft: "1px solid var(--border-col)" }}
                  >
                    <Cell value={row.free} note={row.freeNote} />
                  </div>
                  <div
                    className="px-4 py-3 flex justify-center"
                    style={{ background: "#070f0905", borderLeft: "1px solid #22C55E15" }}
                  >
                    <Cell value={row.pro} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 flex-wrap pt-2">
          {[
            { icon: Shield,     label: "Secure & encrypted" },
            { icon: ArrowRight, label: "Cancel anytime" },
            { icon: CreditCard, label: "14-day refund" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Icon className="h-4 w-4" style={{ color: "#22C55E" }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* ── Confirmation dialog ───────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="sm:max-w-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "#22C55E20" }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
              </div>
              Upgrade to Pro
            </DialogTitle>
          </DialogHeader>

          <div className="mt-1 space-y-4">
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">MyStackd Pro {billingPeriod === "annual" ? "(Annual)" : ""}</span>
                <span className="text-white font-semibold">
                  {billingPeriod === "monthly" ? "€9.00 / mo" : "€79.00 / year"}
                </span>
              </div>
              <div
                className="flex justify-between text-sm font-semibold pt-2 border-t"
                style={{ borderColor: "var(--border-col)" }}
              >
                <span className="text-white">Due today</span>
                <span style={{ color: "#22C55E" }}>
                  {billingPeriod === "monthly" ? "€9.00" : "€79.00"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 text-center leading-relaxed">
              You'll be taken to Stripe to complete your payment. Your subscription will activate immediately after payment.
            </p>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-white"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="flex-1 font-bold"
                style={{ background: "#22C55E", color: "#0f172a" }}
              >
                {isUpgrading ? "Processing…" : "Go to payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Error dialog ────────────────────────────────────── */}
      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent
          className="sm:max-w-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "#ef444420" }}
              >
                <AlertCircle className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />
              </div>
              Payment failed
            </DialogTitle>
          </DialogHeader>

          <div className="mt-1 space-y-4">
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
            >
              <p className="text-sm text-white font-medium">{errorMessage}</p>
              {errorSuggestion && (
                <p className="text-xs text-slate-400">{errorSuggestion}</p>
              )}
            </div>

            <p className="text-xs text-slate-600 text-center leading-relaxed">
              If you continue to experience issues, please contact support or try again later.
            </p>

            <Button
              onClick={() => setErrorOpen(false)}
              className="w-full font-bold"
              style={{ background: "#22C55E", color: "#0f172a" }}
            >
              Try again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
