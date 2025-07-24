import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../services/api';
import { TestRun, TestStats } from '../types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportsPage() {
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);

  const { data: runs } = useQuery({
    queryKey: ['testRuns'],
    queryFn: () => reportsService.getRuns({ limit: 100 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => reportsService.getStats(),
  });

  const { data: featureStats } = useQuery({
    queryKey: ['featureStats'],
    queryFn: reportsService.getFeatureStats,
  });

  const { data: runResults } = useQuery({
    queryKey: ['runResults', selectedRun?.id],
    queryFn: () => selectedRun ? reportsService.getRunResults(selectedRun.id) : null,
    enabled: !!selectedRun,
  });

  const chartData = {
    labels: stats?.passRateTrend?.map((item: any) => 
      new Date(item.date).toLocaleDateString()
    ).reverse() || [],
    datasets: [
      {
        label: 'Pass Rate (%)',
        data: stats?.passRateTrend?.map((item: any) => item.pass_rate).reverse() || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Test Pass Rate Trend',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          View test execution results and analytics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Runs
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.summary?.total_runs || 0}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Passed
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {stats?.summary?.passed_runs || 0}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Failed
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600">
              {stats?.summary?.failed_runs || 0}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Pass Rate
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.summary?.total_runs > 0
                ? ((stats.summary.passed_runs / stats.summary.total_runs) * 100).toFixed(1)
                : 0}%
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Avg Duration
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.summary?.avg_duration_seconds
                ? `${Math.round(stats.summary.avg_duration_seconds)}s`
                : '0s'}
            </dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Pass Rate Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          {stats?.passRateTrend && stats.passRateTrend.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="text-center text-gray-500 py-8">
              No trend data available yet
            </div>
          )}
        </div>

        {/* Feature Stats */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Performance</h3>
          <div className="space-y-4">
            {featureStats?.map((feature: any) => (
              <div key={feature.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                  <p className="text-xs text-gray-500">
                    {feature.test_count} tests • {feature.run_count} runs
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {feature.pass_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">pass rate</p>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${feature.pass_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Runs Table */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Test Runs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runs?.map((run: TestRun) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {run.test_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.feature_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        run.status === 'passed'
                          ? 'bg-green-100 text-green-800'
                          : run.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : run.status === 'running'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.started_at && run.completed_at
                      ? `${Math.round(
                          (new Date(run.completed_at).getTime() -
                            new Date(run.started_at).getTime()) /
                            1000
                        )}s`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(run.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                    <button
                      onClick={() => setSelectedRun(run)}
                      className="hover:text-indigo-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Details Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Test Run Details
              </h2>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Test:</h3>
                <p className="text-sm text-gray-900">{selectedRun.test_title}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700">Status:</h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedRun.status === 'passed'
                      ? 'bg-green-100 text-green-800'
                      : selectedRun.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selectedRun.status}
                </span>
              </div>
              
              {runResults && runResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Test Results:</h3>
                  <div className="space-y-2">
                    {runResults.map((result: any) => (
                      <div key={result.id} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-gray-900">
                            {result.test_name || 'Test Step'}
                          </p>
                          <span
                            className={`text-xs font-medium ${
                              result.status === 'passed'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>
                        {result.error_message && (
                          <p className="mt-1 text-sm text-red-600">{result.error_message}</p>
                        )}
                        {result.duration_ms && (
                          <p className="mt-1 text-xs text-gray-500">
                            Duration: {result.duration_ms}ms
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}