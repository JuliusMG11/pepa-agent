/** České popisky pro agregace v reportech (leady, aktivity). */

export const LEAD_SOURCE_LABELS_CS: Record<string, string> = {
  referral: "Doporučení",
  sreality: "Sreality",
  bezrealitky: "Bezrealitky",
  reality_cz: "Reality.cz",
  direct: "Přímý kontakt",
  social: "Sociální sítě",
  event: "Akce",
  other: "Jiné",
};

export const LEAD_STATUS_LABELS_CS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  viewing_scheduled: "Prohlídka",
  offer_made: "Nabídka",
  closed_won: "Uzavřeno ✓",
  closed_lost: "Uzavřeno ✗",
};

export const ACTIVITY_TYPE_LABELS_CS: Record<string, string> = {
  call: "Hovory",
  email: "E-maily",
  viewing: "Prohlídky",
  offer: "Nabídky",
  contract: "Smlouvy",
  task: "Úkoly",
  note: "Poznámky",
};
