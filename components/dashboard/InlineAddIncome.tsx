"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
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
import { addIncomeEntry } from "@/lib/data/income";
import { getClients } from "@/lib/data/clients";
import type { IncomeEntry } from "@/lib/mock-data";
import { useAuth } from "@/lib/context/AuthContext";

const schema = z.object({
  amount: z.preprocess(
    (v) => (v === "" ? undefined : Number(v)),
    z.number().positive("Amount must be positive")
  ),
  currency: z.enum(["EUR", "USD", "GBP", "NOK"]),
  source: z.enum(["stripe", "paypal", "upwork", "fiverr", "manual"]),
  clientName: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof schema>;

interface InlineAddIncomeProps {
  onAdded?: (entry: IncomeEntry) => void;
}

export function InlineAddIncome({ onAdded }: InlineAddIncomeProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const [clientNames, setClientNames] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      getClients(user.id).then((c) => setClientNames(c.map((cl) => cl.name)));
    }
  }, [user?.id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      amount: undefined,
      currency: "EUR",
      source: "manual",
      clientName: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const entry = await addIncomeEntry({
        amount: values.amount,
        currency: values.currency,
        source: values.source,
        date: values.date,
        clientName: values.clientName || undefined,
      }, user?.id);
      onAdded?.(entry);
      form.reset();
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-9 text-sm focus:border-accent";
  const labelClass = "text-xs font-medium";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
      >
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ background: "#dcfce7" }}
          >
            💰
          </div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Log your first income</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Add an entry to see your dashboard come to life.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Amount + Currency */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className={labelClass}>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className={inputClass}
                style={{ background: "var(--bg-card)" }}
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-400">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="w-28 space-y-1.5">
              <Label className={labelClass}>Currency</Label>
              <Select
                defaultValue="EUR"
                onValueChange={(v) => v && form.setValue("currency", v as FormValues["currency"])}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  {["EUR", "USD", "GBP", "NOK"].map((c) => (
                    <SelectItem key={c} value={c} className="text-white text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Source</Label>
            <Select
              defaultValue="manual"
              onValueChange={(v) => v && form.setValue("source", v as FormValues["source"])}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                {[
                  { value: "stripe", label: "Stripe" },
                  { value: "paypal", label: "PayPal" },
                  { value: "upwork", label: "Upwork" },
                  { value: "fiverr", label: "Fiverr" },
                  { value: "manual", label: "Manual" },
                ].map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-white text-sm">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Client (optional)</Label>
            {clientNames.length > 0 ? (
              <Select
                value={form.watch("clientName") ?? ""}
                onValueChange={(v) => form.setValue("clientName", v === "__none__" ? "" : v ?? "")}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <SelectItem value="__none__" className="text-slate-400 text-sm">No client</SelectItem>
                  {clientNames.map((name) => (
                    <SelectItem key={name} value={name} className="text-white text-sm">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                placeholder="e.g. Acme Corp"
                className={inputClass}
                style={{ background: "var(--bg-card)" }}
                {...form.register("clientName")}
              />
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Date</Label>
            <Input
              type="date"
              className={inputClass}
              style={{ background: "var(--bg-card)", colorScheme: "light" }}
              {...form.register("date")}
            />
          </div>

          <Button
            type="submit"
            className="w-full font-semibold mt-2"
            style={{ background: "#16a34a", color: "#ffffff" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding…" : added ? "Added!" : "Add income"}
          </Button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          or{" "}
          <Link href="/connections" className="underline underline-offset-2" style={{ color: "var(--text-secondary)" }}>
            connect a source →
          </Link>
        </p>
      </div>
    </div>
  );
}
