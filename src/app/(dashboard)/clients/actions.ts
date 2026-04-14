"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ClientUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1, "Jméno je povinné"),
  email: z.union([z.literal(""), z.string().email()]).optional(),
  phone: z.string().optional(),
  source: z
    .enum([
      "referral",
      "sreality",
      "bezrealitky",
      "reality_cz",
      "direct",
      "social",
      "event",
      "other",
    ])
    .optional()
    .nullable(),
  notes: z.string().optional(),
  property_id: z.string().uuid().optional().nullable(),
});

export type UpsertClientResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function upsertClient(formData: FormData): Promise<UpsertClientResult> {
  const raw = Object.fromEntries(formData.entries());
  const nullIfEmpty = (key: string) =>
    raw[key] === "" || raw[key] === undefined ? null : raw[key];

  const parsed = ClientUpsertSchema.safeParse({
    ...raw,
    email: raw["email"] === "" ? "" : raw["email"],
    phone: nullIfEmpty("phone"),
    source: nullIfEmpty("source"),
    notes: nullIfEmpty("notes"),
    property_id: nullIfEmpty("property_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { id, property_id, ...fields } = parsed.data;
  const email =
    fields.email === "" || fields.email === undefined ? null : fields.email;

  async function linkProperty(clientId: string, propId: string | null | undefined) {
    if (!propId) return;
    await supabase
      .from("properties")
      .update({ client_id: clientId })
      .eq("id", propId);
    revalidatePath(`/properties/${propId}`);
  }

  if (id) {
    const { error } = await supabase
      .from("clients")
      .update({
        full_name: fields.full_name,
        email,
        phone: fields.phone,
        source: fields.source,
        notes: fields.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    await linkProperty(id, property_id);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, id };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: fields.full_name,
      email,
      phone: fields.phone,
      source: fields.source,
      notes: fields.notes,
      assigned_agent_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Chyba" };
  await linkProperty(data.id, property_id);
  revalidatePath("/clients");
  return { success: true, id: data.id };
}

export async function deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/clients");
  return { success: true };
}

export async function saveClientNotes(
  clientId: string,
  notes: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) return { success: false };
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
