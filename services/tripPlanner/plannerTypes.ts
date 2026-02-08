export type InterestTag =
  | 'mountain'
  | 'valley'
  | 'river'
  | 'lakes'
  | 'monasteries'
  | 'culture'
  | 'adventure'
  | 'photography';

export type PlanItemSource = 'admin' | 'geoapify' | 'placeholder';

export type PlannedStop = {
  name: string;
  description?: string;
  source: PlanItemSource;
  lat?: number;
  lon?: number;
  distanceKmFromCenter?: number;
};

export type PlannedDay = {
  day: number;
  title: string;
  stops: PlannedStop[];
};

export type PlannedItinerary = {
  destination: string;
  requestedDays: number;
  baseTripId?: string;
  baseTripTitle?: string;
  days: PlannedDay[];
  notices?: string[];
};

