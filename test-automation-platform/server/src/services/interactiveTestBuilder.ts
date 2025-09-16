import { chromium, Browser, Page, BrowserContext, ElementHandle } from 'playwright';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getOverlayScript } from './pageOverlay';
import { getSimpleOverlayScript } from './simpleOverlay';

interface ElementMapping {
  id: string;
  name: string;
  selector: string;
  alternativeSelectors: string[];
  type: 'button' | 'input' | 'link' | 'text' | 'dropdown' | 'checkbox' | 'radio' | 'other';
  attributes: Record<string, string>;
  text?: string;
  screenshot?: string;
  lastVerified: Date;
  isStable: boolean;
}

interface PageObjectModel {
  id: string;
  name: string;
  url: string;
  urlPattern?: string;
  elements: ElementMapping[];
  lastUpdated: Date;
  version: number;
  screenshots: {
    full: string;
    thumbnail: string;
  };
}

interface TestStep {
  id: string;
  action: 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 'hover' | 'navigate' | 'wait' | 'assert';
  elementId?: string;
  elementName?: string;
  selector?: string;
  value?: any;
  assertion?: {
    type: 'visible' | 'text' | 'value' | 'count' | 'url' | 'title';
    expected: any;
  };
  screenshot?: string;
  timestamp: Date;
}

interface InteractiveSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  currentUrl: string;
  currentPageObject?: PageObjectModel;
  recordedSteps: TestStep[];
  elementMappings: Map<string, ElementMapping>;
  isRecording: boolean;
  traceFile?: string;
}

export class InteractiveTestBuilder extends EventEmitter {
  private sessions: Map<string, InteractiveSession> = new Map();
  private pageObjectRepository: Map<string, PageObjectModel> = new Map();
  private githubRepoPath?: string;

  constructor(githubRepoPath?: string) {
    super();
    this.githubRepoPath = githubRepoPath;
    this.loadPageObjectRepository();
  }

  /**
   * Start a new interactive session
   */
  async startSession(sessionId: string, options?: {
    headless?: boolean;
    slowMo?: number;
    viewport?: { width: number; height: number };
  }): Promise<InteractiveSession> {
    const browser = await chromium.launch({
      headless: false, // Always show browser for debugging
      slowMo: options?.slowMo ?? 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: false // Set to true if you want DevTools open
    });

    const context = await browser.newContext({
      viewport: options?.viewport ?? { width: 1280, height: 720 },
      recordVideo: {
        dir: './recordings',
        size: options?.viewport ?? { width: 1280, height: 720 }
      },
      // Bypass CSP to allow script injection
      bypassCSP: true
    });

    // Start tracing for later analysis
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });

    const page = await context.newPage();

    // Set up page event listeners
    this.setupPageListeners(page, sessionId);

    const session: InteractiveSession = {
      id: sessionId,
      browser,
      context,
      page,
      currentUrl: '',
      recordedSteps: [],
      elementMappings: new Map(),
      isRecording: false
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Navigate to a URL and analyze the page
   */
  async navigateAndAnalyze(sessionId: string, url: string): Promise<PageObjectModel> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    await session.page.goto(url, { waitUntil: 'networkidle' });
    session.currentUrl = url;

    // Wait a bit for page to stabilize
    await session.page.waitForTimeout(1000);

    // Inject the overlay script
    await this.injectOverlay(session.page, sessionId);

    // Check if we already have a POM for this URL
    let pom = this.findPageObjectByUrl(url);

    if (!pom) {
      // Create new POM
      pom = await this.createPageObjectModel(session.page, url);
      this.pageObjectRepository.set(pom.id, pom);
    } else {
      // Update existing POM with any new elements
      pom = await this.updatePageObjectModel(session.page, pom);
    }

    session.currentPageObject = pom;
    session.elementMappings.clear();
    pom.elements.forEach(el => session.elementMappings.set(el.id, el));

    // Emit event for UI update
    this.emit('pageAnalyzed', { sessionId, pageObject: pom });

    return pom;
  }

  /**
   * Start recording test steps
   */
  async startRecording(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.isRecording = true;
    session.recordedSteps = [];

    // Save trace file path
    const traceFile = `./traces/session-${sessionId}-${Date.now()}.zip`;
    session.traceFile = traceFile;

    this.emit('recordingStarted', { sessionId });
  }

  /**
   * Stop recording and generate test
   */
  async stopRecording(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.isRecording = false;

    // Stop tracing and save
    if (session.traceFile) {
      await session.context.tracing.stop({ path: session.traceFile });
    }

    // Generate test code
    const testCode = this.generateTestCode(session);

    this.emit('recordingStopped', { sessionId, testCode, steps: session.recordedSteps });

    return testCode;
  }

  /**
   * Manually click an element (for interactive mapping)
   */
  async clickElement(sessionId: string, selector: string, elementName?: string): Promise<TestStep> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Try to click the element
    await session.page.click(selector);

    // If element is not mapped, map it now
    let elementId = this.findElementIdBySelector(session, selector);
    if (!elementId && elementName) {
      const element = await this.mapNewElement(session, selector, elementName);
      elementId = element.id;
    }

    // Record the step
    const step: TestStep = {
      id: `step-${Date.now()}`,
      action: 'click',
      elementId,
      elementName,
      selector,
      screenshot: await this.captureScreenshot(session.page),
      timestamp: new Date()
    };

    if (session.isRecording) {
      session.recordedSteps.push(step);
    }

    this.emit('stepRecorded', { sessionId, step });
    return step;
  }

  /**
   * Fill an input element
   */
  async fillElement(sessionId: string, selector: string, value: string, elementName?: string): Promise<TestStep> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    await session.page.fill(selector, value);

    let elementId = this.findElementIdBySelector(session, selector);
    if (!elementId && elementName) {
      const element = await this.mapNewElement(session, selector, elementName);
      elementId = element.id;
    }

    const step: TestStep = {
      id: `step-${Date.now()}`,
      action: 'fill',
      elementId,
      elementName,
      selector,
      value,
      screenshot: await this.captureScreenshot(session.page),
      timestamp: new Date()
    };

    if (session.isRecording) {
      session.recordedSteps.push(step);
    }

    this.emit('stepRecorded', { sessionId, step });
    return step;
  }

  /**
   * Map a new element on the fly
   */
  async mapNewElement(session: InteractiveSession, selector: string, name: string): Promise<ElementMapping> {
    const elementHandle = await session.page.$(selector);
    if (!elementHandle) throw new Error('Element not found');

    const element = await session.page.evaluate((el) => {
      return {
        tagName: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        text: el.textContent?.trim() || '',
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {} as Record<string, string>)
      };
    }, elementHandle);

    const mapping: ElementMapping = {
      id: `element-${Date.now()}`,
      name,
      selector,
      alternativeSelectors: await this.generateAlternativeSelectors(session.page, selector),
      type: this.detectElementType(element.tagName, element.type),
      attributes: element.attributes,
      text: element.text,
      lastVerified: new Date(),
      isStable: true
    };

    // Add to session mappings
    session.elementMappings.set(mapping.id, mapping);

    // Add to current page object
    if (session.currentPageObject) {
      session.currentPageObject.elements.push(mapping);
      session.currentPageObject.lastUpdated = new Date();
      session.currentPageObject.version++;
      
      // Save to repository
      await this.savePageObjectModel(session.currentPageObject);
    }

    this.emit('elementMapped', { sessionId: session.id, element: mapping });
    return mapping;
  }

  /**
   * Get live preview of what will happen on click
   */
  async previewClick(sessionId: string, selector: string): Promise<{
    willNavigate: boolean;
    targetUrl?: string;
    willOpenModal?: boolean;
    willSubmitForm?: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const preview = await session.page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (!element) return null;

      const isLink = element.tagName === 'A';
      const hasHref = element.getAttribute('href');
      const isSubmit = element.getAttribute('type') === 'submit';
      const isInForm = element.closest('form') !== null;
      const hasModalTrigger = element.getAttribute('data-toggle') === 'modal' ||
                             element.getAttribute('data-bs-toggle') === 'modal';

      return {
        willNavigate: isLink && !!hasHref,
        targetUrl: hasHref || undefined,
        willOpenModal: hasModalTrigger,
        willSubmitForm: isSubmit || (element.tagName === 'BUTTON' && isInForm)
      };
    }, selector);

    return preview || { willNavigate: false };
  }

  /**
   * Verify element stability (check if selector still works)
   */
  async verifyElementStability(sessionId: string, elementId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const element = session.elementMappings.get(elementId);
    if (!element) return false;

    try {
      // Try primary selector
      const exists = await session.page.$(element.selector) !== null;
      if (exists) return true;

      // Try alternative selectors
      for (const altSelector of element.alternativeSelectors) {
        const altExists = await session.page.$(altSelector) !== null;
        if (altExists) {
          // Update primary selector to working alternative
          element.selector = altSelector;
          element.lastVerified = new Date();
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate Playwright test code from recorded steps
   */
  private generateTestCode(session: InteractiveSession): string {
    const steps = session.recordedSteps;
    const pom = session.currentPageObject;

    let code = `import { test, expect } from '@playwright/test';\n`;
    
    if (pom) {
      code += `import { ${pom.name} } from './pages/${this.toFileName(pom.name)}';\n\n`;
    }

    code += `test('${this.generateTestName(steps)}', async ({ page }) => {\n`;

    if (pom) {
      code += `  const ${this.toCamelCase(pom.name)} = new ${pom.name}(page);\n`;
      code += `  await ${this.toCamelCase(pom.name)}.navigate();\n\n`;
    }

    for (const step of steps) {
      code += this.generateStepCode(step, pom) + '\n';
    }

    code += `});\n`;

    return code;
  }

  /**
   * Generate code for a single step
   */
  private generateStepCode(step: TestStep, pom?: PageObjectModel): string {
    const elementName = step.elementName || 'element';
    const selector = step.selector || '';

    switch (step.action) {
      case 'click':
        if (pom && step.elementId) {
          return `  await ${this.toCamelCase(pom.name)}.click${this.toPascalCase(elementName)}();`;
        }
        return `  await page.click('${selector}');`;

      case 'fill':
        if (pom && step.elementId) {
          return `  await ${this.toCamelCase(pom.name)}.fill${this.toPascalCase(elementName)}('${step.value}');`;
        }
        return `  await page.fill('${selector}', '${step.value}');`;

      case 'navigate':
        return `  await page.goto('${step.value}');`;

      case 'assert':
        if (step.assertion) {
          switch (step.assertion.type) {
            case 'visible':
              return `  await expect(page.locator('${selector}')).toBeVisible();`;
            case 'text':
              return `  await expect(page.locator('${selector}')).toHaveText('${step.assertion.expected}');`;
            case 'url':
              return `  await expect(page).toHaveURL('${step.assertion.expected}');`;
            default:
              return `  // Assert: ${step.assertion.type}`;
          }
        }
        return `  // Assertion`;

      default:
        return `  // ${step.action}: ${selector}`;
    }
  }

  /**
   * Create a new Page Object Model from current page
   */
  private async createPageObjectModel(page: Page, url: string): Promise<PageObjectModel> {
    const title = await page.title();
    const elements = await this.extractAllElements(page);

    const pom: PageObjectModel = {
      id: `pom-${Date.now()}`,
      name: this.generatePageName(title, url),
      url,
      urlPattern: this.generateUrlPattern(url),
      elements,
      lastUpdated: new Date(),
      version: 1,
      screenshots: {
        full: await this.captureScreenshot(page, 'fullPage'),
        thumbnail: await this.captureScreenshot(page, 'viewport')
      }
    };

    return pom;
  }

  /**
   * Extract all interactive elements from page
   */
  private async extractAllElements(page: Page): Promise<ElementMapping[]> {
    return await page.evaluate(() => {
      const elements: any[] = [];
      const processed = new Set<Element>();

      // Helper functions defined at the top level
      function generateBestSelector(el: HTMLElement): string {
        if (el.id) return `#${el.id}`;
        
        const dataTestId = el.getAttribute('data-testid') || 
                          el.getAttribute('data-test') || 
                          el.getAttribute('data-cy');
        if (dataTestId) return `[data-testid="${dataTestId}"]`;
        
        if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
        
        const text = el.textContent?.trim();
        if (text && text.length < 30 && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
          return `text="${text}"`;
        }
        
        return el.tagName.toLowerCase();
      }

      function detectType(el: HTMLElement): string {
        const tag = el.tagName.toLowerCase();
        const type = el.getAttribute('type');
        
        if (tag === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (tag === 'input') {
          if (type === 'text' || type === 'email' || type === 'password') return 'input';
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
        }
        if (tag === 'select') return 'dropdown';
        if (tag === 'textarea') return 'input';
        
        return 'other';
      }

      function getAttributes(el: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        Array.from(el.attributes).forEach(attr => {
          attrs[attr.name] = attr.value;
        });
        return attrs;
      }

      // Find all interactive elements
      const selectors = [
        'button', 'a[href]', 'input:not([type="hidden"])', 
        'textarea', 'select', '[role="button"]', '[onclick]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((el) => {
          if (processed.has(el)) return;
          processed.add(el);

          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          
          // Only include visible elements
          if (rect.width === 0 || rect.height === 0) return;
          if (htmlEl.style.display === 'none' || htmlEl.style.visibility === 'hidden') return;

          elements.push({
            selector: generateBestSelector(htmlEl),
            type: detectType(htmlEl),
            text: htmlEl.textContent?.trim() || '',
            attributes: getAttributes(htmlEl)
          });
        });
      });

      return elements;
    }).then(rawElements => {
      // Convert to ElementMapping format
      return rawElements.map((el, index) => ({
        id: `element-${Date.now()}-${index}`,
        name: this.generateElementName(el.text, el.type),
        selector: el.selector,
        alternativeSelectors: [],
        type: el.type,
        attributes: el.attributes,
        text: el.text,
        lastVerified: new Date(),
        isStable: true
      }));
    });
  }

  /**
   * Generate alternative selectors for element
   */
  private async generateAlternativeSelectors(page: Page, primarySelector: string): Promise<string[]> {
    return await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [];

      const alternatives: string[] = [];
      const htmlEl = element as HTMLElement;

      // By text content
      const text = htmlEl.textContent?.trim();
      if (text && text.length < 30) {
        alternatives.push(`text="${text}"`);
      }

      // By aria-label
      const ariaLabel = htmlEl.getAttribute('aria-label');
      if (ariaLabel) {
        alternatives.push(`[aria-label="${ariaLabel}"]`);
      }

      // By class (if unique)
      if (htmlEl.classList.length > 0) {
        const classes = Array.from(htmlEl.classList);
        classes.forEach(cls => {
          if (document.querySelectorAll(`.${cls}`).length === 1) {
            alternatives.push(`.${cls}`);
          }
        });
      }

      // By role
      const role = htmlEl.getAttribute('role');
      if (role) {
        alternatives.push(`[role="${role}"]`);
      }

      return alternatives.slice(0, 3); // Keep top 3 alternatives
    }, primarySelector);
  }

  /**
   * Inject overlay script into the page
   */
  private async injectOverlay(page: Page, sessionId: string): Promise<void> {
    try {
      console.log('Injecting overlay for session:', sessionId);
      
      // First expose the function before injecting script
      await page.exposeFunction('__sendToBackend', async (message: any) => {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        switch (message.type) {
          case 'ta-element-mapped':
            const element = await this.mapNewElement(
              session,
              message.data.selector,
              message.data.name
            );
            this.emit('elementMapped', { sessionId, element });
            break;

          case 'ta-action-recorded':
            if (session.isRecording) {
              const step: TestStep = {
                id: `step-${Date.now()}`,
                action: message.data.action,
                selector: message.data.selector,
                timestamp: new Date()
              };
              session.recordedSteps.push(step);
              this.emit('stepRecorded', { sessionId, step });
            }
            break;

          case 'ta-recording-started':
            session.isRecording = true;
            break;

          case 'ta-recording-stopped':
            session.isRecording = false;
            break;
        }
      });

      // Override postMessage to capture messages
      await page.evaluate(() => {
        const originalPostMessage = window.postMessage;
        window.postMessage = function(message, targetOrigin) {
          if (message.type && message.type.startsWith('ta-')) {
            (window as any).__sendToBackend(message);
          }
          return originalPostMessage.call(window, message, targetOrigin);
        };
      });

      // Try simple overlay with direct evaluation
      console.log('Injecting simple overlay...');
      const simpleScript = getSimpleOverlayScript();
      
      // Method 1: Direct evaluation
      const injected = await page.evaluate(() => {
        // Check if already injected
        if ((window as any).__testAutomationSimple) {
          return 'Already exists';
        }
        
        // Create overlay directly
        const style = document.createElement('style');
        style.innerHTML = `
          #test-overlay-box {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            width: 280px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            padding: 20px !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            z-index: 2147483647 !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            font-size: 14px !important;
          }
          
          #test-overlay-box h3 {
            margin: 0 0 15px 0 !important;
            font-size: 18px !important;
            font-weight: 600 !important;
          }
          
          #test-overlay-box button {
            background: rgba(255,255,255,0.9) !important;
            color: #667eea !important;
            border: none !important;
            padding: 8px 16px !important;
            margin: 4px !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            transition: all 0.2s !important;
          }
          
          #test-overlay-box button:hover {
            background: white !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          }
          
          .test-highlight {
            outline: 3px solid #3b82f6 !important;
            outline-offset: 2px !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
            transition: all 0.2s !important;
          }
        `;
        document.head.appendChild(style);
        
        const overlay = document.createElement('div');
        overlay.id = 'test-overlay-box';
        overlay.innerHTML = `
          <h3>🎯 Test Automation</h3>
          <div style="margin-bottom: 10px; opacity: 0.9;">Page is ready for testing!</div>
          <div>
            <button id="test-inspect-btn">🔍 Inspect</button>
            <button id="test-select-btn">👆 Select</button>
            <button id="test-record-btn">⏺️ Record</button>
          </div>
          <div id="test-status" style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 6px; min-height: 20px;">
            Ready to start...
          </div>
        `;
        document.body.appendChild(overlay);
        
        // Add interactivity
        let inspecting = false;
        let selecting = false;
        let recording = false;
        let currentHighlight = null;
        let selectedElement = null;
        let mappedElements = [];
        
        // Helper function to get best selector
        function getBestSelector(element) {
          if (element.id) return '#' + element.id;
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c && !c.includes('test-highlight'));
            if (classes.length > 0) return '.' + classes[0];
          }
          if (element.tagName) return element.tagName.toLowerCase();
          return 'unknown';
        }
        
        // Inspect button
        document.getElementById('test-inspect-btn')?.addEventListener('click', () => {
          inspecting = !inspecting;
          selecting = false; // Turn off selecting when inspecting
          const status = document.getElementById('test-status');
          const btn = document.getElementById('test-inspect-btn');
          if (status && btn) {
            if (inspecting) {
              status.innerHTML = '🔍 <strong>Hover over elements to see their selectors</strong>';
              btn.style.background = '#10b981';
              btn.style.color = 'white';
            } else {
              status.textContent = 'Inspection stopped';
              btn.style.background = 'rgba(255,255,255,0.9)';
              btn.style.color = '#667eea';
            }
          }
        });
        
        // Select button  
        document.getElementById('test-select-btn')?.addEventListener('click', () => {
          selecting = !selecting;
          inspecting = false; // Turn off inspecting when selecting
          const status = document.getElementById('test-status');
          const btn = document.getElementById('test-select-btn');
          if (status && btn) {
            if (selecting) {
              status.innerHTML = '👆 <strong>Click on an element to map it</strong>';
              btn.style.background = '#f59e0b';
              btn.style.color = 'white';
            } else {
              status.textContent = 'Selection mode stopped';
              btn.style.background = 'rgba(255,255,255,0.9)';
              btn.style.color = '#667eea';
            }
          }
        });
        
        // Record button
        document.getElementById('test-record-btn')?.addEventListener('click', () => {
          recording = !recording;
          const btn = document.getElementById('test-record-btn');
          const status = document.getElementById('test-status');
          if (btn && status) {
            if (recording) {
              btn.textContent = '⏹️ Stop';
              btn.style.background = '#ef4444';
              btn.style.color = 'white';
              status.innerHTML = '🔴 <strong>Recording your actions...</strong>';
            } else {
              btn.textContent = '⏺️ Record';
              btn.style.background = 'rgba(255,255,255,0.9)';
              btn.style.color = '#667eea';
              status.textContent = 'Recording stopped';
            }
          }
        });
        
        // Hover effect with selector display
        document.addEventListener('mouseover', (e) => {
          if (!inspecting) return;
          const target = e.target as HTMLElement;
          if (target.id === 'test-overlay-box' || target.closest('#test-overlay-box')) return;
          
          if (currentHighlight && currentHighlight !== target) {
            currentHighlight.classList.remove('test-highlight');
          }
          
          target.classList.add('test-highlight');
          currentHighlight = target;
          
          // Show selector in status
          const selector = getBestSelector(target);
          const status = document.getElementById('test-status');
          if (status) {
            const tagName = target.tagName.toLowerCase();
            const text = target.textContent?.trim().substring(0, 30) || '';
            status.innerHTML = `
              <div style="font-size: 12px;">
                <div><strong>Selector:</strong> <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 3px;">${selector}</code></div>
                <div style="margin-top: 4px;"><strong>Element:</strong> ${tagName} ${text ? '- "' + text + '..."' : ''}</div>
              </div>
            `;
          }
        });
        
        document.addEventListener('mouseout', (e) => {
          if (!inspecting) return;
          const target = e.target as HTMLElement;
          if (target.id === 'test-overlay-box' || target.closest('#test-overlay-box')) return;
          target.classList.remove('test-highlight');
        });
        
        // Click handler for selection
        document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          
          // Ignore clicks on overlay
          if (target.id === 'test-overlay-box' || target.closest('#test-overlay-box')) return;
          
          if (selecting) {
            e.preventDefault();
            e.stopPropagation();
            
            // Highlight selected element
            if (selectedElement) {
              selectedElement.style.outline = '';
            }
            target.style.outline = '3px solid #10b981';
            target.style.outlineOffset = '2px';
            selectedElement = target;
            
            const selector = getBestSelector(target);
            const status = document.getElementById('test-status');
            
            if (status) {
              status.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px;">
                  <div style="font-weight: bold; margin-bottom: 8px;">✅ Element Selected!</div>
                  <div style="font-size: 12px; margin-bottom: 8px;">
                    <code style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 3px;">${selector}</code>
                  </div>
                  <input 
                    type="text" 
                    id="element-name-input" 
                    placeholder="Enter element name (e.g., loginButton)" 
                    style="width: 100%; padding: 6px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: rgba(255,255,255,0.9); color: #333; font-size: 13px;"
                  />
                  <button 
                    onclick="window.saveElement()" 
                    style="margin-top: 8px; background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; width: 100%;"
                  >
                    💾 Save Element
                  </button>
                </div>
              `;
              
              // Focus on input
              setTimeout(() => {
                const input = document.getElementById('element-name-input');
                if (input) input.focus();
              }, 100);
            }
            
            // Save element function
            (window as any).saveElement = () => {
              const input = document.getElementById('element-name-input') as HTMLInputElement;
              if (input && input.value) {
                const elementData = {
                  name: input.value,
                  selector: selector,
                  tagName: target.tagName.toLowerCase(),
                  text: target.textContent?.trim().substring(0, 50)
                };
                
                mappedElements.push(elementData);
                
                // Send to backend
                if ((window as any).__sendToBackend) {
                  (window as any).__sendToBackend({
                    type: 'ta-element-mapped',
                    data: elementData
                  });
                }
                
                // Update status
                const status = document.getElementById('test-status');
                if (status) {
                  status.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 8px; border-radius: 6px;">
                      ✅ <strong>${input.value}</strong> saved!
                      <div style="font-size: 11px; margin-top: 4px;">Total mapped: ${mappedElements.length} elements</div>
                    </div>
                  `;
                }
                
                // Reset selection
                selecting = false;
                if (selectedElement) {
                  selectedElement.style.outline = '';
                  selectedElement = null;
                }
                
                // Reset button
                const btn = document.getElementById('test-select-btn');
                if (btn) {
                  btn.style.background = 'rgba(255,255,255,0.9)';
                  btn.style.color = '#667eea';
                }
              }
            };
            
            return false;
          }
          
          // Record clicks if recording
          if (recording) {
            const selector = getBestSelector(target);
            console.log('Recorded click on:', selector);
            
            // Send to backend
            if ((window as any).__sendToBackend) {
              (window as any).__sendToBackend({
                type: 'ta-action-recorded',
                data: {
                  action: 'click',
                  selector: selector,
                  timestamp: Date.now()
                }
              });
            }
          }
        }, true);
        
        (window as any).__testAutomationSimple = true;
        return 'Injected successfully';
      });
      
      console.log('Overlay injection result:', injected);
      
      // Verify overlay exists
      const overlayExists = await page.evaluate(() => {
        const overlay = document.getElementById('test-overlay-box');
        return {
          exists: !!overlay,
          visible: overlay ? window.getComputedStyle(overlay).display !== 'none' : false,
          position: overlay ? overlay.getBoundingClientRect() : null
        };
      });
      
      console.log('Overlay verification:', overlayExists);

    } catch (error) {
      console.error('Failed to inject overlay:', error);
      throw error;
    }
  }

  /**
   * Setup page event listeners for automatic recording
   */
  private setupPageListeners(page: Page, sessionId: string): void {
    page.on('framenavigated', async () => {
      const session = this.sessions.get(sessionId);
      if (session && session.isRecording) {
        const step: TestStep = {
          id: `step-${Date.now()}`,
          action: 'navigate',
          value: page.url(),
          timestamp: new Date()
        };
        session.recordedSteps.push(step);
        this.emit('stepRecorded', { sessionId, step });
      }
    });
  }

  /**
   * Save Page Object Model to GitHub repository
   */
  private async savePageObjectModel(pom: PageObjectModel): Promise<void> {
    if (!this.githubRepoPath) return;

    const pomDir = path.join(this.githubRepoPath, 'page-objects');
    await fs.mkdir(pomDir, { recursive: true });

    const fileName = `${this.toFileName(pom.name)}.json`;
    const filePath = path.join(pomDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(pom, null, 2));

    // Also generate TypeScript POM file
    const tsCode = this.generatePageObjectClass(pom);
    const tsFilePath = path.join(pomDir, `${this.toFileName(pom.name)}.ts`);
    await fs.writeFile(tsFilePath, tsCode);
  }

  /**
   * Generate TypeScript Page Object class
   */
  private generatePageObjectClass(pom: PageObjectModel): string {
    let code = `import { Page, Locator } from '@playwright/test';\n\n`;
    code += `export class ${pom.name} {\n`;
    code += `  private page: Page;\n\n`;

    // Add locators
    code += `  // Locators\n`;
    pom.elements.forEach(element => {
      const propName = this.toCamelCase(element.name);
      code += `  private ${propName}: Locator;\n`;
    });

    // Constructor
    code += `\n  constructor(page: Page) {\n`;
    code += `    this.page = page;\n\n`;
    pom.elements.forEach(element => {
      const propName = this.toCamelCase(element.name);
      code += `    this.${propName} = page.locator('${element.selector}');\n`;
    });
    code += `  }\n\n`;

    // Navigate method
    code += `  async navigate(): Promise<void> {\n`;
    code += `    await this.page.goto('${pom.url}');\n`;
    code += `  }\n\n`;

    // Action methods for each element
    pom.elements.forEach(element => {
      const methodName = this.toCamelCase(element.name);
      
      if (element.type === 'button' || element.type === 'link') {
        code += `  async click${this.toPascalCase(element.name)}(): Promise<void> {\n`;
        code += `    await this.${methodName}.click();\n`;
        code += `  }\n\n`;
      }

      if (element.type === 'input') {
        code += `  async fill${this.toPascalCase(element.name)}(value: string): Promise<void> {\n`;
        code += `    await this.${methodName}.fill(value);\n`;
        code += `  }\n\n`;

        code += `  async get${this.toPascalCase(element.name)}Value(): Promise<string> {\n`;
        code += `    return await this.${methodName}.inputValue();\n`;
        code += `  }\n\n`;
      }

      if (element.type === 'dropdown') {
        code += `  async select${this.toPascalCase(element.name)}(value: string): Promise<void> {\n`;
        code += `    await this.${methodName}.selectOption(value);\n`;
        code += `  }\n\n`;
      }

      if (element.type === 'checkbox' || element.type === 'radio') {
        code += `  async check${this.toPascalCase(element.name)}(): Promise<void> {\n`;
        code += `    await this.${methodName}.check();\n`;
        code += `  }\n\n`;

        code += `  async uncheck${this.toPascalCase(element.name)}(): Promise<void> {\n`;
        code += `    await this.${methodName}.uncheck();\n`;
        code += `  }\n\n`;
      }
    });

    // Assertion methods
    code += `  // Assertions\n`;
    code += `  async isLoaded(): Promise<boolean> {\n`;
    code += `    return await this.page.url().includes('${new URL(pom.url).pathname}');\n`;
    code += `  }\n`;

    code += `}\n`;

    return code;
  }

  /**
   * Load Page Object Repository from storage
   */
  private async loadPageObjectRepository(): Promise<void> {
    if (!this.githubRepoPath) return;

    const pomDir = path.join(this.githubRepoPath, 'page-objects');
    
    try {
      const files = await fs.readdir(pomDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(pomDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const pom = JSON.parse(content) as PageObjectModel;
          this.pageObjectRepository.set(pom.id, pom);
        }
      }
    } catch (error) {
      // Directory might not exist yet
      console.log('Page object repository not found, starting fresh');
    }
  }

  /**
   * Find Page Object by URL
   */
  private findPageObjectByUrl(url: string): PageObjectModel | undefined {
    for (const pom of this.pageObjectRepository.values()) {
      if (pom.url === url || (pom.urlPattern && new RegExp(pom.urlPattern).test(url))) {
        return pom;
      }
    }
    return undefined;
  }

  /**
   * Update existing Page Object Model with new elements
   */
  private async updatePageObjectModel(page: Page, existing: PageObjectModel): Promise<PageObjectModel> {
    const currentElements = await this.extractAllElements(page);
    
    // Merge with existing elements, updating verified status
    const mergedElements = new Map<string, ElementMapping>();
    
    // Add existing elements
    existing.elements.forEach(el => mergedElements.set(el.selector, el));
    
    // Add/update with current elements
    currentElements.forEach(el => {
      const existing = mergedElements.get(el.selector);
      if (existing) {
        existing.lastVerified = new Date();
        existing.isStable = true;
      } else {
        mergedElements.set(el.selector, el);
      }
    });

    existing.elements = Array.from(mergedElements.values());
    existing.lastUpdated = new Date();
    existing.version++;

    await this.savePageObjectModel(existing);
    return existing;
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(page: Page, type: 'viewport' | 'fullPage' = 'viewport'): Promise<string> {
    const screenshotDir = './screenshots';
    await fs.mkdir(screenshotDir, { recursive: true });

    const fileName = `screenshot-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);

    await page.screenshot({
      path: filePath,
      fullPage: type === 'fullPage'
    });

    return filePath;
  }

  /**
   * Helper: Find element ID by selector
   */
  private findElementIdBySelector(session: InteractiveSession, selector: string): string | undefined {
    for (const [id, element] of session.elementMappings) {
      if (element.selector === selector || element.alternativeSelectors.includes(selector)) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Helper: Detect element type
   */
  private detectElementType(tagName: string, type: string): ElementMapping['type'] {
    if (tagName === 'button') return 'button';
    if (tagName === 'a') return 'link';
    if (tagName === 'select') return 'dropdown';
    if (tagName === 'textarea') return 'input';
    if (tagName === 'input') {
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (['text', 'email', 'password', 'number', 'tel', 'url'].includes(type)) return 'input';
    }
    return 'other';
  }

  /**
   * Helper: Generate element name
   */
  private generateElementName(text: string, type: string): string {
    const baseText = text.substring(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return baseText || `${type}_element`;
  }

  /**
   * Helper: Generate page name
   */
  private generatePageName(title: string, url: string): string {
    const urlPath = new URL(url).pathname;
    const pathName = urlPath.split('/').filter(Boolean).pop() || 'home';
    
    return pathName.charAt(0).toUpperCase() + pathName.slice(1) + 'Page';
  }

  /**
   * Helper: Generate URL pattern
   */
  private generateUrlPattern(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/\/\d+/g, '/\\d+');
  }

  /**
   * Helper: Generate test name
   */
  private generateTestName(steps: TestStep[]): string {
    const actions = steps.map(s => s.action).slice(0, 3);
    return `Test with ${actions.join(', ')}`;
  }

  /**
   * Helper: Convert to camelCase
   */
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/Page$/, '');
  }

  /**
   * Helper: Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Helper: Convert to file name
   */
  private toFileName(className: string): string {
    return className
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/page$/, '.page');
  }

  /**
   * Clean up session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.traceFile) {
      await session.context.tracing.stop({ path: session.traceFile });
    }

    await session.page.close();
    await session.context.close();
    await session.browser.close();

    this.sessions.delete(sessionId);
    this.emit('sessionEnded', { sessionId });
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get session details
   */
  getSession(sessionId: string): InteractiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all Page Object Models
   */
  getAllPageObjects(): PageObjectModel[] {
    return Array.from(this.pageObjectRepository.values());
  }
}

// Export singleton instance
export const interactiveTestBuilder = new InteractiveTestBuilder();