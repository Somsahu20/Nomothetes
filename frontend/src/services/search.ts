import api from './api';

export interface SearchResultItem {
  id: string;
  type: 'case' | 'entity';
  title: string;
  snippet: string | null;
  relevance: number;
  metadata: {
    court_name?: string;
    case_date?: string;
    status?: string;
    entity_type?: string;
    case_id?: string;
    case_filename?: string;
  };
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  query: string;
  search_type: string;
}

export interface SearchSuggestion {
  id: string;
  type: 'case' | 'entity';
  text: string;
  entity_type?: string;
}

export interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
}

export const searchService = {
  /**
   * Perform a global search
   */
  async search(
    query: string,
    type: 'all' | 'cases' | 'entities' = 'all',
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: query,
      type,
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await api.get<SearchResponse>(`/api/search?${params}`);
    return response.data;
  },

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string, limit: number = 5): Promise<SuggestionsResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    const response = await api.get<SuggestionsResponse>(`/api/search/suggestions?${params}`);
    return response.data;
  },
};
