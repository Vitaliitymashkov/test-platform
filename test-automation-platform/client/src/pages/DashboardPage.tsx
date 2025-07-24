import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsService, featuresService, testsService } from '../services/api';
import {
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => reportsService.getStats(),
  });

  const { data: features } = useQuery({
    queryKey: ['features'],
    queryFn: featuresService.getAll,
  });

  const { data: recentTests } = useQuery({
    queryKey: ['recentTests'],
    queryFn: testsService.getAll,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recentRuns'],
    queryFn: () => reportsService.getRuns({ limit: 5 }),
  });

  const passRate = stats?.summary?.total_runs > 0
    ? ((stats.summary.passed_runs / stats.summary.total_runs) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your test automation platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Features
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {features?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Tests
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats?.summary?.total_tests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Test Runs
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats?.summary?.total_runs || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pass Rate
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {passRate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Tests */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Tests</h3>
          </div>
          <div className="p-6">
            {recentTests && recentTests.length > 0 ? (
              <div className="space-y-4">
                {recentTests.slice(0, 5).map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{test.title}</p>
                      <p className="text-sm text-gray-500">{test.feature_name}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {test.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No tests yet</p>
            )}
            <div className="mt-6">
              <Link
                to="/tests"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all tests →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Test Runs</h3>
          </div>
          <div className="p-6">
            {recentRuns && recentRuns.length > 0 ? (
              <div className="space-y-4">
                {recentRuns.map((run: any) => (
                  <div key={run.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{run.test_title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(run.created_at).toLocaleDateString()}
                      </p>
                    </div>
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No test runs yet</p>
            )}
            <div className="mt-6">
              <Link
                to="/reports"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all reports →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}