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
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await signup(values.name, values.email, values.password);
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const inputClass =
    "h-10 text-sm focus:border-accent focus:ring-1 focus:ring-accent";
  const labelClass = "text-xs font-medium";

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
        <span className="font-semibold text-white tracking-tight">MyStackd</span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
      >
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="text-sm text-slate-400 mt-1">
            Free forever. No credit card required.
          </p>
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium text-white transition-colors hover:bg-white/5 mb-4"
          style={{ border: "1px solid var(--border-col)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "var(--border-col)" }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 text-slate-500" style={{ background: "var(--bg-card)" }}>
              or sign up with email
            </span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className={labelClass}>Full name</Label>
            <Input
              type="text"
              placeholder="Ivan de Vries"
              className={inputClass}
              style={{ background: "var(--bg-card)" }}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              className={inputClass}
              style={{ background: "var(--bg-card)" }}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                className={`${inputClass} pr-10`}
                style={{ background: "var(--bg-card)" }}
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
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
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-xs text-slate-500">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-slate-400 hover:text-white">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-slate-400 hover:text-white">
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        <p className="text-center text-xs text-slate-500 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
