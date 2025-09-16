import { Router, Request, Response } from 'express';
import { interactiveTestBuilder } from '../services/interactiveTestBuilder';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// WebSocket connections for real-time updates
const wsConnections = new Map<string, any>();

/**
 * Start a new interactive test session
 */
router.post('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { headless, slowMo, viewport } = req.body;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const session = await interactiveTestBuilder.startSession(sessionId, {
      headless: headless ?? false,
      slowMo: slowMo ?? 100,
      viewport: viewport ?? { width: 1280, height: 720 }
    });

    res.json({
      success: true,
      sessionId: session.id,
      message: 'Interactive session started'
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interactive session'
    });
  }
});

/**
 * Navigate to URL and analyze page
 */
router.post('/sessions/:sessionId/navigate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const pageObject = await interactiveTestBuilder.navigateAndAnalyze(sessionId, url);

    // Take a screenshot for debugging
    const session = interactiveTestBuilder.getSession(sessionId);
    if (session) {
      const screenshotPath = `./screenshots/session-${sessionId}-${Date.now()}.png`;
      await session.page.screenshot({ path: screenshotPath, fullPage: false });
      console.log('Screenshot saved to:', screenshotPath);
    }

    res.json({
      success: true,
      pageObject,
      message: 'Page analyzed successfully'
    });
  } catch (error) {
    console.error('Error navigating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to navigate and analyze page'
    });
  }
});

/**
 * Start recording test steps
 */
router.post('/sessions/:sessionId/record/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await interactiveTestBuilder.startRecording(sessionId);

    res.json({
      success: true,
      message: 'Recording started'
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start recording'
    });
  }
});

/**
 * Stop recording and generate test
 */
router.post('/sessions/:sessionId/record/stop', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const testCode = await interactiveTestBuilder.stopRecording(sessionId);

    res.json({
      success: true,
      testCode,
      message: 'Recording stopped and test generated'
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop recording'
    });
  }
});

/**
 * Click an element
 */
router.post('/sessions/:sessionId/actions/click', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { selector, elementName } = req.body;

    if (!selector) {
      return res.status(400).json({
        success: false,
        error: 'Selector is required'
      });
    }

    const step = await interactiveTestBuilder.clickElement(sessionId, selector, elementName);

    res.json({
      success: true,
      step,
      message: 'Element clicked'
    });
  } catch (error) {
    console.error('Error clicking element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to click element'
    });
  }
});

/**
 * Fill an element
 */
router.post('/sessions/:sessionId/actions/fill', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { selector, value, elementName } = req.body;

    if (!selector || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Selector and value are required'
      });
    }

    const step = await interactiveTestBuilder.fillElement(sessionId, selector, value, elementName);

    res.json({
      success: true,
      step,
      message: 'Element filled'
    });
  } catch (error) {
    console.error('Error filling element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fill element'
    });
  }
});

/**
 * Preview what will happen on click
 */
router.post('/sessions/:sessionId/preview/click', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { selector } = req.body;

    if (!selector) {
      return res.status(400).json({
        success: false,
        error: 'Selector is required'
      });
    }

    const preview = await interactiveTestBuilder.previewClick(sessionId, selector);

    res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error('Error previewing click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview click'
    });
  }
});

/**
 * Map a new element
 */
router.post('/sessions/:sessionId/elements/map', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { selector, name } = req.body;

    if (!selector || !name) {
      return res.status(400).json({
        success: false,
        error: 'Selector and name are required'
      });
    }

    const session = interactiveTestBuilder.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const element = await interactiveTestBuilder.mapNewElement(session, selector, name);

    res.json({
      success: true,
      element,
      message: 'Element mapped successfully'
    });
  } catch (error) {
    console.error('Error mapping element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to map element'
    });
  }
});

/**
 * Verify element stability
 */
router.post('/sessions/:sessionId/elements/:elementId/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId, elementId } = req.params;

    const isStable = await interactiveTestBuilder.verifyElementStability(sessionId, elementId);

    res.json({
      success: true,
      isStable,
      message: isStable ? 'Element is stable' : 'Element selector needs update'
    });
  } catch (error) {
    console.error('Error verifying element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify element'
    });
  }
});

/**
 * Get session details
 */
router.get('/sessions/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = interactiveTestBuilder.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        currentUrl: session.currentUrl,
        isRecording: session.isRecording,
        recordedSteps: session.recordedSteps,
        currentPageObject: session.currentPageObject,
        elementMappings: Array.from(session.elementMappings.values())
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session details'
    });
  }
});

/**
 * End session
 */
router.delete('/sessions/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await interactiveTestBuilder.endSession(sessionId);

    res.json({
      success: true,
      message: 'Session ended'
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    });
  }
});

/**
 * Get all active sessions
 */
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessions = interactiveTestBuilder.getActiveSessions();

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
});

/**
 * Get all page objects
 */
router.get('/page-objects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pageObjects = interactiveTestBuilder.getAllPageObjects();

    res.json({
      success: true,
      pageObjects
    });
  } catch (error) {
    console.error('Error getting page objects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get page objects'
    });
  }
});

// WebSocket endpoint would be implemented separately with express-ws
// For now, we'll use polling or Server-Sent Events
// This is commented out as it requires express-ws middleware setup in main app

/*
router.ws('/sessions/:sessionId/ws', (ws: any, req: Request) => {
  const { sessionId } = req.params;
  
  // Store connection
  wsConnections.set(sessionId, ws);

  // Set up event listeners
  interactiveTestBuilder.on('stepRecorded', (data) => {
    if (data.sessionId === sessionId && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stepRecorded',
        data: data.step
      }));
    }
  });

  interactiveTestBuilder.on('elementMapped', (data) => {
    if (data.sessionId === sessionId && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'elementMapped',
        data: data.element
      }));
    }
  });

  interactiveTestBuilder.on('pageAnalyzed', (data) => {
    if (data.sessionId === sessionId && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'pageAnalyzed',
        data: data.pageObject
      }));
    }
  });

  ws.on('close', () => {
    wsConnections.delete(sessionId);
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
    wsConnections.delete(sessionId);
  });
});
*/

export default router;