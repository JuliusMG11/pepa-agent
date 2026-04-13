import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const PROPERTY_IMAGES_BUCKET = "property-images";
/** 1 MB — musí sedieť s validáciou vo formulári a limitom bucketa */
export const PROPERTY_IMAGE_MAX_BYTES = 1024 * 1024;

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function validatePropertyImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Soubor musí být obrázek (JPEG, PNG, WebP nebo GIF).";
  }
  if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
    return "Obrázek může mít nejvýše 1 MB.";
  }
  return null;
}

function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ALLOWED_EXT.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

/**
 * Nahraje obrázok do Supabase Storage a vrátí verejnú URL.
 */
export async function uploadPropertyImage(
  supabase: SupabaseClient<Database>,
  file: File,
  propertyFolder: string
): Promise<{ url: string } | { error: string }> {
  const validationError = validatePropertyImageFile(file);
  if (validationError) return { error: validationError };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni." };

  const ext = extensionForFile(file);
  const path = `${user.id}/properties/${propertyFolder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .upload(path, file, {
      contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .getPublicUrl(path);

  return { url: data.publicUrl };
}
