"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { ArrowLeft, CheckCircle2, PenLine, Clock } from "lucide-react";
import { getContracts, updateContract } from "@/lib/data/contracts";
import { useAuth } from "@/lib/context/AuthContext";
import { formatCurrency } from "@/lib/calculations";
import type { Contract } from "@/lib/mock-data";

const RATE_LABEL: Record<string, string> = {
  fixed: "fixed price", hourly: "per hour", monthly: "per month",
};

function SigBlock({
  label,
  name,
  date,
  inputName,
  onInputChange,
  onSign,
  signing,
  disabled,
}: {
  label: string;
  name?: string;
  date?: string;
  inputName: string;
  onInputChange: (v: string) => void;
  onSign: () => void;
  signing: boolean;
  disabled: boolean;
}) {
  const signed = !!name && !!date;

  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{ background: "var(--bg-card)", border: `1px solid ${signed ? "#22C55E40" : "var(--border-col)"}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>

      {signed ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
            <p className="text-base font-bold text-white" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
              {name}
            </p>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            Signed {dayjs(date).format("MMMM D, YYYY [at] HH:mm")}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Awaiting signature
          </div>
          {!disabled && (
            <>
              <input
                type="text"
                value={inputName}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Type full legal name…"
                className="w-full h-9 px-3 rounded-lg text-sm text-white placeholder-slate-600 border outline-none"
                style={{ background: "var(--bg-page)", borderColor: "var(--border-col)" }}
              />
              <button
                onClick={onSign}
                disabled={signing || !inputName.trim()}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
              >
                <PenLine className="h-3.5 w-3.5" />
                {signing ? "Signing…" : "Sign contract"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContractSignPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [freelancerInput, setFreelancerInput] = useState("");
  const [signingFreelancer, setSigningFreelancer] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    getContracts(user?.id).then((all) => {
      const c = all.find((x) => x.id === id);
      if (c) {
        setContract(c);
        if (!freelancerInput && !c.freelancerSignatureName) {
          setFreelancerInput(user?.name ?? "");
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleFreelancerSign = async () => {
    if (!contract || !freelancerInput.trim()) return;
    setSigningFreelancer(true);
    try {
      const bothSigned = !!contract.clientSignatureName;
      const updated = await updateContract(contract.id, {
        freelancerSignatureName: freelancerInput.trim(),
        signedAt: new Date().toISOString(),
        status: bothSigned ? "signed" : contract.status === "draft" ? "sent" : contract.status,
      });
      setContract(updated);
    } finally {
      setSigningFreelancer(false);
    }
  };

  const bothSigned = !!(contract?.freelancerSignatureName && contract?.clientSignatureName);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg-page)" }}>
        <p className="text-white font-semibold">Contract not found</p>
        <button onClick={() => router.push("/contracts")} className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to contracts
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Nav */}
        <button
          onClick={() => router.push("/contracts")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to contracts
        </button>

        {/* Fully signed banner */}
        {bothSigned && (
          <div
            className="rounded-xl px-5 py-4 flex items-center gap-3"
            style={{ background: "#22C55E15", border: "1px solid #22C55E40" }}
          >
            <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-400">Contract fully executed</p>
              <p className="text-xs text-slate-400">Both parties have signed. This contract is legally binding.</p>
            </div>
          </div>
        )}

        {/* Document */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b" style={{ borderColor: "var(--border-col)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Service Agreement</p>
                <h1 className="text-xl font-bold text-white">{contract.projectName}</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Between <span className="text-white font-medium">{user?.name ?? "Freelancer"}</span> and{" "}
                  <span className="text-white font-medium">{contract.clientName}</span>
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500 mb-0.5">Contract ID</p>
                <p className="text-xs font-mono text-slate-400">{contract.id}</p>
                <p className="text-xs text-slate-500 mt-2 mb-0.5">Created</p>
                <p className="text-xs text-slate-400">{dayjs(contract.createdAt).format("MMM D, YYYY")}</p>
              </div>
            </div>
          </div>

          {/* Terms grid */}
          <div className="px-8 py-6 space-y-6">

            {/* Key terms */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Rate", value: `${formatCurrency(contract.rate, contract.currency)} ${RATE_LABEL[contract.rateType]}` },
                { label: "Payment terms", value: `Net ${contract.paymentTermsDays} days` },
                { label: "Start date", value: dayjs(contract.startDate).format("MMM D, YYYY") },
                { label: "End date", value: contract.endDate ? dayjs(contract.endDate).format("MMM D, YYYY") : "Open-ended" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg-page)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Scope */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Scope of work</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{contract.scope}</p>
            </div>

            {/* Deliverables */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Deliverables</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{contract.deliverables}</p>
            </div>

            {/* Optional clauses */}
            {(contract.revisionPolicy || contract.terminationClause) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {contract.revisionPolicy && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Revision policy</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{contract.revisionPolicy}</p>
                  </div>
                )}
                {contract.terminationClause && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Termination</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{contract.terminationClause}</p>
                  </div>
                )}
              </div>
            )}

            {contract.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Additional notes</p>
                <p className="text-sm text-slate-400 leading-relaxed">{contract.notes}</p>
              </div>
            )}

            {/* Divider */}
            <div className="h-px" style={{ background: "var(--border-col)" }} />

            {/* Signature blocks */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Signatures</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SigBlock
                  label={`Service provider — ${user?.name ?? "Freelancer"}`}
                  name={contract.freelancerSignatureName}
                  date={contract.signedAt}
                  inputName={freelancerInput}
                  onInputChange={setFreelancerInput}
                  onSign={handleFreelancerSign}
                  signing={signingFreelancer}
                  disabled={!!contract.freelancerSignatureName}
                />
                <SigBlock
                  label={`Client — ${contract.clientName}`}
                  name={contract.clientSignatureName}
                  date={contract.clientSignedAt}
                  inputName=""
                  onInputChange={() => {}}
                  onSign={() => {}}
                  signing={false}
                  disabled={true}
                />
              </div>
              {!contract.clientSignatureName && (
                <p className="text-xs text-slate-600 mt-3">
                  Client signs via their portal link. Once both parties have signed, the contract status updates to Signed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
