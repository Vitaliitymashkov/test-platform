import * as fs from 'fs/promises';
import * as path from 'path';

interface PageObjectTemplate {
  name: string;
  type: 'page' | 'component';
  baseClass: string;
  imports: string[];
  content: string;
}

/**
 * Service for managing page object generation and templates
 */
export class PageObjectService {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '../templates/page-objects');
  }

  /**
   * Get base page template
   */
  async getBasePageTemplate(): Promise<string> {
    const templatePath = path.join(this.templatesDir, 'base.page.template.ts');
    return await fs.readFile(templatePath, 'utf-8');
  }

  /**
   * Get specific page template
   */
  async getPageTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.page.template.ts`);
    return await fs.readFile(templatePath, 'utf-8');
  }

  /**
   * Get component template
   */
  async getComponentTemplate(componentName: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, 'components', `${componentName}.component.template.ts`);
    return await fs.readFile(templatePath, 'utf-8');
  }

  /**
   * Generate page object from natural language description
   */
  async generatePageObject(details: string, pageName: string): Promise<PageObjectTemplate> {
    const lowerDesc = details.toLowerCase();
    
    // Determine page type based on description
    if (lowerDesc.includes('login') || lowerDesc.includes('sign in')) {
      const template = await this.getPageTemplate('login');
      return {
        name: pageName || 'LoginPage',
        type: 'page',
        baseClass: 'BasePage',
        imports: ["import { Page, Locator } from '@playwright/test';", "import { BasePage } from './base.page';"],
        content: this.customizeTemplate(template, pageName || 'LoginPage')
      };
    }
    
    if (lowerDesc.includes('form') || lowerDesc.includes('submit')) {
      const template = await this.getPageTemplate('form');
      return {
        name: pageName || 'FormPage',
        type: 'page',
        baseClass: 'BasePage',
        imports: ["import { Page, Locator } from '@playwright/test';", "import { BasePage } from './base.page';"],
        content: this.customizeTemplate(template, pageName || 'FormPage')
      };
    }
    
    if (lowerDesc.includes('list') || lowerDesc.includes('table') || lowerDesc.includes('grid')) {
      const template = await this.getPageTemplate('list');
      return {
        name: pageName || 'ListPage',
        type: 'page',
        baseClass: 'BasePage',
        imports: ["import { Page, Locator } from '@playwright/test';", "import { BasePage } from './base.page';"],
        content: this.customizeTemplate(template, pageName || 'ListPage')
      };
    }
    
    // Default to generic page object
    return this.generateGenericPageObject(pageName, details);
  }

  /**
   * Generate generic page object
   */
  private generateGenericPageObject(pageName: string, details: string): PageObjectTemplate {
    const className = pageName.endsWith('Page') ? pageName : `${pageName}Page`;
    
    const content = `import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ${className}
 * ${details}
 */
export class ${className} extends BasePage {
  // Add your locators here
  private readonly pageTitle: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.pageTitle = page.locator('[data-testid="page-title"]');
  }
  
  /**
   * Navigate to this page
   */
  async navigateToPage(): Promise<void> {
    await this.goto('/'); // Update with actual URL
    await this.waitForPageLoad();
  }
  
  /**
   * Check if page is displayed
   */
  async isPageDisplayed(): Promise<boolean> {
    return await this.pageTitle.isVisible();
  }
  
  /**
   * Get page title text
   */
  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }
  
  // Add more methods as needed
}`;

    return {
      name: className,
      type: 'page',
      baseClass: 'BasePage',
      imports: ["import { Page, Locator } from '@playwright/test';", "import { BasePage } from './base.page';"],
      content
    };
  }

  /**
   * Customize template with specific page name
   */
  private customizeTemplate(template: string, className: string): string {
    // Replace generic class names with specific ones
    const genericPattern = /export class \w+Page/g;
    return template.replace(genericPattern, `export class ${className}`);
  }

  /**
   * Check if page object already exists
   */
  async pageObjectExists(repoPath: string, pageName: string): Promise<boolean> {
    const pagePath = path.join(repoPath, 'pages', `${this.toFileName(pageName)}.ts`);
    try {
      await fs.access(pagePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save page object to repository
   */
  async savePageObject(repoPath: string, pageObject: PageObjectTemplate): Promise<string> {
    const fileName = this.toFileName(pageObject.name);
    const filePath = path.join(repoPath, 'pages', `${fileName}.ts`);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, pageObject.content, 'utf-8');
    
    return filePath;
  }

  /**
   * Convert class name to file name
   */
  private toFileName(className: string): string {
    // Convert PascalCase to kebab-case
    return className
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/page$/, '.page');
  }

  /**
   * Extract page objects from generated code
   */
  extractPageObjectsFromCode(code: string): PageObjectTemplate[] {
    const pageObjects: PageObjectTemplate[] = [];
    
    // Simple regex to find class definitions
    const classRegex = /export class (\w+Page) extends (\w+)/g;
    let match;
    
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      const baseClass = match[2];
      
      // Extract the class body
      const classStart = code.indexOf(`export class ${className}`);
      let braceCount = 0;
      let classEnd = classStart;
      let foundStart = false;
      
      for (let i = classStart; i < code.length; i++) {
        if (code[i] === '{') {
          braceCount++;
          foundStart = true;
        } else if (code[i] === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            classEnd = i + 1;
            break;
          }
        }
      }
      
      const classContent = code.substring(classStart, classEnd);
      
      pageObjects.push({
        name: className,
        type: 'page',
        baseClass,
        imports: this.extractImports(code),
        content: classContent
      });
    }
    
    return pageObjects;
  }

  /**
   * Extract imports from code
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /import .+ from .+;/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[0]);
    }
    
    return imports;
  }

  /**
   * Get all available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    const templates: string[] = [];
    
    // Read page templates
    const pageFiles = await fs.readdir(this.templatesDir);
    for (const file of pageFiles) {
      if (file.endsWith('.page.template.ts')) {
        templates.push(file.replace('.page.template.ts', ''));
      }
    }
    
    // Read component templates
    const componentsDir = path.join(this.templatesDir, 'components');
    try {
      const componentFiles = await fs.readdir(componentsDir);
      for (const file of componentFiles) {
        if (file.endsWith('.component.template.ts')) {
          templates.push(`component:${file.replace('.component.template.ts', '')}`);
        }
      }
    } catch {
      // Components directory might not exist
    }
    
    return templates;
  }
}

// Export singleton instance
export const pageObjectService = new PageObjectService();