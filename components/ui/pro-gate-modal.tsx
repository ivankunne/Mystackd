"use client";

import { X, Zap } from "lucide-react";

interface ProGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
}

export function ProGateModal({
  isOpen,
  onClose,
  feature,
  description,
}: ProGateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-col)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border-col)" }}
        >
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Zap className="h-5 w-5" style={{ color: "#fbbf24" }} />
            Available with Pro
          </h2>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p
            className="text-sm font-medium mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {feature}
          </p>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--text-muted)" }}
          >
            {description ||
              "Upgrade to Pro to unlock this feature and get access to recurring invoices, payment integrations, client portals, and more."}
          </p>

          {/* Pricing */}
        <div
          className="p-3 rounded-lg mb-4"
          style={{ background: "var(--bg-elevated)" }}
        >
          <p className="text-xs text-slate-500 mb-1">Pricing</p>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            €9<span className="text-sm text-slate-500">/month</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            30-day free trial • Cancel anytime • No credit card needed for trial
          </p>
        </div>

        {/* Benefits list */}
        <div className="space-y-2 mb-6">
          {[
            "Recurring invoices & automated billing",
            "Payment integrations (Stripe & PayPal)",
            "Full client portal access",
            "Automated payment reminders",
            "Advanced analytics & insights",
            "Webhook integrations",
            "Priority email support",
          ].map((benefit) => (
            <div key={benefit} className="flex items-start gap-2">
              <Zap
                className="h-4 w-4 flex-shrink-0 mt-0.5"
                style={{ color: "#fbbf24" }}
              />
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {benefit}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            Continue Free
          </button>
          <button
            onClick={() => {
              window.location.href = "/upgrade";
            }}
            className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors"
            style={{ background: "#fbbf24", color: "#111827" }}
          >
            Start Free Trial
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
