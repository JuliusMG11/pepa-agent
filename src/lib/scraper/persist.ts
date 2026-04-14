import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawListing } from "./sreality";

export interface UpsertResult {
  new_count: number;
  updated_count: number;
}

export async function upsertListings(
  supabase: SupabaseClient,
  listings: RawListing[]
): Promise<UpsertResult> {
  if (listings.length === 0) return { new_count: 0, updated_count: 0 };

  let new_count = 0;
  let updated_count = 0;

  for (const listing of listings) {
    // Check if exists
    const { data: existing } = await supabase
      .from("market_listings")
      .select("id, is_new")
      .eq("source", listing.source)
      .eq("external_id", listing.external_id)
      .single();

    if (existing) {
      // Update last_seen_at, mark as not new
      await supabase
        .from("market_listings")
        .update({
          last_seen_at: new Date().toISOString(),
          is_new: false,
          price: listing.price,
          title: listing.title,
          url: listing.url,
        })
        .eq("id", existing.id);
      updated_count++;
    } else {
      // Insert new listing
      await supabase.from("market_listings").insert({
        source: listing.source,
        external_id: listing.external_id,
        title: listing.title,
        address: listing.address,
        district: listing.district,
        price: listing.price,
        area_m2: listing.area_m2,
        url: listing.url,
        property_type: listing.property_type,
        is_new: true,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
      new_count++;
    }
  }

  return { new_count, updated_count };
}

export async function markOldListingsAsSeen(
  supabase: SupabaseClient
): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("market_listings")
    .update({ is_new: false })
    .eq("is_new", true)
    .lt("first_seen_at", cutoff);
}
