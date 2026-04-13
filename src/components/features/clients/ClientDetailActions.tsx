"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ClientDialog } from "./ClientDialog";
import { deleteClient } from "@/app/(dashboard)/clients/actions";
import { toast } from "@/components/ui/toaster";
import type { ClientRow } from "@/lib/data/clients";

interface ClientDetailActionsProps {
  client: ClientRow;
}

export function ClientDetailActions({ client }: ClientDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Opravdu chcete tohoto klienta archivovat (skrýt ze seznamu)?")) return;
    startTransition(async () => {
      const r = await deleteClient(client.id);
      if (r.success) {
        toast.success("Klient byl odstraněn ze seznamu");
        router.push("/clients");
        router.refresh();
      } else {
        toast.error(r.error ?? "Akce se nezdařila");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
        >
          <Pencil size={13} strokeWidth={1.5} />
          Upravit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          <Trash2 size={13} strokeWidth={1.5} />
          Smazat
        </button>
      </div>
      <ClientDialog open={editOpen} onClose={() => setEditOpen(false)} client={client} />
    </>
  );
}
