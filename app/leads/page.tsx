"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, ChevronRight, Trash2, UserPlus, X, Info, Search, GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getLeads, createLead, moveLead, updateLead, deleteLead } from "@/lib/data/leads";
import { createClient } from "@/lib/data/clients";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { formatCurrency } from "@/lib/calculations";
import type { Lead, LeadStage, LeadSource, Currency } from "@/lib/mock-data";

// ─── Stage config ──────────────────────────────────────────────────────────────

const STAGES: { id: LeadStage; label: string; color: string; desc: string }[] = [
  { id: "prospect",  label: "Prospect",      color: "#64748b", desc: "Initial contact made" },
  { id: "qualified", label: "Qualified",     color: "#3B82F6", desc: "Budget & fit confirmed" },
  { id: "proposal",  label: "Proposal Sent", color: "#f59e0b", desc: "Waiting on decision" },
  { id: "won",       label: "Won",           color: "#22C55E", desc: "Closed — convert to client" },
  { id: "lost",      label: "Lost",          color: "#ef4444", desc: "Did not convert" },
];

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "referral",  label: "Referral" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "upwork",    label: "Upwork" },
  { value: "fiverr",    label: "Fiverr" },
  { value: "website",   label: "Website" },
  { value: "cold",      label: "Cold outreach" },
  { value: "other",     label: "Other" },
];

function nextStage(stage: LeadStage): LeadStage | null {
  const order: LeadStage[] = ["prospect", "qualified", "proposal", "won"];
  const idx = order.indexOf(stage);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
}

// ─── Lead card ─────────────────────────────────────────────────────────────────

function LeadCardContent({
  lead,
  onMove,
  onDelete,
  onConvert,
  currency,
  isDragging,
  dragHandleProps,
}: {
  lead: Lead;
  onMove: (id: string, stage: LeadStage) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
  currency: string;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const stage = STAGES.find((s) => s.id === lead.stage)!;
  const next = nextStage(lead.stage);
  const nextStageConfig = next ? STAGES.find((s) => s.id === next) : null;

  return (
    <div
      className={`rounded-xl p-4 space-y-3 group transition-shadow ${isDragging ? "shadow-2xl opacity-80 rotate-1" : ""}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...dragHandleProps}
          className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 transition-colors"
          title="Drag to move"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{lead.company}</p>
          <p className="text-xs text-slate-400 truncate">{lead.name}</p>
        </div>
        <button
          onClick={() => onDelete(lead.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {lead.estimatedValue && (
        <p className="text-base font-bold" style={{ color: stage.color }}>
          {formatCurrency(lead.estimatedValue, lead.currency)}
        </p>
      )}

      {lead.notes && (
        <p className="text-xs text-slate-500 line-clamp-2">{lead.notes}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ background: `${stage.color}20`, color: stage.color }}>
          {SOURCES.find((s) => s.value === lead.source)?.label ?? lead.source}
        </span>
        <span className="text-[10px] text-slate-600">
          {dayjs(lead.updatedAt).format("MMM D")}
        </span>
      </div>

      {/* Actions */}
      {lead.stage !== "won" && lead.stage !== "lost" && nextStageConfig && (
        <button
          onClick={() => onMove(lead.id, next!)}
          className="w-full text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
          style={{ background: `${nextStageConfig.color}15`, color: nextStageConfig.color }}
        >
          Move to {nextStageConfig.label}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {lead.stage === "won" && !lead.convertedToClientId && (
        <button
          onClick={() => onConvert(lead)}
          className="w-full text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
          style={{ background: "#22C55E15", color: "#22C55E" }}
        >
          <UserPlus className="h-3 w-3" />
          Convert to client
        </button>
      )}
      {lead.convertedToClientId && (
        <div
          className="w-full text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1"
          style={{ background: "#22C55E10", color: "#22C55E80" }}
        >
          <UserPlus className="h-3 w-3" />
          Added as client
        </div>
      )}

      {lead.stage === "lost" && (
        <button
          onClick={() => onMove(lead.id, "prospect")}
          className="w-full text-xs font-medium py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--border-col)", color: "#94a3b8" }}
        >
          Reopen
        </button>
      )}
    </div>
  );
}

function LeadCard(props: Omit<React.ComponentProps<typeof LeadCardContent>, "dragHandleProps" | "isDragging">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.lead.id, data: { stage: props.lead.stage } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LeadCardContent {...props} isDragging={false} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────

function Column({
  stage,
  leads,
  onMove,
  onDelete,
  onConvert,
  currency,
}: {
  stage: typeof STAGES[number];
  leads: Lead[];
  onMove: (id: string, s: LeadStage) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
  currency: string;
}) {
  // Register the column as a droppable target so cards can be dropped onto it
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 min-w-[220px] flex-1 rounded-xl transition-colors">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {stage.label}
          </span>
          <span className="text-xs font-medium px-1.5 rounded-full" style={{ background: "var(--border-col)", color: "#94a3b8" }}>
            {leads.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs text-slate-500">
            {formatCurrency(total, currency)}
          </span>
        )}
      </div>

      {/* Cards — ref makes this div a drop target */}
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="space-y-2 px-1 pb-1 rounded-xl transition-all"
          style={{
            minHeight: "80px",
            background: isOver ? `${stage.color}12` : "transparent",
            outline: isOver ? `2px dashed ${stage.color}70` : "2px dashed transparent",
          }}
        >
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onMove={onMove} onDelete={onDelete} onConvert={onConvert} currency={currency} />
          ))}
          {leads.length === 0 && (
            <div
              className="rounded-xl h-20 flex items-center justify-center border border-dashed"
              style={{ borderColor: isOver ? `${stage.color}80` : "#2B3D6060" }}
            >
              <span className="text-xs" style={{ color: isOver ? stage.color : "#475569" }}>
                {isOver ? `Drop here` : stage.desc}
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const currency = user?.currency ?? "EUR";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null); // kept for DragOverlay context

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Form state
  const [fName, setFName] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fSource, setFSource] = useState<LeadSource>("referral");
  const [fStage, setFStage] = useState<LeadStage>("prospect");
  const [fValue, setFValue] = useState("");
  const [fNotes, setFNotes] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    getLeads(user?.id).then((data) => {
      if (mounted) { setLeads(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const handleMove = async (id: string, stage: LeadStage) => {
    const updated = await moveLead(id, stage);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleConvertToClient = async (lead: Lead) => {
    const client = await createClient({
      userId: user?.id ?? "user_mock_001",
      name: lead.company,
      email: lead.email,
      company: lead.company,
      notes: lead.notes ? `Contact: ${lead.name}\n${lead.notes}` : `Contact: ${lead.name}`,
    });
    const updated = await updateLead(lead.id, { convertedToClientId: client.id });
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    toast(`${lead.company} added as a client`);
  };

  const handleDelete = async (id: string) => {
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveDragLead(lead ?? null);
  }, [leads]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverStage(null); return; }
    // over.id is either a stage id (column droppable) or a lead id (sortable card)
    if (STAGES.some((s) => s.id === over.id)) {
      setOverStage(over.id as LeadStage);
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      setOverStage(overLead?.stage ?? null);
    }
  }, [leads]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragLead(null);
    setOverStage(null);
    const { active, over } = event;
    if (!over) return;

    const lead = leads.find((l) => l.id === active.id);
    if (!lead) return;

    // Determine target stage: column drop (over.id = stage id) or card drop (find card's stage)
    let targetStage: LeadStage = lead.stage;
    if (STAGES.some((s) => s.id === over.id)) {
      targetStage = over.id as LeadStage;
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) targetStage = overLead.stage;
    }

    if (targetStage !== lead.stage) {
      await handleMove(lead.id, targetStage);
    }
  }, [leads]);

  const handleCreate = async () => {
    if (!fName || !fCompany) return;
    setIsCreating(true);
    try {
      const lead = await createLead({
        userId: user?.id ?? "user_mock_001",
        name: fName,
        company: fCompany,
        email: fEmail || undefined,
        source: fSource,
        stage: fStage,
        estimatedValue: fValue ? parseFloat(fValue) : undefined,
        currency: (user?.currency ?? "EUR") as Currency,
        notes: fNotes || undefined,
      });
      setLeads((prev) => [lead, ...prev]);
      setCreateOpen(false);
      setFName(""); setFCompany(""); setFEmail(""); setFValue(""); setFNotes("");
      setFSource("referral"); setFStage("prospect");
      toast(`${lead.company} added to pipeline`);
    } finally {
      setIsCreating(false);
    }
  };

  // Stats
  const active = leads.filter((l) => l.stage !== "lost");
  const pipelineValue = active.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const wonThisMonth = leads.filter((l) => l.stage === "won" &&
    dayjs(l.updatedAt).isSame(dayjs(), "month")).reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const winRate = leads.length > 0
    ? Math.round((leads.filter((l) => l.stage === "won").length / leads.filter((l) => l.stage === "won" || l.stage === "lost").length || 0) * 100)
    : 0;

  const inputClass = "h-9 text-sm";
  const labelClass = "text-xs font-medium";

  return (
    <AppShell title="Lead Pipeline">
      <div className="p-5 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline value</p>
              <p className="text-xl font-bold text-white">{formatCurrency(pipelineValue, currency)}</p>
            </div>
            <div className="w-px" style={{ background: "var(--border-col)" }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Won this month</p>
              <p className="text-xl font-bold" style={{ color: "#22C55E" }}>{formatCurrency(wonThisMonth, currency)}</p>
            </div>
            <div className="w-px" style={{ background: "var(--border-col)" }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Win rate</p>
              <p className="text-xl font-bold text-white">{winRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search leads…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 pr-3 rounded-lg text-sm border w-44"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
              />
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="font-semibold"
              style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Lead
            </Button>
          </div>
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((s) => (
              <div key={s.id} className="min-w-[220px] flex-1 space-y-2">
                <div className="h-5 w-24 rounded animate-pulse" style={{ background: "var(--bg-card)" }} />
                <div className="h-32 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }} />
                <div className="h-24 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }} />
              </div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                leads={filteredLeads.filter((l) => l.stage === stage.id)}
                onMove={handleMove}
                onDelete={handleDelete}
                onConvert={handleConvertToClient}
                currency={currency}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragLead ? (
              <LeadCardContent
                lead={activeDragLead}
                onMove={() => {}}
                onDelete={() => {}}
                onConvert={() => {}}
                currency={currency}
                isDragging
              />
            ) : null}
          </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base" style={{ color: "var(--text-primary)" }}>New Lead</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Contact name *</Label>
                <Input value={fName} onChange={(e) => setFName(e.target.value)}
                  placeholder="Sarah Mitchell" className={inputClass} style={{ background: "var(--bg-page)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Company *</Label>
                <Input value={fCompany} onChange={(e) => setFCompany(e.target.value)}
                  placeholder="Bloom Digital" className={inputClass} style={{ background: "var(--bg-page)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Email</Label>
              <Input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
                placeholder="sarah@example.com" className={inputClass} style={{ background: "var(--bg-page)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Stage</Label>
                <select
                  value={fStage}
                  onChange={(e) => setFStage(e.target.value as LeadStage)}
                  className="w-full h-9 px-3 rounded-md text-sm border outline-none"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
                >
                  {STAGES.filter((s) => s.id !== "won" && s.id !== "lost").map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Source</Label>
                <select
                  value={fSource}
                  onChange={(e) => setFSource(e.target.value as LeadSource)}
                  className="w-full h-9 px-3 rounded-md text-sm border outline-none"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
                >
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Estimated value ({currency})</Label>
              <Input type="number" value={fValue} onChange={(e) => setFValue(e.target.value)}
                placeholder="5000" className={inputClass} style={{ background: "var(--bg-page)" }} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Notes</Label>
              <textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder="Budget, timeline, requirements…"
                rows={3}
                className="w-full px-3 py-2 rounded-md text-sm border resize-none outline-none"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" style={{ color: "var(--text-secondary)" }}
                onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                size="sm"
                className="font-semibold"
                style={{ background: "#16a34a", color: "#ffffff" }}
                disabled={isCreating || !fName || !fCompany}
              >
                {isCreating ? "Adding…" : "Add Lead"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
