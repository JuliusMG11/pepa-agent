import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";

export interface SearchMarketListingsInput {
  district?: string;
  property_type?: string;
  price_min?: number;
  price_max?: number;
  is_new?: boolean;
  days_back?: number;
}

export interface MarketListingSummary {
  id: string;
  source: string;
  title: string;
  address: string;
  district: string | null;
  price: number | null;
  area_m2: number | null;
  url: string | null;
  is_new: boolean | null;
  first_seen_at: string | null;
}

export interface MarketListingsResult {
  listings: MarketListingSummary[];
  total: number;
  new_count: number;
  avg_price: number | null;
}

const ALLOWED_PROPERTY_TYPES = ["byt", "dum", "komercni", "pozemek", "garaze"];

export async function searchMarketListingsTool(
  input: SearchMarketListingsInput,
  context: { supabase: SupabaseClient<Database> }
): Promise<Result<MarketListingsResult>> {
  const {
    district,
    property_type,
    price_min,
    price_max,
    is_new,
    days_back = 7,
  } = input;

  // Validate property type against whitelist
  if (property_type && !ALLOWED_PROPERTY_TYPES.includes(property_type)) {
    return {
      success: false,
      error: new Error(
        `Invalid property_type '${property_type}'. Allowed: ${ALLOWED_PROPERTY_TYPES.join(", ")}`
      ),
    };
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Math.min(days_back, 90));

    let query = context.supabase
      .from("market_listings")
      .select(
        "id, source, title, address, district, price, area_m2, url, is_new, first_seen_at"
      )
      .gte("first_seen_at", cutoffDate.toISOString())
      .order("first_seen_at", { ascending: false })
      .limit(100);

    if (district) {
      query = query.eq("district", district);
    }

    if (price_min !== undefined) {
      query = query.gte("price", price_min);
    }

    if (price_max !== undefined) {
      query = query.lte("price", price_max);
    }

    if (is_new !== undefined) {
      query = query.eq("is_new", is_new);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    const listings = (data ?? []) as MarketListingSummary[];
    const newCount = listings.filter((l) => l.is_new).length;

    const prices = listings
      .map((l) => l.price)
      .filter((p): p is number => p !== null);
    const avgPrice =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : null;

    return {
      success: true,
      data: {
        listings,
        total: listings.length,
        new_count: newCount,
        avg_price: avgPrice,
      },
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
