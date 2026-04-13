"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeUuid } from "@/lib/validation/uuid";

export type DeleteReportResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteReport(reportId: string): Promise<DeleteReportResult> {
  const id = normalizeUuid(reportId);
  if (!id) return { success: false, error: "Neplatné ID reportu." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { data: row, error: fetchErr } = await supabase
    .from("reports")
    .select("id, storage_path, generated_by")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { success: false, error: fetchErr?.message ?? "Report nenalezen." };
  }
  if (row.generated_by !== user.id) {
    return { success: false, error: "Nemáte oprávnění smazat tento report." };
  }

  if (row.storage_path) {
    const { error: storageErr } = await supabase.storage
      .from("reports")
      .remove([row.storage_path]);
    if (storageErr) {
      return { success: false, error: storageErr.message };
    }
  }

  const { error: delErr } = await supabase.from("reports").delete().eq("id", id);
  if (delErr) return { success: false, error: delErr.message };

  revalidatePath("/reports");
  return { success: true };
}
