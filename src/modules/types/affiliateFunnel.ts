export type AffiliateFunnelStageKey = 'clicks' | 'registrations' | 'bookings' | 'transfers';

export type AffiliateFunnelStage = {
  key: AffiliateFunnelStageKey;
  label: string;
  value: number | null;
  available: boolean;
};

export type AffiliateFunnelStatsResponse = {
  stages: AffiliateFunnelStage[];
  statsSyncedAt: string | null;
  registrationsUnavailableReason?: string | null;
};
