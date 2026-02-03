import api from './api';

export interface NetworkNode {
  id: string;
  label: string;
  type: string;
  case_count: number;
  case_ids: string[];
  entity_ids: string[];
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface NetworkStats {
  total_nodes: number;
  total_edges: number;
  entity_types: Record<string, number>;
  avg_connections: number;
}

export interface NetworkGraphResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
}

export interface EntityConnection {
  name: string;
  type: string;
  count: number;
}

export interface EntityCase {
  case_id: string;
  filename: string;
  court_name: string | null;
  case_date: string | null;
}

export interface EntityDetail {
  entity_name: string;
  entity_type: string;
  normalized_name: string | null;
  occurrence_count: number;
  case_count: number;
  cases: EntityCase[];
  top_connections: EntityConnection[];
}

export interface EntityListItem {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  case_count: number;
}

export interface EntityListResponse {
  entities: EntityListItem[];
  total: number;
}

export interface NetworkStatsResponse {
  total_unique_entities: number;
  cases_with_entities: number;
  entity_type_counts: Record<string, number>;
  top_entities: Array<{
    name: string;
    type: string;
    case_count: number;
  }>;
}

export const networkService = {
  async getNetworkGraph(): Promise<NetworkGraphResponse> {
    const response = await api.get<NetworkGraphResponse>('/api/network/graph');
    return response.data;
  },

  async getEntities(params?: {
    entity_type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<EntityListResponse> {
    const response = await api.get<EntityListResponse>('/api/network/entities', { params });
    return response.data;
  },

  async getEntityDetail(entityName: string): Promise<EntityDetail> {
    const response = await api.get<EntityDetail>(`/api/network/entities/${encodeURIComponent(entityName)}`);
    return response.data;
  },

  async getNetworkStats(): Promise<NetworkStatsResponse> {
    const response = await api.get<NetworkStatsResponse>('/api/network/stats');
    return response.data;
  },
};
