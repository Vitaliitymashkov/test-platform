# 🚀 AI-Powered Test Automation Platform

## The Ultimate QA Automation Engineer Assistant

A cutting-edge test automation platform that combines AI-powered natural language processing with interactive browser automation to create, manage, and execute sophisticated test suites. This platform transforms QA automation by enabling both technical and non-technical users to build robust test frameworks.

## 🌟 Key Features

### 1. **Interactive Test Builder** 🎯
Build tests interactively while browsing your application in real-time.

- **Live Browser Control**: Launch and control browser sessions directly from the platform
- **Real-time Element Mapping**: Click on elements to map them with custom names
- **Visual Test Recording**: Record your interactions and generate test code automatically
- **Smart Selector Generation**: Automatically identifies the best selectors (ID > data-testid > aria-label > text)
- **Preview Actions**: See what will happen before clicking (navigation, modal, form submission)

### 2. **Intelligent Page Object Models** 📄
Automatically generate and maintain Page Object Models (POM) for better test organization.

- **Auto-discovery**: Analyzes pages to extract all interactive elements
- **Smart Naming**: Generates meaningful names for elements based on their properties
- **Version Control**: Tracks changes to page structure over time
- **GitHub Integration**: Syncs POMs with your repository for team collaboration
- **Self-healing**: Multiple selector strategies with automatic fallback

### 3. **Natural Language to Code** 🤖
Write tests in plain English and let AI convert them to Playwright code.

- **OpenAI Integration**: Leverages GPT-4 for intelligent code generation
- **Context-Aware**: Uses actual page analysis for accurate selector generation
- **Multiple Frameworks**: Supports Playwright (Cypress, Selenium coming soon)
- **Template Library**: Pre-built templates for common testing patterns

### 4. **Advanced Element Management** 🔍
Never lose track of your UI elements again.

- **Element Repository**: Centralized storage of all mapped elements
- **Stability Tracking**: Monitors element reliability over time
- **Alternative Selectors**: Maintains backup selectors for resilience
- **Real-time Verification**: Check if elements are still valid
- **Bulk Updates**: Update multiple elements at once when UI changes

### 5. **Test Execution & Reporting** 📊
Execute tests with comprehensive reporting and analysis.

- **GitHub Actions Integration**: Run tests in CI/CD pipelines
- **Playwright Traces**: Full debugging with screenshots and network logs
- **Video Recording**: Capture test execution for review
- **Trend Analysis**: Track test performance over time
- **Failure Analysis**: Intelligent root cause detection

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Dashboard │ Interactive Builder │ Test Management │ Reports │
└─────────────────────────────────────────────────────────────┘
                              │
                    WebSocket │ REST API
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                         │
├─────────────────────────────────────────────────────────────┤
│  Session Manager │ Element Mapper │ Code Generator │ Storage │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │   Playwright    │         │     GitHub     │
        │   Browser       │         │   Repository   │
        │   Automation    │         │    Storage     │
        └────────────────┘         └────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- GitHub account with OAuth App
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd test-automation-platform
```

2. **Install dependencies**
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

3. **Set up environment variables**

Create `.env` in the server directory:
```env
# Server Configuration
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/test_automation

# Authentication
JWT_SECRET=your-secret-key

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Optional: Test Repository Path
TEST_REPO_PATH=/path/to/your/test/repository
```

4. **Set up the database**
```bash
psql -U your_username -d test_automation -f server/database/schema.sql
psql -U your_username -d test_automation -f server/database/migrations/001_add_email_auth.sql
psql -U your_username -d test_automation -f server/database/migrations/004_add_page_analysis_tables.sql
```

5. **Start the application**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Access the application at `http://localhost:3000`

## 📖 Usage Guide

### 1. Interactive Test Building

#### Starting a Session
1. Navigate to the **Interactive** tab
2. Click **Start Session** to launch a browser
3. Enter the URL of your application
4. Click **Navigate** to load the page

#### Recording Tests
1. Click **Start Recording** to begin capturing actions
2. Interact with your application normally
3. Elements will be automatically mapped as you interact
4. Click **Stop Recording** to generate test code

#### Mapping Elements
1. Hover over any element in the browser
2. Enter a meaningful name in the mapping field
3. Click **Map** to save the element
4. The element is now available for future tests

### 2. Writing Tests with Natural Language

```javascript
// Example natural language input:
"Login with email user@example.com and password test123, 
then verify the dashboard is displayed"

// Generated Playwright code:
import { test, expect } from '@playwright/test';

test('Login and verify dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'test123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
  await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
});
```

### 3. Page Object Model Example

The system automatically generates POMs:

```typescript
// Generated LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  private page: Page;
  
  // Locators
  private emailInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;
  private errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}
```

## 🔌 API Documentation

### Interactive Test Endpoints

#### Start Session
```http
POST /api/interactive-test/sessions
{
  "headless": false,
  "slowMo": 100,
  "viewport": { "width": 1280, "height": 720 }
}
```

#### Navigate to URL
```http
POST /api/interactive-test/sessions/:sessionId/navigate
{
  "url": "https://example.com"
}
```

#### Record Actions
```http
POST /api/interactive-test/sessions/:sessionId/record/start
POST /api/interactive-test/sessions/:sessionId/record/stop
```

#### Interact with Elements
```http
POST /api/interactive-test/sessions/:sessionId/actions/click
{
  "selector": "#submit-button",
  "elementName": "submitButton"
}

POST /api/interactive-test/sessions/:sessionId/actions/fill
{
  "selector": "#email-input",
  "value": "test@example.com",
  "elementName": "emailField"
}
```

#### Map Elements
```http
POST /api/interactive-test/sessions/:sessionId/elements/map
{
  "selector": ".nav-link",
  "name": "navigationLink"
}
```

### WebSocket Events

Connect to `ws://localhost:3001/api/interactive-test/sessions/:sessionId/ws`

Events:
- `stepRecorded`: New test step recorded
- `elementMapped`: New element mapped
- `pageAnalyzed`: Page analysis complete

## 🎯 Advanced Features

### Self-Healing Tests
When a primary selector fails, the system automatically tries alternative selectors:
1. ID selector
2. data-testid attribute
3. aria-label
4. Text content
5. Unique CSS classes

### Intelligent Element Detection
The platform identifies element types and generates appropriate methods:
- **Input fields**: `fill()`, `getValue()`
- **Buttons/Links**: `click()`
- **Dropdowns**: `selectOption()`
- **Checkboxes**: `check()`, `uncheck()`

### Test Data Management
- Environment-specific configurations
- Secure credential storage
- Test data generation with AI
- Data masking for sensitive information

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

## 📊 Roadmap

### Phase 1: Core Features ✅
- [x] Interactive test builder
- [x] Page Object Model generation
- [x] Natural language to code
- [x] GitHub integration
- [x] Basic reporting

### Phase 2: Enhanced Intelligence (In Progress)
- [ ] Self-healing test improvements
- [ ] Visual regression testing
- [ ] Test impact analysis
- [ ] Advanced failure analysis
- [ ] Test prioritization

### Phase 3: Enterprise Features (Planned)
- [ ] Multi-framework support (Cypress, Selenium)
- [ ] Mobile testing (Appium)
- [ ] API testing integration
- [ ] Performance testing
- [ ] Role-based access control
- [ ] SSO integration

### Phase 4: AI Advancements (Future)
- [ ] Automatic test generation from user behavior
- [ ] Anomaly detection in test results
- [ ] Predictive test maintenance
- [ ] Natural language test debugging

## 🐛 Troubleshooting

### Common Issues

#### Browser session not starting
- Ensure Playwright is properly installed: `npx playwright install`
- Check if ports 3000 and 3001 are available

#### Elements not being detected
- Verify the page is fully loaded before mapping
- Check browser console for errors
- Ensure selectors are unique

#### Database connection issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Run migrations if needed

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Playwright team for the amazing browser automation library
- OpenAI for GPT-4 API
- GitHub for repository integration
- The open-source community

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
- Check our [FAQ](docs/FAQ.md)

---

Built with ❤️ by the Test Automation Platform Team