import { Router } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middleware/auth';
import { convertNaturalLanguageToPlaywright } from '../services/nlpService';
import { createOrUpdateTestFile } from '../services/githubService';

const router = Router();

// Get all test cases for a user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT tc.*, f.name as feature_name 
       FROM test_cases tc
       LEFT JOIN features f ON tc.feature_id = f.id
       WHERE tc.user_id = $1
       ORDER BY tc.created_at DESC`,
      [req.user!.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

// Get a single test case
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT tc.*, f.name as feature_name 
       FROM test_cases tc
       LEFT JOIN features f ON tc.feature_id = f.id
       WHERE tc.id = $1 AND tc.user_id = $2`,
      [req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching test case:', error);
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
});

// Create a new test case
router.post('/', async (req: AuthRequest, res) => {
  const { title, description, naturalLanguage, featureId } = req.body;
  
  if (!title || !naturalLanguage || !featureId) {
    return res.status(400).json({ error: 'Title, natural language, and feature ID are required' });
  }

  try {
    // Convert natural language to Playwright code
    const playwrightCode = await convertNaturalLanguageToPlaywright(naturalLanguage);
    
    // Insert test case into database
    const result = await pool.query(
      `INSERT INTO test_cases (feature_id, title, description, natural_language, playwright_code, user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [featureId, title, description, naturalLanguage, playwrightCode, req.user!.id]
    );
    
    const testCase = result.rows[0];
    
    // Create file in GitHub repository
    const githubResult = await createOrUpdateTestFile(
      req.user!.id,
      featureId,
      testCase.id,
      title,
      playwrightCode
    );
    
    // Update test case with file path and GitHub URL
    await pool.query(
      `UPDATE test_cases 
       SET file_path = $1, github_url = $2, status = 'published'
       WHERE id = $3`,
      [githubResult.filePath, githubResult.githubUrl, testCase.id]
    );
    
    res.status(201).json({
      ...testCase,
      file_path: githubResult.filePath,
      github_url: githubResult.githubUrl,
      status: 'published'
    });
  } catch (error) {
    console.error('Error creating test case:', error);
    res.status(500).json({ error: 'Failed to create test case' });
  }
});

// Update a test case
router.put('/:id', async (req: AuthRequest, res) => {
  const { title, description, naturalLanguage } = req.body;
  
  try {
    // Check if test case exists and belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM test_cases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    const testCase = checkResult.rows[0];
    
    // Convert natural language to Playwright code if changed
    let playwrightCode = testCase.playwright_code;
    if (naturalLanguage && naturalLanguage !== testCase.natural_language) {
      playwrightCode = await convertNaturalLanguageToPlaywright(naturalLanguage);
    }
    
    // Update test case
    const result = await pool.query(
      `UPDATE test_cases 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           natural_language = COALESCE($3, natural_language),
           playwright_code = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, description, naturalLanguage, playwrightCode, req.params.id, req.user!.id]
    );
    
    // Update file in GitHub if code changed
    if (playwrightCode !== testCase.playwright_code) {
      await createOrUpdateTestFile(
        req.user!.id,
        testCase.feature_id,
        testCase.id,
        title || testCase.title,
        playwrightCode
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(500).json({ error: 'Failed to update test case' });
  }
});

// Delete a test case
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM test_cases WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    res.json({ message: 'Test case deleted successfully' });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
});

// Run a test case
router.post('/:id/run', async (req: AuthRequest, res) => {
  try {
    const testCase = await pool.query(
      'SELECT * FROM test_cases WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    
    if (testCase.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    // TODO: Trigger GitHub Action to run the test
    // For now, just create a test run record
    const result = await pool.query(
      `INSERT INTO test_runs (test_case_id, status, trigger_type, user_id, started_at)
       VALUES ($1, 'running', 'manual', $2, CURRENT_TIMESTAMP)
       RETURNING *`,
      [req.params.id, req.user!.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error running test case:', error);
    res.status(500).json({ error: 'Failed to run test case' });
  }
});

export default router;