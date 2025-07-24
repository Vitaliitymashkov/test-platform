import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  getGitHubAuthUrl: async () => {
    const response = await api.get('/auth/github');
    return response.data.url;
  },
  
  githubCallback: async (code: string) => {
    const response = await api.post('/auth/github/callback', { code });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
  },
};

export const featuresService = {
  getAll: async () => {
    const response = await api.get('/features');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/features/${id}`);
    return response.data;
  },
  
  create: async (data: { name: string; description?: string; repository_path?: string }) => {
    const response = await api.post('/features', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<{ name: string; description: string; repository_path: string }>) => {
    const response = await api.put(`/features/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/features/${id}`);
    return response.data;
  },
  
  getTests: async (id: number) => {
    const response = await api.get(`/features/${id}/tests`);
    return response.data;
  },
};

export const testsService = {
  getAll: async () => {
    const response = await api.get('/tests');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/tests/${id}`);
    return response.data;
  },
  
  create: async (data: { title: string; description?: string; naturalLanguage: string; featureId: number }) => {
    const response = await api.post('/tests', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<{ title: string; description: string; naturalLanguage: string }>) => {
    const response = await api.put(`/tests/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/tests/${id}`);
    return response.data;
  },
  
  run: async (id: number) => {
    const response = await api.post(`/tests/${id}/run`);
    return response.data;
  },
};

export const githubService = {
  getRepositories: async () => {
    const response = await api.get('/github/repos');
    return response.data;
  },
  
  createRepository: async (data: { name: string; description?: string }) => {
    const response = await api.post('/github/repos', data);
    return response.data;
  },
  
  triggerWorkflow: async (owner: string, repo: string, workflow: string, data?: any) => {
    const response = await api.post(`/github/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, data);
    return response.data;
  },
  
  getWorkflowRuns: async (owner: string, repo: string) => {
    const response = await api.get(`/github/repos/${owner}/${repo}/actions/runs`);
    return response.data;
  },
};

export const reportsService = {
  getRuns: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const response = await api.get('/reports/runs', { params });
    return response.data;
  },
  
  getRunResults: async (runId: number) => {
    const response = await api.get(`/reports/runs/${runId}/results`);
    return response.data;
  },
  
  getStats: async (params?: { startDate?: string; endDate?: string; featureId?: number }) => {
    const response = await api.get('/reports/stats', { params });
    return response.data;
  },
  
  getFeatureStats: async () => {
    const response = await api.get('/reports/stats/features');
    return response.data;
  },
  
  generateReport: async (data: { name: string; type: string; filters?: any }) => {
    const response = await api.post('/reports/generate', data);
    return response.data;
  },
  
  getSavedReports: async () => {
    const response = await api.get('/reports/saved');
    return response.data;
  },
  
  getSavedReport: async (id: number) => {
    const response = await api.get(`/reports/saved/${id}`);
    return response.data;
  },
};