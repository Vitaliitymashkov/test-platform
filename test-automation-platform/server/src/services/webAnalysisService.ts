import { chromium, Browser, Page, ElementHandle } from 'playwright';

interface PageElement {
  type: string;
  selector: string;
  text?: string;
  attributes: Record<string, string>;
  isInteractive: boolean;
  suggestedName?: string;
}

interface PageAnalysisResult {
  url: string;
  title: string;
  elements: PageElement[];
  forms: FormAnalysis[];
  navigation: NavigationElement[];
  pageType: string;
  suggestedPageObjectName: string;
}

interface FormAnalysis {
  formSelector: string;
  fields: FormField[];
  submitButton?: PageElement;
}

interface FormField {
  name: string;
  type: string;
  selector: string;
  label?: string;
  required: boolean;
  placeholder?: string;
}

interface NavigationElement {
  text: string;
  selector: string;
  href?: string;
  type: 'link' | 'button';
}

export class WebAnalysisService {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async analyzePage(url: string): Promise<PageAnalysisResult> {
    await this.initialize();
    const page = await this.browser!.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      const title = await page.title();
      const pageType = await this.detectPageType(page);
      
      const elements = await this.extractInteractiveElements(page);
      const forms = await this.analyzeForms(page);
      const navigation = await this.extractNavigationElements(page);
      
      return {
        url,
        title,
        elements,
        forms,
        navigation,
        pageType,
        suggestedPageObjectName: this.generatePageObjectName(title, pageType)
      };
    } finally {
      await page.close();
    }
  }

  private async detectPageType(page: Page): Promise<string> {
    const indicators = await page.evaluate(() => {
      const hasLoginForm = !!document.querySelector('input[type="password"]');
      const hasSearchBox = !!document.querySelector('input[type="search"], input[placeholder*="search" i]');
      const hasDashboard = !!document.querySelector('[class*="dashboard" i], [id*="dashboard" i]');
      const hasProductGrid = document.querySelectorAll('[class*="product" i], [class*="item" i], [class*="card" i]').length > 3;
      const hasCheckout = !!document.querySelector('[class*="checkout" i], [class*="cart" i]');
      const hasArticle = !!document.querySelector('article, [class*="article" i], [class*="blog" i], [class*="post" i]');
      
      return {
        hasLoginForm,
        hasSearchBox,
        hasDashboard,
        hasProductGrid,
        hasCheckout,
        hasArticle
      };
    });
    
    if (indicators.hasLoginForm) return 'login';
    if (indicators.hasCheckout) return 'checkout';
    if (indicators.hasDashboard) return 'dashboard';
    if (indicators.hasProductGrid) return 'listing';
    if (indicators.hasArticle) return 'article';
    if (indicators.hasSearchBox) return 'search';
    
    return 'generic';
  }

  private async extractInteractiveElements(page: Page): Promise<PageElement[]> {
    return await page.evaluate(() => {
      const elements: PageElement[] = [];
      
      const interactiveSelectors = [
        'button',
        'a[href]',
        'input:not([type="hidden"])',
        'textarea',
        'select',
        '[role="button"]',
        '[onclick]',
        '[type="submit"]',
        '[type="button"]'
      ];
      
      interactiveSelectors.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          
          const bestSelector = generateBestSelector(htmlEl);
          
          elements.push({
            type: el.tagName.toLowerCase(),
            selector: bestSelector,
            text: htmlEl.innerText?.trim() || htmlEl.textContent?.trim(),
            attributes: getElementAttributes(htmlEl),
            isInteractive: true,
            suggestedName: generateElementName(htmlEl)
          });
        });
      });
      
      function generateBestSelector(element: HTMLElement): string {
        if (element.id) {
          return `#${element.id}`;
        }
        
        const dataTestId = element.getAttribute('data-testid') || 
                          element.getAttribute('data-test') || 
                          element.getAttribute('data-cy');
        if (dataTestId) {
          return `[data-testid="${dataTestId}"]`;
        }
        
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          return `[aria-label="${ariaLabel}"]`;
        }
        
        const uniqueClasses = Array.from(element.classList)
          .filter(cls => document.querySelectorAll(`.${cls}`).length === 1);
        if (uniqueClasses.length > 0) {
          return `.${uniqueClasses[0]}`;
        }
        
        if (element.name) {
          return `[name="${element.name}"]`;
        }
        
        const text = element.innerText?.trim() || element.textContent?.trim();
        if (text && text.length < 30) {
          const tagName = element.tagName.toLowerCase();
          if (tagName === 'button' || tagName === 'a') {
            return `text="${text}"`;
          }
        }
        
        if (element.classList.length > 0) {
          return `.${Array.from(element.classList).join('.')}`;
        }
        
        return element.tagName.toLowerCase();
      }
      
      function getElementAttributes(element: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          attrs[attr.name] = attr.value;
        }
        return attrs;
      }
      
      function generateElementName(element: HTMLElement): string {
        const text = element.innerText?.trim() || element.textContent?.trim() || '';
        const placeholder = element.getAttribute('placeholder') || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const id = element.id || '';
        const name = element.getAttribute('name') || '';
        
        const baseText = text || placeholder || ariaLabel || id || name;
        
        return baseText
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 30) || element.tagName.toLowerCase();
      }
      
      return elements;
    });
  }

  private async analyzeForms(page: Page): Promise<FormAnalysis[]> {
    return await page.evaluate(() => {
      const forms: FormAnalysis[] = [];
      const formElements = document.querySelectorAll('form');
      
      formElements.forEach((form, index) => {
        const formSelector = form.id ? `#${form.id}` : `form:nth-of-type(${index + 1})`;
        const fields: FormField[] = [];
        
        const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea, select');
        inputs.forEach((input: Element) => {
          const htmlInput = input as HTMLInputElement;
          const label = findLabelForInput(htmlInput);
          
          fields.push({
            name: htmlInput.name || htmlInput.id || `field_${fields.length}`,
            type: htmlInput.type || 'text',
            selector: generateBestSelector(htmlInput),
            label: label?.textContent?.trim(),
            required: htmlInput.required,
            placeholder: htmlInput.placeholder
          });
        });
        
        const submitButton = form.querySelector('[type="submit"], button:not([type="button"])');
        
        forms.push({
          formSelector,
          fields,
          submitButton: submitButton ? {
            type: 'button',
            selector: generateBestSelector(submitButton as HTMLElement),
            text: (submitButton as HTMLElement).innerText?.trim(),
            attributes: {},
            isInteractive: true,
            suggestedName: 'submit_button'
          } : undefined
        });
      });
      
      function findLabelForInput(input: HTMLInputElement): HTMLLabelElement | null {
        if (input.id) {
          return document.querySelector(`label[for="${input.id}"]`);
        }
        
        let parent = input.parentElement;
        while (parent && parent !== document.body) {
          if (parent.tagName === 'LABEL') {
            return parent as HTMLLabelElement;
          }
          parent = parent.parentElement;
        }
        
        return null;
      }
      
      function generateBestSelector(element: HTMLElement): string {
        if (element.id) {
          return `#${element.id}`;
        }
        
        const dataTestId = element.getAttribute('data-testid') || 
                          element.getAttribute('data-test') || 
                          element.getAttribute('data-cy');
        if (dataTestId) {
          return `[data-testid="${dataTestId}"]`;
        }
        
        if (element.getAttribute('name')) {
          return `[name="${element.getAttribute('name')}"]`;
        }
        
        if (element.classList.length > 0) {
          return `.${Array.from(element.classList).join('.')}`;
        }
        
        return element.tagName.toLowerCase();
      }
      
      return forms;
    });
  }

  private async extractNavigationElements(page: Page): Promise<NavigationElement[]> {
    return await page.evaluate(() => {
      const navElements: NavigationElement[] = [];
      
      const navContainers = document.querySelectorAll('nav, [role="navigation"], header, .navbar, .nav, .menu');
      
      navContainers.forEach(container => {
        const links = container.querySelectorAll('a[href], button');
        
        links.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          const text = htmlEl.innerText?.trim() || htmlEl.textContent?.trim();
          
          if (text && text.length < 50) {
            navElements.push({
              text,
              selector: generateBestSelector(htmlEl),
              href: htmlEl.getAttribute('href') || undefined,
              type: htmlEl.tagName.toLowerCase() === 'a' ? 'link' : 'button'
            });
          }
        });
      });
      
      const mainLinks = document.querySelectorAll('a[href^="/"], a[href^="http"]');
      mainLinks.forEach((link: Element) => {
        const htmlLink = link as HTMLAnchorElement;
        const text = htmlLink.innerText?.trim() || htmlLink.textContent?.trim();
        
        if (text && text.length < 50 && !navElements.some(nav => nav.selector === generateBestSelector(htmlLink))) {
          navElements.push({
            text,
            selector: generateBestSelector(htmlLink),
            href: htmlLink.href,
            type: 'link'
          });
        }
      });
      
      function generateBestSelector(element: HTMLElement): string {
        if (element.id) {
          return `#${element.id}`;
        }
        
        const text = element.innerText?.trim() || element.textContent?.trim();
        if (text && text.length < 30) {
          return `text="${text}"`;
        }
        
        if (element.classList.length > 0) {
          return `.${Array.from(element.classList).join('.')}`;
        }
        
        return element.tagName.toLowerCase();
      }
      
      return navElements.slice(0, 20);
    });
  }

  generatePlaywrightCode(analysis: PageAnalysisResult, scenario: string): string {
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('${scenario}', async ({ page }) => {\n`;
    code += `  // Navigate to the page\n`;
    code += `  await page.goto('${analysis.url}');\n\n`;
    
    if (analysis.pageType === 'login' && analysis.forms.length > 0) {
      const loginForm = analysis.forms[0];
      code += `  // Fill in login form\n`;
      
      loginForm.fields.forEach(field => {
        if (field.type === 'email' || field.type === 'text' && field.name.includes('user')) {
          code += `  await page.locator('${field.selector}').fill('user@example.com');\n`;
        } else if (field.type === 'password') {
          code += `  await page.locator('${field.selector}').fill('password123');\n`;
        }
      });
      
      if (loginForm.submitButton) {
        code += `  \n  // Submit the form\n`;
        code += `  await page.locator('${loginForm.submitButton.selector}').click();\n`;
      }
    }
    
    code += `  \n  // Add your test assertions here\n`;
    code += `  await expect(page).toHaveTitle('${analysis.title}');\n`;
    code += `});\n`;
    
    return code;
  }

  generatePageObject(analysis: PageAnalysisResult): string {
    const className = this.generatePageObjectName(analysis.title, analysis.pageType);
    
    let code = `import { Page, Locator } from '@playwright/test';\n\n`;
    code += `export class ${className} {\n`;
    code += `  private page: Page;\n\n`;
    
    code += `  // Locators\n`;
    analysis.elements.slice(0, 20).forEach(element => {
      if (element.suggestedName) {
        const propertyName = this.toCamelCase(element.suggestedName);
        code += `  private ${propertyName}: Locator;\n`;
      }
    });
    
    code += `\n  constructor(page: Page) {\n`;
    code += `    this.page = page;\n`;
    
    analysis.elements.slice(0, 20).forEach(element => {
      if (element.suggestedName) {
        const propertyName = this.toCamelCase(element.suggestedName);
        code += `    this.${propertyName} = page.locator('${element.selector}');\n`;
      }
    });
    
    code += `  }\n\n`;
    
    code += `  async navigate() {\n`;
    code += `    await this.page.goto('${analysis.url}');\n`;
    code += `  }\n`;
    
    if (analysis.forms.length > 0) {
      analysis.forms.forEach((form, index) => {
        const methodName = index === 0 ? 'fillForm' : `fillForm${index + 1}`;
        code += `\n  async ${methodName}(data: any) {\n`;
        
        form.fields.forEach(field => {
          const fieldName = this.toCamelCase(field.name);
          code += `    if (data.${fieldName}) {\n`;
          code += `      await this.page.locator('${field.selector}').fill(data.${fieldName});\n`;
          code += `    }\n`;
        });
        
        if (form.submitButton) {
          code += `    await this.page.locator('${form.submitButton.selector}').click();\n`;
        }
        
        code += `  }\n`;
      });
    }
    
    code += `}\n`;
    
    return code;
  }

  private generatePageObjectName(title: string, pageType: string): string {
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return cleanTitle + 'Page' || pageType.charAt(0).toUpperCase() + pageType.slice(1) + 'Page';
  }

  private toCamelCase(str: string): string {
    return str
      .split('_')
      .map((word, index) => 
        index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const webAnalysisService = new WebAnalysisService();