import api from './api';

export interface CaseUploadResponse {
  case_id: string;
  filename: string;
  status: string;
  task_id: string;
}

export interface Case {
  case_id: string;
  filename: string;
  court_name: string | null;
  case_date: string | null;
  upload_date: string;
  status: string;
  entity_count: number;
}

export interface CaseListResponse {
  cases: Case[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CaseDetail {
  case_id: string;
  filename: string;
  court_name: string | null;
  case_date: string | null;
  document_type: string | null;
  upload_date: string;
  status: string;
  raw_text: string | null;
  entity_count: number;
  has_analysis: boolean;
}

export interface Entity {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  normalized_name: string | null;
  confidence_score: number | null;
  page_number: number | null;
}

export interface CaseEntitiesResponse {
  entities: Entity[];
  total: number;
}

export interface CaseReprocessResponse {
  case_id: string;
  status: string;
  task_id: string;
  message: string;
}

export const casesService = {
  async uploadCase(
    file: File,
    metadata?: {
      court_name?: string;
      case_date?: string;
      document_type?: string;
    }
  ): Promise<CaseUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata?.court_name) {
      formData.append('court_name', metadata.court_name);
    }
    if (metadata?.case_date) {
      formData.append('case_date', metadata.case_date);
    }
    if (metadata?.document_type) {
      formData.append('document_type', metadata.document_type);
    }

    const response = await api.post<CaseUploadResponse>('/api/cases/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getCases(params?: {
    page?: number;
    limit?: number;
    court?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    sort?: string;
    order?: string;
  }): Promise<CaseListResponse> {
    const response = await api.get<CaseListResponse>('/api/cases', { params });
    return response.data;
  },

  async getCase(caseId: string): Promise<CaseDetail> {
    const response = await api.get<CaseDetail>(`/api/cases/${caseId}`);
    return response.data;
  },

  async deleteCase(caseId: string): Promise<void> {
    await api.delete(`/api/cases/${caseId}`);
  },

  async getCaseEntities(caseId: string): Promise<CaseEntitiesResponse> {
    const response = await api.get<CaseEntitiesResponse>(`/api/cases/${caseId}/entities`);
    return response.data;
  },

  async reprocessCase(caseId: string): Promise<CaseReprocessResponse> {
    const response = await api.post<CaseReprocessResponse>(`/api/cases/${caseId}/reprocess`);
    return response.data;
  },
};
