"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles, CheckCircle2, TrendingUp, Globe, Calculator, Calendar,
  Users, RotateCw, Zap, ArrowRight, AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  route: string;
}

const PRO_FEATURES: Feature[] = [
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Multi-currency & FX",
    description: "Track income in multiple currencies with live exchange rates.",
    action: "Set currencies",
    route: "/settings",
  },
  {
    icon: <Calculator className="h-5 w-5" />,
    title: "Safe to spend",
    description: "Calculate how much you can safely spend after taxes & expenses.",
    action: "Calculate now",
    route: "/intelligence",
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Tax calendar",
    description: "Get tax estimates and quarterly deadlines for your country.",
    action: "View calendar",
    route: "/tax",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Advanced analytics",
    description: "Deep dive into your income trends and financial insights.",
    action: "View analytics",
    route: "/intelligence",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Client portals",
    description: "Share project details and invoices securely with clients.",
    action: "Manage clients",
    route: "/clients",
  },
  {
    icon: <RotateCw className="h-5 w-5" />,
    title: "Recurring invoices",
    description: "Automate billing with recurring invoices for contracts.",
    action: "Create invoice",
    route: "/invoices",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Webhooks",
    description: "Connect MyStackd to Slack, Airtable, Notion, and more.",
    action: "Set up webhooks",
    route: "/settings?tab=integrations",
  },
];

export default function WelcomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [planType, setPlanType] = useState<"monthly" | "annual" | null>(null);

  useEffect(() => {
    if (!authLoading && !user?.isPro) {
      router.push("/upgrade");
    }

    const plan = searchParams.get("plan") as "monthly" | "annual" | null;
    if (plan) setPlanType(plan);
  }, [user, authLoading, router, searchParams]);

  if (authLoading || !user?.isPro) {
    return (
      <AppShell title="Welcome">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Welcome to Pro">
      <div className="p-5 lg:p-6 space-y-6">
        {/* Hero section */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "#22C55E20", border: "2px solid #22C55E40" }}
          >
            <Sparkles className="h-8 w-8" style={{ color: "#22C55E" }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Welcome to MyStackd Pro!
          </h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            You've unlocked {PRO_FEATURES.length} powerful features to grow your business.
          </p>
          {planType && (
            <p className="text-sm" style={{ color: "#22C55E" }}>
              Plan: <span className="capitalize font-semibold">{planType}</span>
            </p>
          )}
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRO_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl p-5 flex flex-col h-full hover:border-slate-500 transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="p-2 rounded-lg flex-shrink-0 mt-1"
                  style={{ background: "#22C55E20", color: "#22C55E" }}
                >
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                </div>
              </div>
              <p className="text-sm mb-4 flex-grow" style={{ color: "var(--text-secondary)" }}>
                {feature.description}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full flex items-center justify-center gap-1.5 hover:opacity-80"
                onClick={() => router.push(feature.route)}
              >
                {feature.action}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Next steps */}
        <div className="rounded-2xl p-6" style={{ background: "#22C55E10", border: "2px solid #22C55E30" }}>
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
            <div>
              <h2 className="font-semibold mb-2" style={{ color: "#22C55E" }}>
                Get started in 3 steps
              </h2>
              <ol className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li className="flex gap-2">
                  <span className="font-semibold" style={{ color: "#22C55E" }}>1.</span>
                  <span>Configure your currency and country in <button className="underline hover:no-underline" onClick={() => router.push("/settings")}>Settings</button></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold" style={{ color: "#22C55E" }}>2.</span>
                  <span>Check out the <button className="underline hover:no-underline" onClick={() => router.push("/intelligence")}>Advanced Analytics</button> dashboard</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold" style={{ color: "#22C55E" }}>3.</span>
                  <span>Set up your first <button className="underline hover:no-underline" onClick={() => router.push("/settings?tab=integrations")}>Webhook integration</button> or <button className="underline hover:no-underline" onClick={() => router.push("/clients")}>Client portal</button></span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 font-bold text-base h-11"
            style={{ background: "#22C55E", color: "#0f172a" }}
            onClick={() => router.push("/dashboard")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            className="flex-1 font-bold text-base h-11"
            onClick={() => router.push("/settings")}
          >
            Manage Subscription
          </Button>
        </div>

        {/* Success message */}
        <div className="text-center text-sm space-y-2">
          <div className="flex items-center justify-center gap-2" style={{ color: "#22C55E" }}>
            <CheckCircle2 className="h-5 w-5" />
            <span>Confirmation email sent to your inbox</span>
          </div>
          <p style={{ color: "var(--text-muted)" }}>
            Have questions? Contact support@mystackd.com
          </p>
        </div>
      </div>
    </AppShell>
  );
}
