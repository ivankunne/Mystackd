"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const labelClass = "text-xs font-medium auth-label";
  const inputClass = "auth-input h-10 text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 auth-page">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#22C55E20", border: "1px solid #22C55E40" }}
          >
            <KeyRound className="h-5 w-5" style={{ color: "#22C55E" }} />
          </div>
          <h1 className="text-xl font-bold auth-page-title">Reset your password</h1>
          <p className="text-sm auth-page-subtitle mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Email address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-semibold h-10"
              style={{ background: "#22C55E", color: "#0a0f0a" }}
            >
              {isLoading ? "Sending…" : "Send reset link"}
            </Button>

            <p className="text-center text-xs auth-page-subtitle">
              <Link href="/login" className="hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </Link>
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <p className="text-sm font-semibold auth-page-title mb-1">Check your inbox</p>
              <p className="text-xs auth-page-subtitle leading-relaxed">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly. Check your spam folder if it doesn&apos;t arrive.
              </p>
            </div>

            <Link href="/login">
              <Button
                className="w-full font-semibold h-10"
                style={{ background: "#22C55E", color: "#0a0f0a" }}
              >
                Back to login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
