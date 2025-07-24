import axios from 'axios';

export async function convertNaturalLanguageToPlaywright(naturalLanguage: string): Promise<string> {
  try {
    // For MVP, we'll use OpenAI API to convert natural language to Playwright code
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a Playwright test code generator. Convert natural language test descriptions into Playwright test code.
            
Rules:
1. Use TypeScript syntax
2. Import from '@playwright/test'
3. Use descriptive test names
4. Include proper selectors (prefer data-testid, then role, then text)
5. Add appropriate waits and assertions
6. Handle common patterns like login, navigation, form filling
7. Return ONLY the test code, no explanations

Example input: "Login with valid credentials and verify dashboard is displayed"
Example output:
import { test, expect } from '@playwright/test';

test('Login with valid credentials and verify dashboard is displayed', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
  await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
});`
          },
          {
            role: 'user',
            content: naturalLanguage
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error converting natural language to Playwright:', error);
    
    // Fallback to a template-based approach
    return generateTemplateBasedTest(naturalLanguage);
  }
}

function generateTemplateBasedTest(naturalLanguage: string): string {
  const lowerCase = naturalLanguage.toLowerCase();
  const testName = naturalLanguage.trim();
  
  // Basic template
  let testCode = `import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
`;

  // Detect common patterns and add appropriate code
  if (lowerCase.includes('login')) {
    testCode += `  await page.goto('/login');
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
`;
  }

  if (lowerCase.includes('navigate') || lowerCase.includes('go to')) {
    const urlMatch = naturalLanguage.match(/["']([^"']+)["']/);
    const url = urlMatch ? urlMatch[1] : '/';
    testCode += `  await page.goto('${url}');
`;
  }

  if (lowerCase.includes('click')) {
    testCode += `  await page.click('button');
`;
  }

  if (lowerCase.includes('fill') || lowerCase.includes('type')) {
    testCode += `  await page.fill('input', 'text');
`;
  }

  if (lowerCase.includes('verify') || lowerCase.includes('check') || lowerCase.includes('assert')) {
    testCode += `  await expect(page.locator('h1')).toBeVisible();
`;
  }

  testCode += `});`;
  
  return testCode;
}