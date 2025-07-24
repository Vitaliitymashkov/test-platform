import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { pool } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get user's repositories
router.get('/repos', async (req: AuthRequest, res) => {
  try {
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [req.user!.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const octokit = new Octokit({
      auth: userResult.rows[0].access_token,
    });
    
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Create a new repository for tests
router.post('/repos', async (req: AuthRequest, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Repository name is required' });
  }
  
  try {
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [req.user!.id]
    );
    
    const octokit = new Octokit({
      auth: userResult.rows[0].access_token,
    });
    
    // Create repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name,
      description: description || 'Automated test repository',
      private: false,
      auto_init: true,
    });
    
    // Create initial structure
    const files = [
      {
        path: '.github/workflows/test-execution.yml',
        content: Buffer.from(getWorkflowContent()).toString('base64'),
      },
      {
        path: 'playwright.config.ts',
        content: Buffer.from(getPlaywrightConfig()).toString('base64'),
      },
      {
        path: 'package.json',
        content: Buffer.from(getPackageJson(name)).toString('base64'),
      },
      {
        path: 'tests/.gitkeep',
        content: '',
      },
    ];
    
    // Create files in repository
    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: repo.owner.login,
        repo: repo.name,
        path: file.path,
        message: `Add ${file.path}`,
        content: file.content,
      });
    }
    
    res.json(repo);
  } catch (error) {
    console.error('Error creating repository:', error);
    res.status(500).json({ error: 'Failed to create repository' });
  }
});

// Trigger a workflow run
router.post('/repos/:owner/:repo/actions/workflows/:workflow/dispatches', async (req: AuthRequest, res) => {
  const { owner, repo, workflow } = req.params;
  const { ref = 'main', inputs = {} } = req.body;
  
  try {
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [req.user!.id]
    );
    
    const octokit = new Octokit({
      auth: userResult.rows[0].access_token,
    });
    
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflow,
      ref,
      inputs,
    });
    
    res.json({ message: 'Workflow triggered successfully' });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({ error: 'Failed to trigger workflow' });
  }
});

// Get workflow runs
router.get('/repos/:owner/:repo/actions/runs', async (req: AuthRequest, res) => {
  const { owner, repo } = req.params;
  
  try {
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [req.user!.id]
    );
    
    const octokit = new Octokit({
      auth: userResult.rows[0].access_token,
    });
    
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 20,
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

function getWorkflowContent(): string {
  return `name: Test Execution

on:
  workflow_dispatch:
    inputs:
      test_file:
        description: 'Test file to run'
        required: false
        default: ''
      test_id:
        description: 'Test ID for tracking'
        required: false
        default: ''
  push:
    branches: [ main ]
    paths:
      - 'tests/**/*.spec.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
      
    - name: Run tests
      run: |
        if [ -n "\${{ github.event.inputs.test_file }}" ]; then
          npx playwright test "\${{ github.event.inputs.test_file }}"
        else
          npx playwright test
        fi
      env:
        TEST_ID: \${{ github.event.inputs.test_id }}
        
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
        
    - name: Upload test videos
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-videos
        path: test-results/
        retention-days: 30`;
}

function getPlaywrightConfig(): string {
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});`;
}

function getPackageJson(name: string): string {
  return JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: 'Automated test suite',
    scripts: {
      test: 'playwright test',
      'test:ui': 'playwright test --ui',
      'test:debug': 'playwright test --debug',
    },
    devDependencies: {
      '@playwright/test': '^1.40.0',
      typescript: '^5.0.0',
    },
  }, null, 2);
}

export default router;