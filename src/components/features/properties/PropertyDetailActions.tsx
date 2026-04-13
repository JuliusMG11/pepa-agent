"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PropertyDialog } from "./PropertyDialog";
import { deleteProperty } from "@/app/(dashboard)/properties/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import type { PropertySummary } from "@/lib/data/properties";

interface Agent {
  id: string;
  full_name: string;
}

interface ClientOpt {
  id: string;
  full_name: string;
}

interface PropertyDetailActionsProps {
  property: PropertySummary;
  agents: Agent[];
  clients: ClientOpt[];
}

export function PropertyDetailActions({ property, agents, clients }: PropertyDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const r = await deleteProperty(property.id);
      if (r.success) {
        setDeleteOpen(false);
        toast.success("Nemovitost byla odstraněna z výpisu");
        router.push("/properties");
        router.refresh();
      } else {
        toast.error(r.error ?? "Smazání se nepodařilo");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
          style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
        >
          <Pencil size={13} strokeWidth={1.5} />
          Upravit
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
          style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          <Trash2 size={13} strokeWidth={1.5} />
          Smazat
        </button>
      </div>

      <PropertyDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        property={property}
        agents={agents}
        clients={clients}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Smazat nemovitost?"
        description="Nemovitost bude skryta z evidence (měkké smazání). Tuto akci lze později obnovit jen přes databázi."
        confirmLabel="Ano, skrýt"
        cancelLabel="Zrušit"
        variant="danger"
        isPending={isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
