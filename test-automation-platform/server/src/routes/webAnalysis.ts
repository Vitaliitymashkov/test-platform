import { Router, Request, Response } from 'express';
import { webAnalysisService } from '../services/webAnalysisService';
import { authMiddleware } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { db } from '../db';

const router = Router();

router.post('/analyze',
  authMiddleware,
  [
    body('url').isURL().withMessage('Valid URL is required'),
    body('scenario').optional().isString().withMessage('Scenario must be a string')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url, scenario } = req.body;
    const userId = (req as any).user.id;

    try {
      const analysis = await webAnalysisService.analyzePage(url);
      
      const result = await db.query(
        `INSERT INTO page_analyses (user_id, url, title, page_type, analysis_data, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [userId, url, analysis.title, analysis.pageType, JSON.stringify(analysis)]
      );

      res.json({
        success: true,
        analysis,
        analysisId: result.rows[0].id
      });
    } catch (error) {
      console.error('Page analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze page',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.post('/generate-playwright',
  authMiddleware,
  [
    body('url').isURL().withMessage('Valid URL is required'),
    body('scenario').isString().withMessage('Scenario description is required')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url, scenario } = req.body;

    try {
      const analysis = await webAnalysisService.analyzePage(url);
      const playwrightCode = webAnalysisService.generatePlaywrightCode(analysis, scenario);

      res.json({
        success: true,
        code: playwrightCode,
        analysis: {
          pageType: analysis.pageType,
          elementsFound: analysis.elements.length,
          formsFound: analysis.forms.length
        }
      });
    } catch (error) {
      console.error('Playwright generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate Playwright code',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.post('/generate-page-object',
  authMiddleware,
  [
    body('url').isURL().withMessage('Valid URL is required')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url } = req.body;

    try {
      const analysis = await webAnalysisService.analyzePage(url);
      const pageObjectCode = webAnalysisService.generatePageObject(analysis);

      res.json({
        success: true,
        code: pageObjectCode,
        className: analysis.suggestedPageObjectName,
        analysis: {
          pageType: analysis.pageType,
          elementsFound: analysis.elements.length,
          formsFound: analysis.forms.length
        }
      });
    } catch (error) {
      console.error('Page object generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate page object',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.get('/analysis-history',
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      const result = await db.query(
        `SELECT id, url, title, page_type, created_at
         FROM page_analyses
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await db.query(
        `SELECT COUNT(*) FROM page_analyses WHERE user_id = $1`,
        [userId]
      );

      res.json({
        success: true,
        analyses: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      });
    } catch (error) {
      console.error('Failed to fetch analysis history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analysis history'
      });
    }
  }
);

router.get('/analysis/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const analysisId = req.params.id;

    try {
      const result = await db.query(
        `SELECT * FROM page_analyses
         WHERE id = $1 AND user_id = $2`,
        [analysisId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }

      res.json({
        success: true,
        analysis: result.rows[0]
      });
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analysis'
      });
    }
  }
);

router.post('/suggest-tests',
  authMiddleware,
  [
    body('url').isURL().withMessage('Valid URL is required')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url } = req.body;

    try {
      const analysis = await webAnalysisService.analyzePage(url);
      
      const suggestions = [];

      if (analysis.pageType === 'login') {
        suggestions.push({
          name: 'Valid login test',
          description: 'Test successful login with valid credentials',
          priority: 'high'
        });
        suggestions.push({
          name: 'Invalid login test',
          description: 'Test login failure with invalid credentials',
          priority: 'high'
        });
        suggestions.push({
          name: 'Empty fields validation',
          description: 'Test form validation for empty fields',
          priority: 'medium'
        });
      }

      if (analysis.forms.length > 0) {
        suggestions.push({
          name: 'Form submission test',
          description: 'Test form submission with valid data',
          priority: 'high'
        });
        suggestions.push({
          name: 'Form validation test',
          description: 'Test form field validation rules',
          priority: 'medium'
        });
      }

      if (analysis.navigation.length > 0) {
        suggestions.push({
          name: 'Navigation test',
          description: 'Test main navigation links functionality',
          priority: 'medium'
        });
      }

      if (analysis.pageType === 'search') {
        suggestions.push({
          name: 'Search functionality test',
          description: 'Test search with various queries',
          priority: 'high'
        });
        suggestions.push({
          name: 'Empty search test',
          description: 'Test behavior with empty search query',
          priority: 'low'
        });
      }

      if (analysis.pageType === 'listing' || analysis.pageType === 'dashboard') {
        suggestions.push({
          name: 'Data display test',
          description: 'Verify correct data is displayed',
          priority: 'high'
        });
        suggestions.push({
          name: 'Sorting and filtering test',
          description: 'Test sorting and filtering functionality',
          priority: 'medium'
        });
      }

      suggestions.push({
        name: 'Page load performance test',
        description: 'Test page load time and performance metrics',
        priority: 'low'
      });

      suggestions.push({
        name: 'Responsive design test',
        description: 'Test page display on different screen sizes',
        priority: 'medium'
      });

      res.json({
        success: true,
        suggestions,
        pageInfo: {
          type: analysis.pageType,
          title: analysis.title,
          interactiveElements: analysis.elements.length,
          forms: analysis.forms.length
        }
      });
    } catch (error) {
      console.error('Test suggestion error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suggest tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;