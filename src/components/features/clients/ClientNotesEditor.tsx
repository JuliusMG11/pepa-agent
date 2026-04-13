"use client";

import { useState, useTransition } from "react";
import { saveClientNotes } from "@/app/(dashboard)/clients/actions";

interface ClientNotesEditorProps {
  clientId: string;
  initialNotes: string;
}

export function ClientNotesEditor({ clientId, initialNotes }: ClientNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveClientNotes(clientId, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Přidejte poznámky o klientovi…"
        className="w-full text-sm rounded-lg p-3 outline-none resize-none transition-colors"
        style={{
          backgroundColor: "var(--color-bg-subtle)",
          border: "1px solid rgba(199,196,215,0.3)",
          color: "var(--color-text-primary)",
        }}
      />
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending || notes === initialNotes}
          className="px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          {saved ? "Uloženo ✓" : isPending ? "Ukládám…" : "Uložit poznámky"}
        </button>
      </div>
    </div>
  );
}
