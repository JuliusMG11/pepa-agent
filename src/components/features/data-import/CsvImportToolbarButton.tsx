"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { CsvImportDialog, type CsvImportEntity } from "./CsvImportDialog";

interface CsvImportToolbarButtonProps {
  entity: CsvImportEntity;
  label?: string;
}

export function CsvImportToolbarButton({
  entity,
  label = "Import CSV",
}: CsvImportToolbarButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-85"
        style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}
      >
        <Upload size={13} strokeWidth={2} />
        {label}
      </button>
      <CsvImportDialog entity={entity} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
