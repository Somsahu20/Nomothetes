import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Badge } from '../components/ui';
import {
  FileText, ArrowLeft, User, Building2, Calendar,
  MapPin, Trash2, RefreshCw, AlertCircle, CheckCircle,
  Brain, Sparkles, MessageSquare, Scale, Loader2
} from 'lucide-react';
import { casesService, CaseDetail, Entity } from '../services/cases';
import { analysisService, AnalysisResult, SentimentData } from '../services/analysis';
import { Header } from '../components/layout/Header';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'entities' | 'text' | 'analysis'>('entities');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reprocessConfirm, setReprocessConfirm] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  // AI Analysis state
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!caseId) return;

    try {
      const [caseResponse, entitiesResponse] = await Promise.all([
        casesService.getCase(caseId),
        casesService.getCaseEntities(caseId),
      ]);
      setCaseData(caseResponse);
      setEntities(entitiesResponse.entities);
      return caseResponse;
    } catch (err) {
      console.error('Failed to fetch case:', err);
      setError('Failed to load case details');
      return null;
    }
  }, [caseId]);

  const fetchAnalyses = useCallback(async () => {
    if (!caseId) return;
    try {
      const response = await analysisService.getCaseAnalyses(caseId);
      setAnalyses(response.analyses);
      setAnalysisError(null);
    } catch (err: unknown) {
      // Don't show error for 404 - just means no analyses exist yet
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setAnalyses([]);
          return;
        }
      }
      console.error('Failed to fetch analyses:', err);
    }
  }, [caseId]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchData(), fetchAnalyses()]).finally(() => setIsLoading(false));
  }, [fetchData, fetchAnalyses]);

  // Poll for status updates when case is processing or ocr_complete
  useEffect(() => {
    if (!caseData || !['processing', 'ocr_complete'].includes(caseData.status)) return;

    const pollInterval = setInterval(async () => {
      const updated = await fetchData();
      if (updated && !['processing', 'ocr_complete'].includes(updated.status)) {
        clearInterval(pollInterval);
        if (updated.status === 'complete') {
          toast.success('Entity extraction completed!');
        } else if (updated.status === 'failed') {
          toast.error('Entity extraction failed');
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [caseData?.status, fetchData]);

  const handleDelete = async () => {
    if (!caseId) return;

    setIsDeleting(true);
    try {
      await casesService.deleteCase(caseId);
      navigate('/cases');
    } catch (err) {
      console.error('Failed to delete case:', err);
      setError('Failed to delete case');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReprocess = async () => {
    if (!caseId) return;

    setIsReprocessing(true);
    setReprocessConfirm(false);

    try {
      await casesService.reprocessCase(caseId);
      toast.success('Re-extracting entities with improved analysis...');
      // Update local state to show processing
      setCaseData(prev => prev ? { ...prev, status: 'processing' } : null);
      setEntities([]);
    } catch (err: unknown) {
      console.error('Failed to reprocess case:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reprocess case';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        toast.error(axiosError.response?.data?.detail || errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleTriggerAnalysis = async (analysisType: string) => {
    if (!caseId) return;

    setLoadingAnalysis(analysisType);
    setAnalysisError(null);

    try {
      const response = await analysisService.triggerAnalysis(caseId, analysisType);
      toast.success(response.message);
      // Refresh analyses
      await fetchAnalyses();
    } catch (err: unknown) {
      console.error('Failed to trigger analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to run analysis';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        const detail = axiosError.response?.data?.detail || errorMessage;
        setAnalysisError(detail);
        toast.error(detail);
      } else {
        setAnalysisError(errorMessage);
        toast.error(errorMessage);
      }
      // Clear error after 5 seconds
      setTimeout(() => setAnalysisError(null), 5000);
    } finally {
      setLoadingAnalysis(null);
    }
  };

  const handleRerunAnalysis = async (analysisType: string) => {
    if (!caseId) return;

    setLoadingAnalysis(analysisType);
    setAnalysisError(null);

    try {
      // Delete existing analysis first
      await analysisService.deleteAnalysis(caseId, analysisType);
      // Then trigger new analysis
      const response = await analysisService.triggerAnalysis(caseId, analysisType);
      toast.success(response.message);
      await fetchAnalyses();
    } catch (err: unknown) {
      console.error('Failed to rerun analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to rerun analysis';
      toast.error(errorMessage);
    } finally {
      setLoadingAnalysis(null);
    }
  };

  const getAnalysisByType = (type: string): AnalysisResult | undefined => {
    return analyses.find(a => a.analysis_type === type);
  };

  const renderSentimentData = (data: SentimentData) => {
    if (data.parse_error && data.raw_analysis) {
      return <pre className="whitespace-pre-wrap text-sm">{data.raw_analysis}</pre>;
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.overall_sentiment && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Overall Sentiment</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.overall_sentiment}</p>
            </div>
          )}
          {data.tone && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Tone</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.tone}</p>
            </div>
          )}
          {data.judicial_tone && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Judicial Tone</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.judicial_tone}</p>
            </div>
          )}
        </div>

        {data.party_sentiments && (
          <div className="grid grid-cols-2 gap-4">
            {data.party_sentiments.petitioner && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">Petitioner</p>
                <p className="font-medium text-blue-800 dark:text-blue-300 capitalize">{data.party_sentiments.petitioner}</p>
              </div>
            )}
            {data.party_sentiments.respondent && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p className="text-xs text-purple-600 dark:text-purple-400">Respondent</p>
                <p className="font-medium text-purple-800 dark:text-purple-300 capitalize">{data.party_sentiments.respondent}</p>
              </div>
            )}
          </div>
        )}

        {data.key_observations && data.key_observations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Observations</p>
            <ul className="list-disc list-inside space-y-1">
              {data.key_observations.map((obs, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400">{obs}</li>
              ))}
            </ul>
          </div>
        )}

        {data.summary && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{data.summary}</p>
          </div>
        )}
      </div>
    );
  };

  const getEntityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PERSON':
        return <User className="w-4 h-4" />;
      case 'ORG':
        return <Building2 className="w-4 h-4" />;
      case 'DATE':
        return <Calendar className="w-4 h-4" />;
      case 'GPE':
      case 'LOCATION':
        return <MapPin className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEntityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PERSON':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
      case 'ORG':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800';
      case 'DATE':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800';
      case 'GPE':
      case 'LOCATION':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const groupedEntities = entities.reduce((acc, entity) => {
    const type = entity.entity_type.toUpperCase();
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Case</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Case not found'}</p>
            <Link to="/cases">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cases
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/cases">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{caseData.filename}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Uploaded {formatDate(caseData.upload_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Reprocess Button */}
            {reprocessConfirm ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReprocessConfirm(false)}
                  disabled={isReprocessing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                >
                  {isReprocessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Reprocess
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReprocessConfirm(true)}
                disabled={caseData.status === 'processing' || !caseData.raw_text}
                title={
                  caseData.status === 'processing'
                    ? 'Case is currently being processed'
                    : !caseData.raw_text
                    ? 'No extracted text available'
                    : 'Re-extract entities with improved analysis'
                }
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${caseData.status === 'processing' ? 'animate-spin' : ''}`} />
                {caseData.status === 'processing' ? 'Processing...' : 'Reprocess Entities'}
              </Button>
            )}

            {/* Delete Button */}
            {deleteConfirm ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Case Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="mt-1">
                      <Badge
                        variant={
                          caseData.status === 'complete' ? 'success' :
                          caseData.status === 'processing' || caseData.status === 'ocr_complete' ? 'warning' :
                          caseData.status === 'failed' ? 'danger' : 'gray'
                        }
                      >
                        {caseData.status === 'ocr_complete' ? 'processing' : caseData.status}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Court</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {caseData.court_name || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Case Date</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(caseData.case_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Document Type</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {caseData.document_type || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Entities Found</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {caseData.entity_count}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Entity Summary */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Entity Summary</h3>
                <div className="space-y-2">
                  {Object.entries(groupedEntities).map(([type, typeEntities]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded ${getEntityColor(type)}`}>
                          {getEntityIcon(type)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{type}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {typeEntities.length}
                      </span>
                    </div>
                  ))}
                  {Object.keys(groupedEntities).length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No entities extracted yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex gap-6">
                <button
                  onClick={() => setActiveTab('entities')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'entities'
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Entities ({entities.length})
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'text'
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Extracted Text
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'analysis'
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  AI Analysis
                </button>
              </nav>
            </div>

            {activeTab === 'entities' ? (
              <Card>
                <CardContent>
                  {entities.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {caseData.status === 'processing'
                          ? 'Entities are being extracted...'
                          : 'No entities found in this document'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedEntities).map(([type, typeEntities]) => (
                        <div key={type}>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <span className={`p-1 rounded ${getEntityColor(type)}`}>
                              {getEntityIcon(type)}
                            </span>
                            {type} ({typeEntities.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {typeEntities.map((entity) => (
                              <span
                                key={entity.entity_id}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getEntityColor(type)}`}
                                title={`Confidence: ${entity.confidence_score ? (entity.confidence_score * 100).toFixed(0) + '%' : 'N/A'}`}
                              >
                                {entity.entity_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : activeTab === 'text' ? (
              <Card>
                <CardContent>
                  {caseData.raw_text ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-[600px]">
                        {caseData.raw_text}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {caseData.status === 'processing'
                          ? 'Text is being extracted...'
                          : 'No text extracted from this document'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* AI Analysis Tab */
              <div className="space-y-6">
                {analysisError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-700 dark:text-red-400 text-sm">{analysisError}</p>
                  </div>
                )}

                {!caseData.raw_text ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No text available for analysis. Please wait for document processing to complete.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Summary Analysis */}
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Case Summary</h3>
                          </div>
                          {getAnalysisByType('summary') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRerunAnalysis('summary')}
                              disabled={loadingAnalysis === 'summary'}
                            >
                              {loadingAnalysis === 'summary' ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleTriggerAnalysis('summary')}
                              disabled={loadingAnalysis === 'summary'}
                            >
                              {loadingAnalysis === 'summary' ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><Sparkles className="w-4 h-4 mr-2" />Generate Summary</>
                              )}
                            </Button>
                          )}
                        </div>
                        {getAnalysisByType('summary') ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert text-sm text-gray-700 dark:text-gray-300">
                            <ReactMarkdown>
                              {getAnalysisByType('summary')?.result_text || ''}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Click "Generate Summary" to get an AI-powered overview of this case.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Sentiment Analysis */}
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sentiment Analysis</h3>
                          </div>
                          {getAnalysisByType('sentiment') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRerunAnalysis('sentiment')}
                              disabled={loadingAnalysis === 'sentiment'}
                            >
                              {loadingAnalysis === 'sentiment' ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleTriggerAnalysis('sentiment')}
                              disabled={loadingAnalysis === 'sentiment'}
                            >
                              {loadingAnalysis === 'sentiment' ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><MessageSquare className="w-4 h-4 mr-2" />Analyze Sentiment</>
                              )}
                            </Button>
                          )}
                        </div>
                        {getAnalysisByType('sentiment') ? (
                          renderSentimentData(
                            analysisService.parseSentimentData(getAnalysisByType('sentiment')?.result_text || null) || {}
                          )
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Click "Analyze Sentiment" to understand the tone and disposition of the parties.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Arguments Analysis */}
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Scale className="w-5 h-5 text-purple-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Legal Arguments</h3>
                          </div>
                          {getAnalysisByType('arguments') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRerunAnalysis('arguments')}
                              disabled={loadingAnalysis === 'arguments'}
                            >
                              {loadingAnalysis === 'arguments' ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleTriggerAnalysis('arguments')}
                              disabled={loadingAnalysis === 'arguments'}
                            >
                              {loadingAnalysis === 'arguments' ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><Scale className="w-4 h-4 mr-2" />Extract Arguments</>
                              )}
                            </Button>
                          )}
                        </div>
                        {getAnalysisByType('arguments') ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert text-sm text-gray-700 dark:text-gray-300">
                            <ReactMarkdown>
                              {getAnalysisByType('arguments')?.result_text || ''}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Click "Extract Arguments" to identify and analyze the legal arguments presented.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
