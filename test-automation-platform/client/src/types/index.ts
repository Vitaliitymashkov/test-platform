export interface User {
  id: number;
  email: string;
  githubUsername: string;
}

export interface Feature {
  id: number;
  name: string;
  description?: string;
  repository_path?: string;
  test_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: number;
  feature_id: number;
  feature_name?: string;
  title: string;
  description?: string;
  natural_language: string;
  playwright_code?: string;
  file_path?: string;
  github_url?: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: number;
  test_case_id: number;
  test_title?: string;
  test_description?: string;
  feature_name?: string;
  github_run_id?: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  trigger_type?: string;
  branch?: string;
  commit_sha?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface TestResult {
  id: number;
  test_run_id: number;
  test_name?: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  screenshot_url?: string;
  video_url?: string;
  created_at: string;
}

export interface TestStats {
  summary: {
    total_runs: number;
    passed_runs: number;
    failed_runs: number;
    total_tests: number;
    avg_duration_seconds: number;
  };
  passRateTrend: Array<{
    date: string;
    pass_rate: number;
    total_runs: number;
  }>;
}

export interface FeatureStats {
  id: number;
  name: string;
  test_count: number;
  run_count: number;
  passed_runs: number;
  failed_runs: number;
  pass_rate: number;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  default_branch: string;
  private: boolean;
}