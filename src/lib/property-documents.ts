import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const PROPERTY_DOCUMENTS_BUCKET = "property-documents";
export const PROPERTY_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validatePropertyDocumentFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Povolené jsou PDF nebo Word (.doc, .docx).";
  }
  if (file.size > PROPERTY_DOCUMENT_MAX_BYTES) {
    return "Soubor může mít nejvýše 5 MB.";
  }
  return null;
}

export async function uploadPropertyDocument(
  supabase: SupabaseClient<Database>,
  file: File,
  propertyFolder: string
): Promise<{ url: string; name: string } | { error: string }> {
  const validationError = validatePropertyDocumentFile(file);
  if (validationError) return { error: validationError };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const ext =
    file.name.split(".").pop()?.toLowerCase() === "docx"
      ? "docx"
      : file.name.split(".").pop()?.toLowerCase() === "doc"
        ? "doc"
        : "pdf";
  const path = `${user.id}/properties/${propertyFolder}/docs/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PROPERTY_DOCUMENTS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage
    .from(PROPERTY_DOCUMENTS_BUCKET)
    .getPublicUrl(path);

  return { url: data.publicUrl, name: file.name };
}
