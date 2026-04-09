"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addIncomeEntry } from "@/lib/data/income";
import { getClients } from "@/lib/data/clients";
import { formatFxLine } from "@/lib/fx";
import type { IncomeEntry } from "@/lib/mock-data";
import { useAuth } from "@/lib/context/AuthContext";

const schema = z.object({
  amount: z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number().positive("Amount must be positive")),
  currency: z.enum(["EUR", "USD", "GBP", "NOK"]),
  date: z.string().min(1, "Date is required"),
  source: z.enum(["stripe", "paypal", "upwork", "fiverr", "manual"]),
  note: z.string().optional(),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddIncomeModalProps {
  onAdded?: (entry: IncomeEntry) => void;
}

export function AddIncomeModal({ onAdded }: AddIncomeModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientNames, setClientNames] = useState<string[]>([]);

  useEffect(() => {
    if (open && user?.id) {
      getClients(user.id).then((clients) =>
        setClientNames(clients.map((c) => c.name))
      );
    }
  }, [open, user?.id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      amount: undefined,
      currency: "EUR",
      date: new Date().toISOString().split("T")[0],
      source: "manual",
      note: "",
      clientName: "",
      projectName: "",
      isRecurring: false,
    },
  });

  const watchedCurrency = form.watch("currency");
  const watchedAmount = form.watch("amount");
  const homeCurrency = user?.currency ?? "EUR";
  const showFxInfo =
    watchedCurrency &&
    watchedAmount &&
    watchedCurrency !== homeCurrency;

  const fxLine =
    showFxInfo && watchedAmount
      ? formatFxLine(watchedAmount, watchedCurrency, homeCurrency)
      : null;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const entry = await addIncomeEntry({
        amount: values.amount,
        currency: values.currency,
        date: values.date,
        source: values.source,
        note: values.note,
        clientName: values.clientName || undefined,
        projectName: values.projectName || undefined,
        isRecurring: values.isRecurring,
      }, user?.id);
      onAdded?.(entry);
      form.reset();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "text-white placeholder-slate-500 text-sm h-9 border-slate-700 focus:border-accent focus:ring-1 focus:ring-accent";
  const labelClass = "text-xs font-medium text-slate-400";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
        style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
      >
        <Plus className="h-4 w-4" />
        Add Income
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-base">Add Income Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
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
                <SelectTrigger className={`${inputClass} bg-[#253555]`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  {["EUR", "USD", "GBP", "NOK"].map((c) => (
                    <SelectItem key={c} value={c} className="text-white text-sm">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* FX info */}
          {fxLine && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
            >
              <span className="text-slate-400">Est. conversion:</span>
              <span className="text-slate-300 font-mono">{fxLine}</span>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Date</Label>
            <Input
              type="date"
              className={inputClass}
              style={{ background: "var(--bg-card)", colorScheme: "dark" }}
              {...form.register("date")}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-red-400">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Source</Label>
            <Select
              defaultValue="manual"
              onValueChange={(v) => v && form.setValue("source", v as FormValues["source"])}
            >
              <SelectTrigger className={`${inputClass} bg-[#253555]`}>
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
                  <SelectItem key={value} value={value} className="text-white text-sm">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client name dropdown */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Client name (optional)</Label>
            {clientNames.length > 0 ? (
              <Select
                value={form.watch("clientName") ?? ""}
                onValueChange={(v) => form.setValue("clientName", v === "__none__" ? "" : v ?? "")}
              >
                <SelectTrigger className={`${inputClass} bg-[#253555]`}>
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

          {/* Project name */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Project name (optional)</Label>
            <Input
              type="text"
              placeholder="e.g. Website Redesign Q2"
              className={inputClass}
              style={{ background: "var(--bg-card)" }}
              {...form.register("projectName")}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Note (optional)</Label>
            <Textarea
              placeholder="e.g. Website redesign for Acme"
              className="text-white placeholder-slate-500 text-sm border-slate-700 resize-none"
              style={{ background: "var(--bg-card)" }}
              rows={2}
              {...form.register("note")}
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              className="h-4 w-4 rounded border-slate-700 accent-[#22C55E]"
              {...form.register("isRecurring")}
            />
            <Label htmlFor="isRecurring" className="text-sm text-slate-300 cursor-pointer">
              This income repeats every month
            </Label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="font-semibold"
              style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding…" : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
