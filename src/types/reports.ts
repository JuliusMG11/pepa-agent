export interface ReportPeriod {
  from: Date;
  to: Date;
  label: string; // e.g. "Týden 15 (7.–13. dubna 2026)"
}

export interface ReportMetrics {
  newLeads: number;
  closedWon: number;
  closedLost: number;
  conversionRate: number; // percent, 0-100
  newClients: number;
  newProperties: number;
  soldProperties: number;
  totalRevenue: number; // sum of sold property prices
  avgDaysToClose: number;
  topAgent: { name: string; deals: number } | null;
}

export interface TopProperty {
  title: string;
  district: string;
  price: number;
  agentName: string;
}

export interface PipelineStage {
  status: string;
  label: string;
  count: number;
}

export interface ReportData {
  period: ReportPeriod;
  metrics: ReportMetrics;
  leadsBySource: { source: string; count: number }[];
  /** Nové leady v období podle fáze pipeline */
  leadsByStatus: { status: string; label: string; count: number }[];
  propertiesByDistrict: { district: string; count: number; revenue: number }[];
  activitiesByType: { type: string; count: number }[];
  weeklyBreakdown: { week: string; leads: number; sold: number }[];
  topProperties?: TopProperty[];
  pipelineFunnel?: PipelineStage[];
}
