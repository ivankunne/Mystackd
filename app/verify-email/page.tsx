"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const [resent, setResent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    if (!user?.email) return;
    setIsSending(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email: user.email });
    setIsSending(false);
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "#22C55E15", border: "1px solid #22C55E30" }}
          >
            <Mail className="h-10 w-10" style={{ color: "#22C55E" }} />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Check your inbox</h1>
          <p className="text-sm text-slate-400">
            We sent a verification link to{" "}
            <span className="text-white font-medium">{user?.email ?? "your email address"}</span>
          </p>
        </div>

        {/* Resend */}
        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={isSending || resent}
            variant="outline"
            className="w-full border-[var(--border-col)] hover:border-[var(--border-col)] hover:border-slate-500"
            style={{ background: "transparent" }}
          >
            {isSending ? "Sending…" : resent ? "Sent!" : "Didn't receive it? Resend email"}
          </Button>

          <Link
            href="/login"
            className="block text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#22C55E" }}
          >
            Already verified? Log in →
          </Link>
        </div>

        {/* Spam note */}
        <p className="text-xs text-slate-600">
          Check your spam folder if you don&apos;t see it.
        </p>
      </div>
    </div>
  );
}
