"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import { Check, Loader2 } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/calculations";
import type { Proposal } from "@/lib/mock-data";

function rowToProposal(row: Record<string, unknown>): Proposal {
  return {
    id:                      row.id as string,
    userId:                  row.user_id as string,
    clientId:                row.client_id as string,
    clientName:              row.client_name as string,
    projectName:             row.project_name as string,
    status:                  row.status as Proposal["status"],
    items:                   (row.items ?? []) as Proposal["items"],
    currency:                row.currency as Proposal["currency"],
    subtotal:                row.subtotal as number,
    total:                   row.total as number,
    validUntil:              row.valid_until as string,
    scope:                   row.scope as string | undefined,
    deliverables:            row.deliverables as string | undefined,
    notes:                   row.notes as string | undefined,
    createdAt:               row.created_at as string,
    sentAt:                  row.sent_at as string | undefined,
    respondedAt:             row.responded_at as string | undefined,
    convertedToInvoiceId:    row.converted_to_invoice_id as string | undefined,
    convertedToContractId:   row.converted_to_contract_id as string | undefined,
    convertedToProjectId:    row.converted_to_project_id as string | undefined,
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "Draft",    color: "#94a3b8", bg: "#64748b20" },
  sent:     { label: "Sent",     color: "#60a5fa", bg: "#3b82f620" },
  accepted: { label: "Accepted", color: "#22C55E", bg: "#22C55E20" },
  declined: { label: "Declined", color: "#f87171", bg: "#ef444420" },
  expired:  { label: "Expired",  color: "#f59e0b", bg: "#f59e0b20" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const supabase = createPublicClient();

async function fetchProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToProposal(data as Record<string, unknown>);
}

async function respondToProposal(id: string, status: "accepted" | "declined"): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from("proposals")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return null;
  return rowToProposal(data as Record<string, unknown>);
}

export default function PublicProposalPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProposal(id as string).then((p) => {
      setProposal(p);
      setLoading(false);
    });
  }, [id]);

  const handleAccept = async () => {
    if (!proposal) return;
    setAccepting(true);
    try {
      const updated = await respondToProposal(proposal.id, "accepted");
      if (updated) { setProposal(updated); setResponded(true); }
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!proposal) return;
    setDeclining(true);
    try {
      const updated = await respondToProposal(proposal.id, "declined");
      if (updated) { setProposal(updated); setResponded(true); }
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-page)" }}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--bg-page)" }}>
        <div className="text-center space-y-3">
          <p className="text-5xl font-bold text-slate-700">404</p>
          <p className="text-base font-semibold text-white">Proposal not found</p>
          <p className="text-sm text-slate-400">This proposal may have expired or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[proposal.status];
  const isExpired = dayjs(proposal.validUntil).isBefore(dayjs(), "day");
  const canRespond = proposal.status === "sent" && !isExpired;

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
            style={{ background: status.bg, color: status.color }}>
            {status.label}
          </div>
          <h1 className="text-2xl font-bold text-white">{proposal.projectName}</h1>
          <p className="text-sm text-slate-400">
            Prepared for <span className="text-white font-medium">{proposal.clientName}</span>
            {" · "}Valid until {dayjs(proposal.validUntil).format("MMMM D, YYYY")}
          </p>
        </div>

        {/* Scope */}
        {proposal.scope && (
          <div className="rounded-xl p-5 space-y-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scope of Work</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{proposal.scope}</p>
          </div>
        )}

        {/* Deliverables */}
        {proposal.deliverables && (
          <div className="rounded-xl p-5 space-y-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deliverables</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{proposal.deliverables}</p>
          </div>
        )}

        {/* Line items */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border-col)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-col)" }}>
            {proposal.items.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-white">{item.description}</p>
                  {item.quantity !== 1 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.quantity} × {formatCurrency(item.unitPrice, proposal.currency)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-white flex-shrink-0">
                  {formatCurrency(item.total, proposal.currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "var(--border-col)", background: "var(--bg-page)" }}>
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-lg font-bold text-white">
              {formatCurrency(proposal.total, proposal.currency)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="rounded-xl p-5 space-y-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes & Payment Terms</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{proposal.notes}</p>
          </div>
        )}

        {/* Response buttons */}
        {canRespond && !responded && (
          <div className="rounded-xl p-5 flex flex-col sm:flex-row items-center gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
            <p className="text-sm text-slate-400 flex-1">
              Do you accept this proposal?
            </p>
            <button
              onClick={handleDecline}
              disabled={declining}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#ef444420", color: "#f87171", border: "1px solid #ef444440" }}>
              {declining ? "Declining…" : "Decline"}
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#22C55E", color: "#0a1628" }}>
              {accepting ? "Accepting…" : "Accept proposal"}
            </button>
          </div>
        )}

        {/* Accepted confirmation */}
        {proposal.status === "accepted" && (
          <div className="rounded-xl p-5 flex items-center gap-3"
            style={{ background: "#22C55E10", border: "1px solid #22C55E30" }}>
            <Check className="h-5 w-5 flex-shrink-0" style={{ color: "#22C55E" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>Proposal accepted</p>
              {proposal.respondedAt && (
                <p className="text-xs text-slate-400 mt-0.5">
                  On {dayjs(proposal.respondedAt).format("MMMM D, YYYY")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Expired notice */}
        {isExpired && proposal.status === "sent" && (
          <div className="rounded-xl p-4 text-center"
            style={{ background: "#f59e0b10", border: "1px solid #f59e0b30" }}>
            <p className="text-sm font-medium" style={{ color: "#f59e0b" }}>
              This proposal expired on {dayjs(proposal.validUntil).format("MMMM D, YYYY")}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 pb-4">
          Powered by Mystackd
        </p>
      </div>
    </div>
  );
}
