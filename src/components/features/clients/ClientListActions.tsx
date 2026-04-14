"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientDialog } from "./ClientDialog";

interface PropertyOpt {
  id: string;
  title: string;
  address: string;
}

interface ClientListActionsProps {
  availableProperties?: PropertyOpt[];
}

export function ClientListActions({ availableProperties }: ClientListActionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [searchParams]);

  function handleClose() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `/clients?${qs}` : "/clients");
  }

  return <ClientDialog open={open} onClose={handleClose} availableProperties={availableProperties} />;
}
