"use client";

import { useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { parseCSV, autoMapColumns, mapToImportRows, type ImportRow } from "@/lib/csv";
import { addIncomeEntry } from "@/lib/data/income";
import { useAuth } from "@/lib/context/AuthContext";
import type { IncomeEntry, Currency } from "@/lib/mock-data";

const FIELDS = [
  { key: "date",       label: "Date *",     required: true  },
  { key: "amount",     label: "Amount *",   required: true  },
  { key: "currency",   label: "Currency",   required: false },
  { key: "source",     label: "Source",     required: false },
  { key: "clientName", label: "Client",     required: false },
  { key: "note",       label: "Note",       required: false },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

type Step = "upload" | "map" | "preview";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (entries: IncomeEntry[]) => void;
}

export function ImportIncomeDialog({ open, onOpenChange, onImported }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState<Step>("upload");
  const [csvText, setCsvText]     = useState("");
  const [headers, setHeaders]     = useState<string[]>([]);
  const [rawRows, setRawRows]     = useState<Record<string, string>[]>([]);
  const [mapping, setMapping]     = useState<Record<string, string>>({});
  const [preview, setPreview]     = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError]         = useState("");

  function reset() {
    setStep("upload"); setCsvText(""); setHeaders([]); setRawRows([]);
    setMapping({}); setPreview([]); setError(""); setImporting(false);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  // ── Step 1: parse ────────────────────────────────────────────────────────────

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  }

  function parseCsv(text: string) {
    setError("");
    const { headers: h, rows: r } = parseCSV(text);
    if (h.length === 0) { setError("Could not parse CSV — make sure the first row contains column headers."); return; }
    if (r.length === 0) { setError("No data rows found after the header."); return; }
    setHeaders(h);
    setRawRows(r);
    setMapping(autoMapColumns(h));
    setStep("map");
  }

  // ── Step 2: build preview ────────────────────────────────────────────────────

  function buildPreview() {
    if (!mapping.date || !mapping.amount) {
      setError("Date and Amount columns are required.");
      return;
    }
    setError("");
    const rows = mapToImportRows(rawRows, mapping, (user?.currency ?? "EUR") as Currency);
    setPreview(rows);
    setStep("preview");
  }

  // ── Step 3: import ───────────────────────────────────────────────────────────

  async function handleImport() {
    const valid = preview.filter((r) => r.valid);
    if (valid.length === 0) return;
    setImporting(true);
    try {
      const created: IncomeEntry[] = [];
      for (const row of valid) {
        const entry = await addIncomeEntry({
          amount:     row.amount,
          currency:   row.currency,
          date:       row.date,
          source:     row.source,
          clientName: row.clientName || undefined,
          note:       row.note || undefined,
        });
        created.push(entry);
      }
      onImported(created);
      handleClose(false);
    } finally {
      setImporting(false);
    }
  }

  const validCount   = preview.filter((r) => r.valid).length;
  const invalidCount = preview.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-base" style={{ color: "var(--text-primary)" }}>Import Income from CSV</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs mt-1 mb-4">
          {(["upload", "map", "preview"] as Step[]).map((s, i) => {
            const labels = ["Upload", "Map columns", "Review & import"];
            const done = step === "map" ? i < 1 : step === "preview" ? i < 2 : false;
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px" style={{ background: "var(--border-col)" }} />}
                <span
                  className="px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: active ? "#22C55E20" : done ? "#22C55E10" : "var(--border-col)",
                    color: active ? "#22C55E" : done ? "#22C55E80" : "#64748b",
                  }}
                >
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors hover:border-green-500/40"
              style={{ borderColor: "var(--border-col)" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Drop a CSV file here or <span style={{ color: "#16a34a" }}>click to browse</span></p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Exports from Stripe, PayPal, Wise, bank statements, or your own format</p>
              <input
                ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px" style={{ background: "var(--border-col)" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs text-slate-600" style={{ background: "var(--bg-card)" }}>or paste CSV text</span>
              </div>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Date,Amount,Currency,Client,Note\n2024-03-01,1500,EUR,Acme Corp,Project kickoff"}
              rows={5}
              className="w-full px-3 py-2 rounded-lg text-xs border font-mono resize-none outline-none"
              style={{ color: "var(--text-secondary)", background: "var(--bg-page)", borderColor: "var(--border-col)" }}
            />

            {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                size="sm" onClick={() => parseCsv(csvText)}
                disabled={!csvText.trim()}
                style={{ background: "#16a34a", color: "#ffffff" }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Map columns ── */}
        {step === "map" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {rawRows.length} rows detected. Map your CSV columns to the fields below.
            </p>

            <div className="space-y-2.5">
              {FIELDS.map(({ key, label, required }) => (
                <div key={key} className="grid grid-cols-2 gap-3 items-center">
                  <label className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</label>
                  <select
                    value={mapping[key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                    className="h-9 w-full rounded-md px-3 text-sm border outline-none"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
                  >
                    <option value="">{required ? "— select column —" : "— skip —"}</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Sample preview */}
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold text-slate-500 px-3 py-2 border-b" style={{ borderColor: "var(--border-col)" }}>
                First 3 rows preview
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 3).map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < 2 ? "1px solid var(--border-col)30" : "none" }}>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-slate-400 whitespace-nowrap max-w-[120px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}

            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setStep("upload")}>Back</Button>
              <Button
                size="sm" onClick={buildPreview}
                style={{ background: "#16a34a", color: "#ffffff" }}
              >
                Preview import
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview & import ── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: "#22C55E20", color: "#22C55E" }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {validCount} ready to import
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "#ef444420", color: "#f87171" }}>
                  <X className="h-3.5 w-3.5" />
                  {invalidCount} will be skipped
                </div>
              )}
            </div>

            <div className="rounded-lg overflow-hidden max-h-64 overflow-y-auto" style={{ border: "1px solid var(--border-col)" }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ background: "var(--bg-card)" }}>
                  <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                    <th className="px-3 py-2 text-left text-slate-500">Date</th>
                    <th className="px-3 py-2 text-left text-slate-500">Amount</th>
                    <th className="px-3 py-2 text-left text-slate-500">Source</th>
                    <th className="px-3 py-2 text-left text-slate-500">Client</th>
                    <th className="px-3 py-2 text-left text-slate-500">Note</th>
                    <th className="px-3 py-2 text-left text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: i < preview.length - 1 ? "1px solid var(--border-col)30" : "none",
                        opacity: row.valid ? 1 : 0.45,
                      }}
                    >
                      <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{row.date || "—"}</td>
                      <td className="px-3 py-1.5 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                        {row.valid ? `${row.amount.toLocaleString()} ${row.currency}` : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400">{row.source}</td>
                      <td className="px-3 py-1.5 text-slate-400 max-w-[100px] truncate">{row.clientName || "—"}</td>
                      <td className="px-3 py-1.5 text-slate-400 max-w-[120px] truncate">{row.note || "—"}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {row.valid
                          ? <span style={{ color: "#16a34a" }}>✓</span>
                          : <span style={{ color: "#dc2626" }} title={row.error}>✗ {row.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setStep("map")}>Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => handleClose(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={validCount === 0 || importing}
                  style={{ background: "#16a34a", color: "#ffffff" }}
                >
                  {importing ? "Importing…" : `Import ${validCount} entr${validCount === 1 ? "y" : "ies"}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
