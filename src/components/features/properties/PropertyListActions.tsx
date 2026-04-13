"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PropertyDialog } from "./PropertyDialog";

interface Agent {
  id: string;
  full_name: string;
}

interface ClientOpt {
  id: string;
  full_name: string;
}

interface PropertyListActionsProps {
  agents: Agent[];
  clients: ClientOpt[];
}

export function PropertyListActions({ agents, clients }: PropertyListActionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
    } else {
      setDialogOpen(false);
    }
  }, [searchParams]);

  function handleClose() {
    setDialogOpen(false);
    // Remove ?new=1 from URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `/properties?${qs}` : "/properties");
  }

  return (
    <PropertyDialog
      open={dialogOpen}
      onClose={handleClose}
      agents={agents}
      clients={clients}
    />
  );
}
