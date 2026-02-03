import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Input, Badge } from '../components/ui';
import {
  FileText, Search, ChevronLeft, ChevronRight,
  Upload, Trash2, Eye, ArrowUpDown, Calendar
} from 'lucide-react';
import { UploadCaseModal } from '../components/cases/UploadCaseModal';
import { casesService, Case, CaseUploadResponse } from '../services/cases';
import { Header } from '../components/layout/Header';

type SortField = 'upload_date' | 'filename' | 'court_name' | 'status';
type SortOrder = 'asc' | 'desc';

export function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const limit = 10;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('upload_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await casesService.getCases({
        page: currentPage,
        limit,
        status: statusFilter || undefined,
        sort: sortField,
        order: sortOrder,
      });
      setCases(response.cases);
      setTotalPages(response.pages);
      setTotalCases(response.total);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleUploadSuccess = (response: CaseUploadResponse) => {
    console.log('Upload successful:', response);
    fetchCases();
  };

  const handleDelete = async (caseId: string) => {
    setIsDeleting(true);
    try {
      await casesService.deleteCase(caseId);
      setDeleteConfirmId(null);
      fetchCases();
    } catch (error) {
      console.error('Failed to delete case:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filteredCases = cases.filter(c =>
    c.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.court_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
      completed: 'success',
      processing: 'warning',
      pending: 'gray',
      failed: 'danger',
    };
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cases</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {totalCases} case{totalCases !== 1 ? 's' : ''} in your library
            </p>
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Case
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cases Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('filename')}
                  >
                    <div className="flex items-center gap-1">
                      Filename
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('court_name')}
                  >
                    <div className="flex items-center gap-1">
                      Court
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entities
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('upload_date')}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Uploaded
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="animate-pulse flex items-center gap-4">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No cases found</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsUploadModalOpen(true)}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload your first case
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((caseItem) => (
                    <tr key={caseItem.case_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                        {getStatusBadge(caseItem.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {caseItem.entity_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(caseItem.upload_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/cases/${caseItem.case_id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {deleteConfirmId === caseItem.case_id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={isDeleting}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(caseItem.case_id)}
                                disabled={isDeleting}
                                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                {isDeleting ? 'Deleting...' : 'Confirm'}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(caseItem.case_id)}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalCases)} of {totalCases} cases
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
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
