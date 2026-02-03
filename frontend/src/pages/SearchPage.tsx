import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, FileText, User, Building2, Calendar, MapPin, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui';
import { Header } from '../components/layout/Header';
import { searchService, SearchResultItem } from '../services/search';

type SearchType = 'all' | 'cases' | 'entities';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = (searchParams.get('type') as SearchType) || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await searchService.search(query, type, page, limit);
        setResults(response.results);
        setTotal(response.total);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, type, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim(), type, page: '1' });
    }
  };

  const handleTypeChange = (newType: SearchType) => {
    setSearchParams({ q: query, type: newType, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, type, page: newPage.toString() });
  };

  const getResultIcon = (result: SearchResultItem) => {
    if (result.type === 'case') {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    const entityType = result.metadata.entity_type?.toUpperCase();
    switch (entityType) {
      case 'PERSON':
        return <User className="w-5 h-5 text-purple-500" />;
      case 'ORG':
        return <Building2 className="w-5 h-5 text-green-500" />;
      case 'DATE':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'GPE':
      case 'LOCATION':
        return <MapPin className="w-5 h-5 text-red-500" />;
      default:
        return <Search className="w-5 h-5 text-gray-400" />;
    }
  };

  const getResultLink = (result: SearchResultItem) => {
    if (result.type === 'case') {
      return `/cases/${result.id}`;
    }
    // For entities, link to the case they belong to
    if (result.metadata.case_id) {
      return `/cases/${result.metadata.case_id}`;
    }
    return '#';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search cases, entities..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" disabled={!searchInput.trim()}>
              Search
            </Button>
          </form>
        </div>

        {query && (
          <>
            {/* Filters */}
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Filter:</span>
              {(['all', 'cases', 'entities'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => handleTypeChange(filterType)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    type === filterType
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isLoading ? 'Searching...' : `Found ${total} result${total !== 1 ? 's' : ''} for "${query}"`}
            </p>

            {/* Results */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i}>
                    <CardContent className="animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Link key={`${result.type}-${result.id}`} to={getResultLink(result)}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            {getResultIcon(result)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                                {result.title}
                              </h3>
                              <Badge variant={result.type === 'case' ? 'primary' : 'gray'}>
                                {result.type}
                              </Badge>
                              {result.metadata.entity_type && (
                                <Badge variant="gray">{result.metadata.entity_type}</Badge>
                              )}
                            </div>
                            {result.snippet && (
                              <p
                                className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
                                dangerouslySetInnerHTML={{ __html: result.snippet }}
                              />
                            )}
                            {result.type === 'case' && (
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                                {result.metadata.court_name && (
                                  <span>{result.metadata.court_name}</span>
                                )}
                                {result.metadata.case_date && (
                                  <span>{result.metadata.case_date}</span>
                                )}
                                {result.metadata.status && (
                                  <Badge
                                    variant={
                                      result.metadata.status === 'complete'
                                        ? 'success'
                                        : result.metadata.status === 'processing' || result.metadata.status === 'ocr_complete'
                                        ? 'warning'
                                        : 'gray'
                                    }
                                    className="text-xs"
                                  >
                                    {result.metadata.status === 'ocr_complete' ? 'processing' : result.metadata.status}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-500 dark:text-gray-400 px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {!query && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Search your legal documents
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Enter a search term above to find cases and entities
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
