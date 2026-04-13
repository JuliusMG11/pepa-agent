/** Stejné jako u agent toolu — inzeráty filtrujeme podle textu districtu */
export const MONITORING_ALLOWED_DISTRICTS = [
  "Praha Holešovice",
  "Praha Vinohrady",
  "Praha Žižkov",
  "Praha Smíchov",
  "Praha Dejvice",
  "Praha 1",
  "Praha 2",
  "Praha 3",
  "Praha 4",
  "Praha 5",
  "Praha 6",
  "Praha 7",
  "Praha 8",
  "Praha 9",
  "Praha 10",
] as const;

export type MonitoringAllowedDistrict = (typeof MONITORING_ALLOWED_DISTRICTS)[number];
