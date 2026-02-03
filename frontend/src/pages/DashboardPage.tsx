import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '../components/ui';
import { FileText, Network, BarChart3, Upload } from 'lucide-react';
import { UploadCaseModal } from '../components/cases/UploadCaseModal';
import { casesService, Case, CaseUploadResponse } from '../services/cases';
import { Header } from '../components/layout/Header';

export function DashboardPage() {
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [totalEntities, setTotalEntities] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const response = await casesService.getCases({ limit: 10 });
      setCases(response.cases);
      setTotalCases(response.total);

      // Calculate entity count and processing count
      let entities = 0;
      let processing = 0;
      response.cases.forEach((c) => {
        entities += c.entity_count || 0;
        if (c.status === 'processing' || c.status === 'pending') {
          processing++;
        }
      });
      setTotalEntities(entities);
      setProcessingCount(processing);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Poll for status updates when there are processing cases
  useEffect(() => {
    if (processingCount === 0) return;

    const pollInterval = setInterval(() => {
      fetchCases();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [processingCount]);

  const handleUploadSuccess = (response: CaseUploadResponse) => {
    console.log('Upload successful:', response);
    // Refresh cases list
    fetchCases();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome to your legal network analysis workspace</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCases}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Cases</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalEntities}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Entities</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connections</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{processingCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Processing</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Case
            </Button>
            <Button variant="outline" onClick={() => navigate('/network')}>
              <Network className="w-4 h-4 mr-2" />
              View Network
            </Button>
          </div>
        </div>

        {/* Cases List or Empty State */}
        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ) : cases.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No cases yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Get started by uploading your first legal document. We'll extract entities and build your network graph.
              </p>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Cases</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Court
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Entities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {cases.map((caseItem) => (
                      <tr
                        key={caseItem.case_id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {caseItem.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {caseItem.court_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              caseItem.status === 'complete'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                                : caseItem.status === 'processing' || caseItem.status === 'ocr_complete'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                                : caseItem.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {caseItem.status === 'ocr_complete' ? 'processing' : caseItem.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {caseItem.entity_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(caseItem.upload_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Upload Modal */}
      <UploadCaseModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
