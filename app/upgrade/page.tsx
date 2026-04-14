"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Minus, CreditCard, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCheckoutSession } from "@/lib/data/billing";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";

// Stripe price IDs
const MONTHLY_PRICE_ID = "price_1TLqW2RWd7nhzzDtyPXaZTdn";
const ANNUAL_PRICE_ID = "price_1TLqW2RWd7nhzzDt2hPg0Ide";

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

export default function UpgradePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [successShown, setSuccessShown] = useState(false);
  const isPro = user?.isPro ?? false;

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    // Show success banner if coming from Stripe checkout
    if (searchParams.get("success") === "true" && !successShown) {
      toast("🎉 You're now on Pro! Enjoy all premium features.", "success");
      setSuccessShown(true);
      // Clean up URL
      router.replace("/upgrade");
    }
  }, [searchParams, successShown, toast, router]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const priceId = billingPeriod === "monthly" ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID;
      const { url } = await createCheckoutSession(user?.id, user?.email, priceId);
      if (url && url !== "#") {
        window.location.href = url;
      } else {
        setConfirmOpen(false);
        toast("Stripe not connected yet — coming soon.", "info");
      }
    } catch {
      setConfirmOpen(false);
      toast("Something went wrong. Please try again.", "error");
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
      <div className="p-5 lg:p-6 space-y-5">

        {/* Page header — matches every other page */}
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Choose your plan</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Upgrade to Pro to unlock your full financial picture.
          </p>
        </div>

        {/* Billing period toggle */}
        <div className="flex justify-center mb-2">
          <div
            className="inline-flex rounded-lg p-1"
            style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
          >
            <button
              onClick={() => setBillingPeriod("monthly")}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                color: billingPeriod === "monthly" ? "#0f172a" : "var(--text-secondary)",
                background: billingPeriod === "monthly" ? "#22C55E" : "transparent",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors relative"
              style={{
                color: billingPeriod === "annual" ? "#0f172a" : "var(--text-secondary)",
                background: billingPeriod === "annual" ? "#22C55E" : "transparent",
              }}
            >
              Annual
              {billingPeriod === "annual" && (
                <span
                  className="absolute -top-6 -right-4 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: "#22C55E", color: "#0f172a" }}
                >
                  Save €29
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan header cards */}
        <div className="grid grid-cols-2 gap-4">

          {/* Free card */}
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Free</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>€0</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>/ mo</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Free forever</p>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "var(--bg-page)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }}
              >
                Current plan
              </span>
            </div>
          </div>

          {/* Pro card */}
          <div
            className="rounded-xl p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0d1f12 0%, #091510 100%)",
              border: "2px solid #22C55E40",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top right, #22C55E0C 0%, transparent 65%)" }}
            />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#22C55E" }}>
                  Pro
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: "#ffffff" }}>
                    {billingPeriod === "monthly" ? "€9" : "€79"}
                  </span>
                  <span className="text-sm" style={{ color: "#94a3b8" }}>
                    {billingPeriod === "monthly" ? "/ mo" : "/ year"}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "#6b7280" }}>Cancel anytime</p>
              </div>
              <Button
                onClick={() => setConfirmOpen(true)}
                className="font-bold text-xs h-9 px-4"
                style={{ background: "#22C55E", color: "#0f172a" }}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 fill-current" />
                Upgrade now
              </Button>
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

        {/* Trust + CTA row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5 flex-wrap">
            {[
              { icon: Shield,     label: "Secure payments" },
              { icon: ArrowRight, label: "Cancel anytime" },
              { icon: CreditCard, label: "14-day refund" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <Icon className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
                {label}
              </div>
            ))}
          </div>
          <Button
            onClick={() => setConfirmOpen(true)}
            className="font-bold text-sm h-9 px-5"
            style={{ background: "#22C55E", color: "#0f172a" }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Upgrade to Pro — {billingPeriod === "monthly" ? "€9/mo" : "€79/yr"}
          </Button>
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
                {isUpgrading ? "Processing…" : "Go to Stripe"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
