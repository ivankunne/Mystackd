"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";

const schema = z.object({
  email: z.string().min(1, "Enter your username or email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password. Try again.");
    }
  };

  const inputClass =
    "h-10 auth-input text-sm focus:border-accent focus:ring-1 focus:ring-accent";
  const labelClass = "text-xs font-medium auth-label";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
          style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
        >
          M
        </div>
        <span className="font-semibold tracking-tight auth-page-title">MyStackd</span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
      >
        <div className="mb-6">
          <h1 className="text-xl font-semibold auth-page-title">Welcome back</h1>
          <p className="text-sm auth-page-subtitle mt-1">Log in to your MyStackd account</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className={labelClass}>Username or Email</Label>
            <Input
              type="text"
              placeholder="Username or email"
              className={inputClass}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={labelClass}>Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs auth-page-subtitle hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`${inputClass} pr-10`}
                  {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 auth-page-subtitle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-red-400">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div
              className="text-xs text-red-400 px-3 py-2 rounded-lg"
              style={{ background: "#ef444415" }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-semibold h-10"
            style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium hover:underline" style={{ color: "#22C55E" }}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
