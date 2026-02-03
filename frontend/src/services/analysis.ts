import api from './api';

export interface AnalysisResult {
  analysis_id: string;
  case_id: string;
  analysis_type: 'summary' | 'sentiment' | 'arguments';
  result_text: string | null;
  created_at: string;
}

export interface AnalysisListResponse {
  analyses: AnalysisResult[];
  case_id: string;
}

export interface AnalysisTriggerResponse {
  message: string;
  analysis_id: string;
  analysis_type: string;
  status: string;
}

export interface SentimentData {
  overall_sentiment?: string;
  tone?: string;
  confidence_level?: string;
  key_observations?: string[];
  party_sentiments?: {
    petitioner?: string;
    respondent?: string;
  };
  judicial_tone?: string;
  summary?: string;
  raw_analysis?: string;
  parse_error?: boolean;
}

export const analysisService = {
  /**
   * Get all analyses for a case
   */
  async getCaseAnalyses(caseId: string): Promise<AnalysisListResponse> {
    const response = await api.get<AnalysisListResponse>(`/api/analysis/case/${caseId}`);
    return response.data;
  },

  /**
   * Get a specific analysis type for a case
   */
  async getAnalysis(caseId: string, analysisType: string): Promise<AnalysisResult> {
    const response = await api.get<AnalysisResult>(`/api/analysis/case/${caseId}/${analysisType}`);
    return response.data;
  },

  /**
   * Trigger a new analysis on a case
   */
  async triggerAnalysis(caseId: string, analysisType: string): Promise<AnalysisTriggerResponse> {
    const response = await api.post<AnalysisTriggerResponse>(
      `/api/analysis/case/${caseId}/analyze`,
      { analysis_type: analysisType }
    );
    return response.data;
  },

  /**
   * Delete an analysis to allow re-analysis
   */
  async deleteAnalysis(caseId: string, analysisType: string): Promise<void> {
    await api.delete(`/api/analysis/case/${caseId}/${analysisType}`);
  },

  /**
   * Parse sentiment data from result text
   */
  parseSentimentData(resultText: string | null): SentimentData | null {
    if (!resultText) return null;
    try {
      return JSON.parse(resultText) as SentimentData;
    } catch {
      return { raw_analysis: resultText, parse_error: true };
    }
  },
};
