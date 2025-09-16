import * as fs from 'fs/promises';
import * as path from 'path';
import { pageObjectService } from './pageObjectService';

interface RepoStructure {
  directories: string[];
  files: { path: string; content: string }[];
}

/**
 * Service for initializing test repositories with POM structure
 */
export class RepoInitService {
  /**
   * Initialize a new test repository with POM structure
   */
  async initializeTestRepo(repoPath: string, projectName: string): Promise<void> {
    console.log(`Initializing test repository at ${repoPath}`);
    
    // Create directory structure
    await this.createDirectoryStructure(repoPath);
    
    // Create base configuration files
    await this.createConfigFiles(repoPath, projectName);
    
    // Create base page object
    await this.createBasePage(repoPath);
    
    // Create sample files
    await this.createSampleFiles(repoPath);
    
    // Initialize git (if not already)
    await this.initializeGit(repoPath);
    
    console.log('Test repository initialized successfully');
  }

  /**
   * Create POM directory structure
   */
  private async createDirectoryStructure(repoPath: string): Promise<void> {
    const directories = [
      'tests',
      'tests/auth',
      'tests/features',
      'pages',
      'pages/components',
      'fixtures',
      'utils',
      'config',
      'reports',
      'screenshots'
    ];

    for (const dir of directories) {
      await fs.mkdir(path.join(repoPath, dir), { recursive: true });
    }
  }

  /**
   * Create base configuration files
   */
  private async createConfigFiles(repoPath: string, projectName: string): Promise<void> {
    // package.json
    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: 'Test automation framework using Playwright and Page Object Model',
      scripts: {
        test: 'playwright test',
        'test:headed': 'playwright test --headed',
        'test:debug': 'playwright test --debug',
        'test:ui': 'playwright test --ui',
        'test:report': 'playwright show-report',
        lint: 'eslint . --ext .ts,.tsx',
        format: 'prettier --write "**/*.{ts,tsx,json}"'
      },
      devDependencies: {
        '@playwright/test': '^1.40.0',
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        eslint: '^8.0.0',
        prettier: '^3.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0'
      }
    };

    await fs.writeFile(
      path.join(repoPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: '.',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
        baseUrl: '.',
        paths: {
          '@pages/*': ['pages/*'],
          '@components/*': ['pages/components/*'],
          '@utils/*': ['utils/*'],
          '@fixtures/*': ['fixtures/*']
        }
      },
      include: ['**/*.ts'],
      exclude: ['node_modules', 'dist']
    };

    await fs.writeFile(
      path.join(repoPath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // playwright.config.ts
    const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
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
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  outputDir: 'test-results/',
});`;

    await fs.writeFile(
      path.join(repoPath, 'playwright.config.ts'),
      playwrightConfig
    );

    // .gitignore
    const gitignore = `node_modules/
dist/
test-results/
reports/
screenshots/
videos/
.env
.env.local
*.log
.DS_Store
playwright-report/
playwright/.cache/`;

    await fs.writeFile(
      path.join(repoPath, '.gitignore'),
      gitignore
    );

    // .prettierrc
    const prettierConfig = {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false
    };

    await fs.writeFile(
      path.join(repoPath, '.prettierrc'),
      JSON.stringify(prettierConfig, null, 2)
    );

    // .eslintrc.json
    const eslintConfig = {
      parser: '@typescript-eslint/parser',
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:playwright/recommended'
      ],
      plugins: ['@typescript-eslint'],
      env: {
        node: true,
        es2020: true
      },
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    };

    await fs.writeFile(
      path.join(repoPath, '.eslintrc.json'),
      JSON.stringify(eslintConfig, null, 2)
    );
  }

  /**
   * Create base page from template
   */
  private async createBasePage(repoPath: string): Promise<void> {
    const basePageContent = await pageObjectService.getBasePageTemplate();
    await fs.writeFile(
      path.join(repoPath, 'pages', 'base.page.ts'),
      basePageContent
    );
  }

  /**
   * Create sample files to demonstrate structure
   */
  private async createSampleFiles(repoPath: string): Promise<void> {
    // Sample test
    const sampleTest = `import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/login.page';

test.describe('Authentication Tests', () => {
  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.navigateToLogin();
    await loginPage.login('test@example.com', 'password123');
    
    // Verify successful login
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.navigateToLogin();
    await loginPage.login('invalid@example.com', 'wrongpassword');
    
    // Verify error message
    await expect(loginPage.isErrorMessageDisplayed()).toBeTruthy();
    const errorText = await loginPage.getErrorMessageText();
    expect(errorText).toContain('Invalid credentials');
  });
});`;

    await fs.writeFile(
      path.join(repoPath, 'tests', 'auth', 'login.spec.ts'),
      sampleTest
    );

    // Sample fixture
    const sampleFixture = `export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User'
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  }
};

export const testData = {
  productName: 'Test Product',
  productPrice: 99.99,
  productDetails: 'This is a test product description'
};`;

    await fs.writeFile(
      path.join(repoPath, 'fixtures', 'test-data.ts'),
      sampleFixture
    );

    // Sample utility
    const sampleUtil = `import { Page } from '@playwright/test';

/**
 * Wait for element to be stable (not moving)
 */
export async function waitForElementStable(page: Page, selector: string, timeout = 1000) {
  const element = page.locator(selector);
  let previousBox = await element.boundingBox();
  let stableCount = 0;
  
  while (stableCount < 3) {
    await page.waitForTimeout(100);
    const currentBox = await element.boundingBox();
    
    if (previousBox && currentBox &&
        previousBox.x === currentBox.x &&
        previousBox.y === currentBox.y) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    
    previousBox = currentBox;
    
    if (Date.now() > timeout) {
      throw new Error(\`Element \${selector} did not stabilize within \${timeout}ms\`);
    }
  }
}

/**
 * Take a screenshot with a specific name
 */
export async function takeNamedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: \`screenshots/\${name}-\${timestamp}.png\`,
    fullPage: true
  });
}

/**
 * Generate random email
 */
export function generateRandomEmail(): string {
  const timestamp = Date.now();
  return \`test-\${timestamp}@example.com\`;
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}`;

    await fs.writeFile(
      path.join(repoPath, 'utils', 'test-helpers.ts'),
      sampleUtil
    );

    // README
    const readme = `# ${projectName} Test Automation

This repository contains automated tests using Playwright and the Page Object Model pattern.

## Structure

- \`tests/\` - Test specifications organized by feature
- \`pages/\` - Page Object classes
- \`pages/components/\` - Reusable component classes
- \`fixtures/\` - Test data and fixtures
- \`utils/\` - Helper functions and utilities
- \`config/\` - Configuration files
- \`reports/\` - Test execution reports
- \`screenshots/\` - Test screenshots

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Install Playwright browsers:
   \`\`\`bash
   npx playwright install
   \`\`\`

## Running Tests

- Run all tests: \`npm test\`
- Run tests in headed mode: \`npm run test:headed\`
- Debug tests: \`npm run test:debug\`
- Open Playwright UI: \`npm run test:ui\`
- View test report: \`npm run test:report\`

## Writing Tests

1. Create page objects in \`pages/\` directory
2. Write test specs in \`tests/\` directory
3. Use fixtures from \`fixtures/\` for test data
4. Utilize helper functions from \`utils/\`

## Best Practices

1. Always extend BasePage for new page objects
2. Use data-testid attributes for element selectors
3. Keep tests independent and atomic
4. Use descriptive test names
5. Implement proper waits and assertions
6. Handle test data cleanup

## CI/CD

Tests are configured to run in GitHub Actions. See \`.github/workflows/test-execution.yml\`
`;

    await fs.writeFile(
      path.join(repoPath, 'README.md'),
      readme
    );
  }

  /**
   * Initialize git repository
   */
  private async initializeGit(repoPath: string): Promise<void> {
    try {
      const gitDir = path.join(repoPath, '.git');
      await fs.access(gitDir);
      console.log('Git repository already initialized');
    } catch {
      // Git not initialized, we can skip this as the user might initialize it separately
      console.log('Git repository not initialized. Run "git init" to initialize.');
    }
  }

  /**
   * Add GitHub Actions workflow
   */
  async addGitHubActionsWorkflow(repoPath: string): Promise<void> {
    const workflowDir = path.join(repoPath, '.github', 'workflows');
    await fs.mkdir(workflowDir, { recursive: true });
    
    // Copy the test execution workflow
    const workflowContent = await fs.readFile(
      path.join(__dirname, '../../examples/test-execution.yml'),
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(workflowDir, 'test-execution.yml'),
      workflowContent
    );
  }
}

// Export singleton instance
export const repoInitService = new RepoInitService();