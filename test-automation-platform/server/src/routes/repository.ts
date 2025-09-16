import { Router, Request, Response } from 'express';
import { repoInitService } from '../services/repoInitService';
import { pageObjectService } from '../services/pageObjectService';
import * as path from 'path';

const router = Router();

/**
 * Initialize a new test repository with POM structure
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { repoPath, projectName, includeGitHubActions } = req.body;

    if (!repoPath || !projectName) {
      return res.status(400).json({
        error: 'Repository path and project name are required'
      });
    }

    // Initialize the repository
    await repoInitService.initializeTestRepo(repoPath, projectName);

    // Add GitHub Actions workflow if requested
    if (includeGitHubActions) {
      await repoInitService.addGitHubActionsWorkflow(repoPath);
    }

    res.json({
      success: true,
      message: 'Repository initialized successfully',
      structure: {
        directories: [
          'tests/',
          'pages/',
          'fixtures/',
          'utils/',
          'config/',
          'reports/',
          'screenshots/'
        ],
        files: [
          'package.json',
          'tsconfig.json',
          'playwright.config.ts',
          '.gitignore',
          '.prettierrc',
          '.eslintrc.json',
          'README.md'
        ]
      }
    });
  } catch (error) {
    console.error('Error initializing repository:', error);
    res.status(500).json({
      error: 'Failed to initialize repository',
      details: error.message
    });
  }
});

/**
 * Generate a page object from details
 */
router.post('/generate-page-object', async (req: Request, res: Response) => {
  try {
    const { details, pageName, repoPath } = req.body;

    if (!details || !pageName) {
      return res.status(400).json({
        error: 'Details and page name are required'
      });
    }

    // Generate page object
    const pageObject = await pageObjectService.generatePageObject(details, pageName);

    // Save to repository if path provided
    let savedPath = null;
    if (repoPath) {
      savedPath = await pageObjectService.savePageObject(repoPath, pageObject);
    }

    res.json({
      success: true,
      pageObject: {
        name: pageObject.name,
        type: pageObject.type,
        content: pageObject.content,
        savedPath
      }
    });
  } catch (error) {
    console.error('Error generating page object:', error);
    res.status(500).json({
      error: 'Failed to generate page object',
      details: error.message
    });
  }
});

/**
 * Get available page object templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await pageObjectService.getAvailableTemplates();
    
    res.json({
      success: true,
      templates: templates.map(t => ({
        name: t,
        type: t.includes('component:') ? 'component' : 'page'
      }))
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      details: error.message
    });
  }
});

/**
 * Get specific template content
 */
router.get('/templates/:templateName', async (req: Request, res: Response) => {
  try {
    const { templateName } = req.params;
    let content: string;

    if (templateName.startsWith('component:')) {
      const componentName = templateName.replace('component:', '');
      content = await pageObjectService.getComponentTemplate(componentName);
    } else if (templateName === 'base') {
      content = await pageObjectService.getBasePageTemplate();
    } else {
      content = await pageObjectService.getPageTemplate(templateName);
    }

    res.json({
      success: true,
      template: {
        name: templateName,
        content
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      error: 'Failed to fetch template',
      details: error.message
    });
  }
});

/**
 * Check if page object exists in repository
 */
router.post('/check-page-exists', async (req: Request, res: Response) => {
  try {
    const { repoPath, pageName } = req.body;

    if (!repoPath || !pageName) {
      return res.status(400).json({
        error: 'Repository path and page name are required'
      });
    }

    const exists = await pageObjectService.pageObjectExists(repoPath, pageName);

    res.json({
      success: true,
      exists
    });
  } catch (error) {
    console.error('Error checking page existence:', error);
    res.status(500).json({
      error: 'Failed to check page existence',
      details: error.message
    });
  }
});

export default router;