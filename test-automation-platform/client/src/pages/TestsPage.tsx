import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testsService, featuresService } from '../services/api';
import { TestCase, Feature } from '../types';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  PlayIcon,
  CodeBracketIcon,
  EyeIcon 
} from '@heroicons/react/24/outline';

export default function TestsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [viewingTest, setViewingTest] = useState<TestCase | null>(null);

  const { data: tests, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: testsService.getAll,
  });

  const { data: features } = useQuery({
    queryKey: ['features'],
    queryFn: featuresService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: testsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      testsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setEditingTest(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: testsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: testsService.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRuns'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tests</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your automated test scenarios
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Test
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {tests?.map((test: TestCase) => (
            <li key={test.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{test.title}</h3>
                  {test.description && (
                    <p className="mt-1 text-sm text-gray-500">{test.description}</p>
                  )}
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>{test.feature_name}</span>
                    <span className="mx-2">•</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {test.status}
                    </span>
                    {test.github_url && (
                      <>
                        <span className="mx-2">•</span>
                        <a
                          href={test.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          View on GitHub
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewingTest(test)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="View code"
                  >
                    <CodeBracketIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => runMutation.mutate(test.id)}
                    disabled={runMutation.isPending}
                    className="p-2 text-gray-400 hover:text-green-600 disabled:opacity-50"
                    title="Run test"
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setEditingTest(test)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this test?')) {
                        deleteMutation.mutate(test.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingTest) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingTest ? 'Edit Test' : 'Create New Test'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  naturalLanguage: formData.get('naturalLanguage') as string,
                  featureId: parseInt(formData.get('featureId') as string),
                };
                
                if (editingTest) {
                  updateMutation.mutate({ id: editingTest.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Feature
                  </label>
                  <select
                    name="featureId"
                    required
                    defaultValue={editingTest?.feature_id}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a feature</option>
                    {features?.map((feature: Feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingTest?.title}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={editingTest?.description}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Test Scenario (Natural Language)
                  </label>
                  <textarea
                    name="naturalLanguage"
                    rows={6}
                    required
                    defaultValue={editingTest?.natural_language}
                    placeholder="Example: Navigate to the login page, enter email 'user@example.com' and password 'test123', click the login button, and verify that the dashboard is displayed"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Describe your test scenario in plain English. The system will convert it to Playwright code.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingTest(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editingTest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Code Modal */}
      {viewingTest && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {viewingTest.title} - Playwright Code
              </h2>
              <button
                onClick={() => setViewingTest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Natural Language:</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-800">{viewingTest.natural_language}</p>
                </div>
              </div>
              
              {viewingTest.playwright_code && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Playwright Code:</h3>
                  <div className="bg-gray-900 p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm text-gray-100">
                      <code>{viewingTest.playwright_code}</code>
                    </pre>
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