import api from './api';

// Types for analytics data

export interface TimeSeriesDataPoint {
  period: string;
  count: number;
}

export interface CasesOverTimeResponse {
  data: TimeSeriesDataPoint[];
  period_type: string;
}

export interface EntityDistributionItem {
  entity_type: string;
  count: number;
  percentage: number;
}

export interface EntityDistributionResponse {
  data: EntityDistributionItem[];
  total: number;
}

export interface TopEntityItem {
  name: string;
  entity_type: string;
  case_count: number;
  occurrence_count: number;
}

export interface TopEntitiesResponse {
  data: TopEntityItem[];
}

export interface CourtDistributionItem {
  court_name: string;
  count: number;
  percentage: number;
}

export interface CourtDistributionResponse {
  data: CourtDistributionItem[];
  total: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface AnalyticsSummaryResponse {
  total_cases: number;
  total_entities: number;
  unique_entities: number;
  avg_entities_per_case: number;
  cases_this_month: number;
  entities_this_month: number;
  status_distribution: StatusDistributionItem[];
}

export interface TrendsResponse {
  cases_over_time: TimeSeriesDataPoint[];
  entity_distribution: EntityDistributionItem[];
  top_entities: TopEntityItem[];
  court_distribution: CourtDistributionItem[];
}

export const analyticsService = {
  async getSummary(): Promise<AnalyticsSummaryResponse> {
    const response = await api.get<AnalyticsSummaryResponse>('/api/analytics/summary');
    return response.data;
  },

  async getCasesOverTime(
    period: 'day' | 'week' | 'month' = 'month',
    months: number = 12
  ): Promise<CasesOverTimeResponse> {
    const response = await api.get<CasesOverTimeResponse>('/api/analytics/cases-over-time', {
      params: { period, months }
    });
    return response.data;
  },

  async getEntityDistribution(): Promise<EntityDistributionResponse> {
    const response = await api.get<EntityDistributionResponse>('/api/analytics/entity-distribution');
    return response.data;
  },

  async getTopEntities(limit: number = 10, entityType?: string): Promise<TopEntitiesResponse> {
    const response = await api.get<TopEntitiesResponse>('/api/analytics/top-entities', {
      params: { limit, entity_type: entityType }
    });
    return response.data;
  },

  async getCourtDistribution(): Promise<CourtDistributionResponse> {
    const response = await api.get<CourtDistributionResponse>('/api/analytics/courts');
    return response.data;
  },

  async getTrends(
    period: 'day' | 'week' | 'month' = 'month',
    months: number = 6
  ): Promise<TrendsResponse> {
    const response = await api.get<TrendsResponse>('/api/analytics/trends', {
      params: { period, months }
    });
    return response.data;
  },
};
