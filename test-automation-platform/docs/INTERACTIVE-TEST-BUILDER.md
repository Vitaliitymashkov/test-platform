# Interactive Test Builder Documentation

## Overview

The Interactive Test Builder is a revolutionary feature that allows QA engineers to create comprehensive test suites by interacting with their application in real-time. This tool bridges the gap between manual testing and automated test creation.

## Core Concepts

### 1. Browser Sessions
A browser session is a controlled Playwright instance that you can interact with through the platform. Sessions can be:
- **Headed**: Visible browser window for interactive testing
- **Headless**: Background browser for CI/CD environments
- **Recorded**: All actions are captured for test generation

### 2. Element Mapping
Element mapping is the process of identifying and naming UI elements for reuse in tests:
- **Automatic Detection**: Elements are detected as you interact
- **Manual Mapping**: Explicitly map elements with custom names
- **Smart Selectors**: Multiple fallback strategies for resilience

### 3. Page Object Models (POM)
POMs are automatically generated classes that encapsulate page interactions:
- **Element Locators**: All mapped elements become properties
- **Action Methods**: Common interactions become methods
- **Assertions**: Verification methods for testing

## Workflow

### Step 1: Start a Session
```javascript
// Session configuration
{
  headless: false,      // Show browser window
  slowMo: 100,         // Slow down actions for visibility
  viewport: {
    width: 1280,
    height: 720
  }
}
```

### Step 2: Navigate and Analyze
When you navigate to a URL, the system:
1. Loads the page completely
2. Extracts all interactive elements
3. Generates smart selectors
4. Creates/updates the Page Object Model
5. Stores element mappings

### Step 3: Record Interactions
Recording mode captures:
- Click actions with exact selectors
- Text input with values
- Navigation between pages
- Form submissions
- Dropdown selections

### Step 4: Generate Test Code
The system generates clean, maintainable test code:
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test('User login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.navigate();
  await loginPage.fillEmail('user@example.com');
  await loginPage.fillPassword('securepass');
  await loginPage.clickLoginButton();
  
  await expect(page).toHaveURL('/dashboard');
});
```

## Element Mapping Strategies

### Selector Priority
1. **ID**: `#unique-id`
2. **Data Test ID**: `[data-testid="element"]`
3. **ARIA Label**: `[aria-label="Submit"]`
4. **Text Content**: `text="Click me"`
5. **CSS Classes**: `.unique-class`
6. **XPath**: `//div[@class="container"]`

### Stability Detection
Elements are marked as:
- **Stable**: Selector consistently works
- **Unstable**: Selector may need updating
- **Missing**: Element no longer exists

## Real-time Features

### WebSocket Communication
The platform uses WebSockets for instant updates:
```javascript
// Connect to session
const ws = new WebSocket(`ws://localhost:3001/api/interactive-test/sessions/${sessionId}/ws`);

// Listen for events
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  
  switch(type) {
    case 'stepRecorded':
      // New action recorded
      break;
    case 'elementMapped':
      // Element successfully mapped
      break;
    case 'pageAnalyzed':
      // Page analysis complete
      break;
  }
};
```

### Preview Mode
Before executing actions, preview:
- Will the action navigate to a new page?
- Will it open a modal?
- Will it submit a form?
- What's the target URL?

## Best Practices

### 1. Naming Conventions
Use descriptive, consistent names:
- **Good**: `loginButton`, `emailInput`, `dashboardHeader`
- **Bad**: `button1`, `input`, `div`

### 2. Page Organization
Structure your pages logically:
```
pages/
├── auth/
│   ├── login.page.ts
│   ├── register.page.ts
│   └── forgot-password.page.ts
├── dashboard/
│   ├── overview.page.ts
│   └── settings.page.ts
└── common/
    ├── header.component.ts
    └── footer.component.ts
```

### 3. Selector Resilience
Always provide multiple selector strategies:
```typescript
// Primary selector
const button = page.locator('#submit-btn');

// Fallback selectors
const fallbacks = [
  page.locator('[data-testid="submit"]'),
  page.locator('button:has-text("Submit")'),
  page.locator('.submit-button')
];
```

### 4. Recording Tips
- Start recording after page is loaded
- Perform actions slowly and deliberately
- Map important elements before recording
- Stop recording after completing the flow
- Review and refine generated code

## Advanced Usage

### Custom Wait Strategies
```typescript
// Wait for specific conditions
await page.waitForSelector('#loading', { state: 'hidden' });
await page.waitForURL('/success');
await page.waitForResponse(response => 
  response.url().includes('/api/data') && response.status() === 200
);
```

### Dynamic Element Handling
```typescript
// Handle dynamic content
const dynamicList = await page.$$('.list-item');
for (const item of dynamicList) {
  const text = await item.textContent();
  if (text?.includes('target')) {
    await item.click();
    break;
  }
}
```

### Trace Integration
Enable traces for debugging:
```typescript
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true
});

// Run test...

await context.tracing.stop({
  path: 'trace.zip'
});
```

## Troubleshooting

### Session Issues
| Problem | Solution |
|---------|----------|
| Session won't start | Check Playwright installation: `npx playwright install` |
| Browser crashes | Increase memory allocation, reduce viewport size |
| Can't connect to session | Verify WebSocket port is open (3001) |

### Element Mapping Issues
| Problem | Solution |
|---------|----------|
| Element not found | Wait for page load, check if element is visible |
| Selector too generic | Use more specific attributes or parent context |
| Dynamic elements | Use contains text or partial attribute matching |

### Recording Issues
| Problem | Solution |
|---------|----------|
| Actions not recorded | Ensure recording is started before interactions |
| Wrong selectors captured | Manually map elements before recording |
| Missing steps | Slow down actions with slowMo option |

## Integration Examples

### GitHub Actions
```yaml
name: Run Interactive Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npx playwright install
      - run: npm test
```

### Local Development
```bash
# Start interactive session
npm run test:interactive

# Run generated tests
npm run test:e2e

# Debug with traces
npm run test:debug
```

## Performance Optimization

### Session Management
- Close unused sessions promptly
- Reuse sessions when possible
- Limit concurrent sessions
- Use headless mode for faster execution

### Element Caching
- Cache stable selectors
- Batch element verification
- Update mappings periodically
- Remove obsolete elements

## Security Considerations

### Sensitive Data
- Never record passwords in plain text
- Mask sensitive information in screenshots
- Use environment variables for credentials
- Encrypt stored test data

### Access Control
- Authenticate all API endpoints
- Validate session ownership
- Limit session duration
- Log all interactions

## Future Enhancements

### Planned Features
1. **AI-Powered Suggestions**: Recommend next test steps
2. **Visual Regression**: Compare screenshots automatically
3. **Cross-browser Testing**: Support multiple browsers
4. **Mobile Testing**: Responsive design testing
5. **Collaborative Testing**: Real-time team collaboration

### API Expansion
- Bulk element operations
- Test suite management
- Custom assertions library
- Plugin architecture

## Conclusion

The Interactive Test Builder revolutionizes test automation by combining the intuition of manual testing with the power of automated execution. By following these guidelines and best practices, you can create robust, maintainable test suites that evolve with your application.