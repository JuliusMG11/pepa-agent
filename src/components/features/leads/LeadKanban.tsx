"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { updateLeadStatus } from "@/app/(dashboard)/leads/actions";
import { toast } from "@/components/ui/toaster";
import type { LeadPipelineRow, LeadStatus } from "@/lib/data/clients";

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "Nový", color: "var(--color-brand)" },
  { id: "contacted", label: "Kontaktován", color: "#d97706" },
  { id: "viewing_scheduled", label: "Prohlídka", color: "#0369a1" },
  { id: "offer_made", label: "Nabídka", color: "#7e22ce" },
  { id: "closed_won", label: "Uzavřen ✓", color: "#166534" },
  { id: "closed_lost", label: "Uzavřen ✗", color: "#991b1b" },
];

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function formatPriceCzk(n: number | null): string | null {
  if (n == null || n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface LeadCardProps {
  lead: LeadPipelineRow;
  onSelect: (lead: LeadPipelineRow) => void;
  isDragging?: boolean;
}

function LeadCard({ lead, onSelect, isDragging }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.4 : 1,
      }
    : {};

  const priceLabel = formatPriceCzk(lead.property_price);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="px-1 py-1.5 rounded-xl select-none w-full"
      tabIndex={0}
    >
      <div
        className="relative rounded-xl p-3 pt-3 pr-11 w-full min-w-0"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.22)",
          boxShadow: "0 2px 10px rgba(70,72,212,0.06)",
        }}
      >
        <button
          type="button"
          className="absolute right-1 top-1.5 z-10 w-8 h-8 flex items-center justify-center rounded-lg touch-none cursor-grab active:cursor-grabbing shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Přesunout kartu"
          {...listeners}
        >
          <GripVertical size={15} strokeWidth={2} />
        </button>

        <div className="flex flex-col gap-2 w-full min-w-0">
          {/* Klient */}
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
              style={{
                backgroundColor: "rgba(70,72,212,0.12)",
                color: "var(--color-brand)",
              }}
            >
              {initials(lead.client_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-bold leading-snug wrap-break-word"
                style={{ color: "var(--color-text-primary)" }}
              >
                {lead.client_name}
              </p>
            </div>
          </div>

          {/* Nemovitost — vždy pod sebou */}
          {(lead.property_title || lead.property_address || priceLabel) && (
            <div
              className="flex flex-col gap-1 pl-[42px] -mt-0.5 border-l-2 min-w-0"
              style={{ borderColor: "rgba(70,72,212,0.2)" }}
            >
              {lead.property_title && (
                <p className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
                  {lead.property_title}
                </p>
              )}
              {lead.property_address && (
                <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                  {lead.property_address}
                </p>
              )}
              {priceLabel && (
                <p className="text-[11px] font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  {priceLabel}
                </p>
              )}
            </div>
          )}

          {/* Meta + akce */}
          <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: "rgba(199,196,215,0.25)" }}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-medium whitespace-nowrap">Aktualizace před {daysAgo(lead.updated_at)} dny</span>
              {lead.agent_name && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="truncate min-w-0 max-w-full" title={lead.agent_name}>
                    {lead.agent_name}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              className="w-full text-center text-[11px] font-bold py-2 rounded-lg transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: "rgba(70,72,212,0.12)", color: "var(--color-brand)" }}
              onClick={() => onSelect(lead)}
            >
              Zobrazit detail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DroppableColumnProps {
  column: (typeof COLUMNS)[number];
  leads: LeadPipelineRow[];
  activeId: string | null;
  onSelect: (lead: LeadPipelineRow) => void;
}

function DroppableColumn({ column, leads, activeId, onSelect }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-[240px] shrink-0 flex-col">
      {/* Column header */}
      <div className="flex shrink-0 items-center gap-2 px-3 mb-3">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <p className="text-xs font-bold flex-1" style={{ color: "var(--color-text-primary)" }}>
          {column.label}
        </p>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }}
        >
          {leads.length}
        </span>
      </div>

      {/* Drop zone — vertikální scroll uvnitř sloupce */}
      <div
        ref={setNodeRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl p-2 space-y-2 transition-colors [scrollbar-gutter:stable]"
        style={{
          backgroundColor: isOver
            ? "rgba(70,72,212,0.06)"
            : "rgba(246,242,250,0.5)",
          border: isOver
            ? "2px dashed rgba(70,72,212,0.3)"
            : "2px dashed transparent",
        }}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSelect={onSelect}
            isDragging={activeId === lead.id}
          />
        ))}
        {leads.length === 0 && (
          <div className="h-20 flex items-center justify-center">
            <p className="text-[10px]" style={{ color: "#c7c4d7" }}>
              Přetáhněte sem
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface LeadKanbanProps {
  leads: LeadPipelineRow[];
  onSelectLead: (lead: LeadPipelineRow) => void;
}

export function LeadKanban({ leads, onSelectLead }: LeadKanbanProps) {
  const [localLeads, setLocalLeads] = useState(leads);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const leadsByStatus = COLUMNS.reduce<Record<string, LeadPipelineRow[]>>(
    (acc, col) => {
      acc[col.id] = localLeads.filter((l) => l.status === col.id);
      return acc;
    },
    {}
  );

  const activeLead = activeId
    ? localLeads.find((l) => l.id === activeId) ?? null
    : null;
  const activeLeadPriceLabel = activeLead
    ? formatPriceCzk(activeLead.property_price)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const newStatus = over.id as LeadStatus;
      const leadId = active.id as string;

      // Optimistic update
      setLocalLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l))
      );

      const result = await updateLeadStatus(leadId, newStatus);
      if (!result.success) {
        setLocalLeads(leads);
        toast.error(result.error ?? "Přesun leadu se nepodařil");
        return;
      }
      const colLabel =
        COLUMNS.find((c) => c.id === newStatus)?.label ?? newStatus;
      toast.success(`Lead přesunut do „${colLabel}“`);
    },
    [leads]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Jeden box: vertikální i horizontální scroll najednou — ne každý sloupec zvlášť */}
        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl p-2 [scrollbar-gutter:stable]"
          style={{ backgroundColor: "rgba(246,242,250,0.35)" }}
        >
          <div className="flex min-w-min gap-4 items-start pb-1">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              leads={leadsByStatus[col.id] ?? []}
              activeId={activeId}
              onSelect={onSelectLead}
            />
          ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeLead && (
          <div
            className="p-3 rounded-xl rotate-2 opacity-95 w-[min(100vw-2rem,260px)] min-w-0"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid rgba(70,72,212,0.3)",
              boxShadow: "0 8px 24px rgba(70,72,212,0.15)",
            }}
          >
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-[13px] font-bold leading-snug wrap-break-word" style={{ color: "var(--color-text-primary)" }}>
                {activeLead.client_name}
              </p>
              {activeLead.property_title && (
                <p className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
                  {activeLead.property_title}
                </p>
              )}
              {activeLead.property_address && (
                <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                  {activeLead.property_address}
                </p>
              )}
              {activeLeadPriceLabel && (
                <p className="text-[11px] font-bold tabular-nums pt-0.5" style={{ color: "var(--color-text-primary)" }}>
                  {activeLeadPriceLabel}
                </p>
              )}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
