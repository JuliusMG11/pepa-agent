"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Link2, Loader2, Plus, Unlink } from "lucide-react";
import { setPropertyClientLink } from "@/app/(dashboard)/properties/actions";
import { toast } from "@/components/ui/toaster";
import type { PropertyClientLinkRow } from "@/lib/data/properties";

interface ClientLinkedPropertiesProps {
  clientId: string;
  linked: PropertyClientLinkRow[];
  unassigned: PropertyClientLinkRow[];
}

export function ClientLinkedProperties({
  clientId,
  linked,
  unassigned,
}: ClientLinkedPropertiesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickId, setPickId] = useState("");

  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        backgroundColor: "var(--color-bg-card)",
        boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
        border: "1px solid rgba(199,196,215,0.12)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Link2 size={16} style={{ color: "var(--color-brand)" }} strokeWidth={2} />
        <h2 className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
          Propojené nemovitosti
        </h2>
      </div>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        Stejné propojení jako při úpravě nemovitosti — přiřaďte volné nabídky nebo je odpojte.
      </p>

      {linked.length === 0 ? (
        <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
          Zatím žádná přiřazená nemovitost.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {linked.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{ border: "1px solid rgba(199,196,215,0.25)", backgroundColor: "var(--color-bg-page)" }}
            >
              <div className="min-w-0 flex items-center gap-2">
                <Building2 size={14} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                    {p.title}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
                    {p.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/properties/${p.id}`}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }}
                >
                  Detail
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await setPropertyClientLink(p.id, null);
                      if (!r.success) {
                        toast.error(r.error);
                        return;
                      }
                      toast.success("Nemovitost odpojena od klienta.");
                      router.refresh();
                    });
                  }}
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ color: "#991b1b" }}
                  aria-label="Odpojit nemovitost"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} strokeWidth={2} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="flex-1 min-w-0">
          <span
            className="block text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Přidat volnou nemovitost
          </span>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-bg-subtle)",
              border: "1px solid rgba(199,196,215,0.3)",
              color: "var(--color-text-primary)",
            }}
          >
            <option value="">Vyberte nemovitost…</option>
            {unassigned.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.address}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!pickId || isPending}
          onClick={() => {
            if (!pickId) return;
            startTransition(async () => {
              const r = await setPropertyClientLink(pickId, clientId);
              if (!r.success) {
                toast.error(r.error);
                return;
              }
              toast.success("Nemovitost přiřazena ke klientovi.");
              setPickId("");
              router.refresh();
            });
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shrink-0 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
          Přiřadit
        </button>
      </div>
      {unassigned.length === 0 && (
        <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
          Žádné volné nemovitosti k přiřazení — všechny už mají klienta, nebo přidejte novou v sekci Nemovitosti.
        </p>
      )}
    </div>
  );
}
