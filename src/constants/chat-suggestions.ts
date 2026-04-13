/** Text na tlačítku v sidebaru — stejný význam jako v system promptu. */
export const VIEWING_EMAIL_SUGGESTED_QUESTION_CS =
  "Napiš e-mail pro zájemce o moji nemovitost a doporuč mu termín prohlídky na základě mé dostupnosti v kalendáři.";

/** Krátká varianta pro text agenta (citace v odpovědi). */
export const VIEWING_EMAIL_SHORT_LABEL_CS =
  "E-mail zájemci o nemovitost + termín prohlídky (průvodce)";

export type ChatSidebarSuggestPayload =
  | { type: "chat"; text: string }
  | { type: "viewing_wizard" };
