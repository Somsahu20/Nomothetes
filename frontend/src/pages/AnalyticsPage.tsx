import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui';
import { FileText, Users, TrendingUp, Calendar } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useTheme } from '../context/ThemeContext';
import {
  CasesOverTimeChart,
  TopEntitiesChart,
  CourtDistributionChart,
} from '../components/charts';
import {
  analyticsService,
  AnalyticsSummaryResponse,
  TrendsResponse,
} from '../services/analytics';

type PeriodType = 'day' | 'week' | 'month';

export function AnalyticsPage() {
  const { isDark } = useTheme();
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [summaryData, trendsData] = await Promise.all([
          analyticsService.getSummary(),
          analyticsService.getTrends(period, 12),
        ]);
        setSummary(summaryData);
        setTrends(trendsData);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Insights and trends from your legal document analysis
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
              {(['day', 'week', 'month'] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-8">
            <CardContent className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <>
            {/* Loading skeleton for stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Loading skeleton for charts */}
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardContent className="animate-pulse">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
                  <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded" />
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
                      <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {summary?.total_cases || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Cases</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {summary?.unique_entities || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unique Entities</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {summary?.avg_entities_per_case?.toFixed(1) || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Entities/Case</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {summary?.cases_this_month || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cases This Month</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6">
              {/* Cases Over Time Chart - Full Width */}
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Cases Over Time
                  </h3>
                  <div className="h-72">
                    {trends && trends.cases_over_time.length > 0 ? (
                      <CasesOverTimeChart
                        data={trends.cases_over_time}
                        periodType={period}
                        isDark={isDark}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Two column layout for bar charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Entities Chart */}
                <Card>
                  <CardContent>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Top Entities by Cases
                    </h3>
                    <div className="h-80">
                      {trends && trends.top_entities.length > 0 ? (
                        <TopEntitiesChart data={trends.top_entities} isDark={isDark} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                          No data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Court Distribution Chart */}
                <Card>
                  <CardContent>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Cases by Court
                    </h3>
                    <div className="h-80">
                      {trends && trends.court_distribution.length > 0 ? (
                        <CourtDistributionChart data={trends.court_distribution} isDark={isDark} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                          No data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Status Distribution */}
            {summary && summary.status_distribution.length > 0 && (
              <Card className="mt-6">
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Processing Status
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {summary.status_distribution.map((item) => (
                      <div
                        key={item.status}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${
                            item.status === 'complete'
                              ? 'bg-green-500'
                              : item.status === 'processing' || item.status === 'ocr_complete'
                              ? 'bg-yellow-500'
                              : item.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                          }`}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {item.status}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
