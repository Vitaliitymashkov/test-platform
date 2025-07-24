import { Router } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get test run history
router.get('/runs', async (req: AuthRequest, res) => {
  const { limit = 50, offset = 0, status } = req.query;
  
  try {
    let query = `
      SELECT tr.*, tc.title as test_title, tc.description as test_description,
             f.name as feature_name
      FROM test_runs tr
      JOIN test_cases tc ON tr.test_case_id = tc.id
      LEFT JOIN features f ON tc.feature_id = f.id
      WHERE tr.user_id = $1
    `;
    
    const params: any[] = [req.user!.id];
    
    if (status) {
      query += ` AND tr.status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY tr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test runs:', error);
    res.status(500).json({ error: 'Failed to fetch test runs' });
  }
});

// Get test results for a run
router.get('/runs/:runId/results', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.* 
       FROM test_results tr
       JOIN test_runs trun ON tr.test_run_id = trun.id
       WHERE tr.test_run_id = $1 AND trun.user_id = $2
       ORDER BY tr.created_at`,
      [req.params.runId, req.user!.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Get aggregated statistics
router.get('/stats', async (req: AuthRequest, res) => {
  const { startDate, endDate, featureId } = req.query;
  
  try {
    let query = `
      SELECT 
        COUNT(DISTINCT tr.id) as total_runs,
        COUNT(DISTINCT CASE WHEN tr.status = 'passed' THEN tr.id END) as passed_runs,
        COUNT(DISTINCT CASE WHEN tr.status = 'failed' THEN tr.id END) as failed_runs,
        COUNT(DISTINCT tc.id) as total_tests,
        AVG(CASE WHEN tr.completed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (tr.completed_at - tr.started_at)) 
            ELSE NULL END) as avg_duration_seconds
      FROM test_runs tr
      JOIN test_cases tc ON tr.test_case_id = tc.id
      WHERE tr.user_id = $1
    `;
    
    const params: any[] = [req.user!.id];
    
    if (startDate) {
      query += ` AND tr.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND tr.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    if (featureId) {
      query += ` AND tc.feature_id = $${params.length + 1}`;
      params.push(featureId);
    }
    
    const statsResult = await pool.query(query, params);
    
    // Get pass rate over time
    const passRateQuery = `
      SELECT 
        DATE_TRUNC('day', tr.created_at) as date,
        COUNT(CASE WHEN tr.status = 'passed' THEN 1 END)::float / 
        COUNT(*)::float * 100 as pass_rate,
        COUNT(*) as total_runs
      FROM test_runs tr
      JOIN test_cases tc ON tr.test_case_id = tc.id
      WHERE tr.user_id = $1
        ${startDate ? `AND tr.created_at >= $2` : ''}
        ${endDate ? `AND tr.created_at <= $${startDate ? 3 : 2}` : ''}
        ${featureId ? `AND tc.feature_id = $${params.length}` : ''}
      GROUP BY DATE_TRUNC('day', tr.created_at)
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const passRateResult = await pool.query(passRateQuery, params);
    
    res.json({
      summary: statsResult.rows[0],
      passRateTrend: passRateResult.rows,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get feature-wise statistics
router.get('/stats/features', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        f.id,
        f.name,
        COUNT(DISTINCT tc.id) as test_count,
        COUNT(DISTINCT tr.id) as run_count,
        COUNT(DISTINCT CASE WHEN tr.status = 'passed' THEN tr.id END) as passed_runs,
        COUNT(DISTINCT CASE WHEN tr.status = 'failed' THEN tr.id END) as failed_runs,
        CASE 
          WHEN COUNT(DISTINCT tr.id) > 0 
          THEN COUNT(DISTINCT CASE WHEN tr.status = 'passed' THEN tr.id END)::float / 
               COUNT(DISTINCT tr.id)::float * 100 
          ELSE 0 
        END as pass_rate
      FROM features f
      LEFT JOIN test_cases tc ON f.id = tc.feature_id
      LEFT JOIN test_runs tr ON tc.id = tr.test_case_id
      WHERE f.user_id = $1
      GROUP BY f.id, f.name
      ORDER BY f.name`,
      [req.user!.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feature statistics:', error);
    res.status(500).json({ error: 'Failed to fetch feature statistics' });
  }
});

// Generate and save a report
router.post('/generate', async (req: AuthRequest, res) => {
  const { name, type, filters } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  
  try {
    // Generate report data based on type and filters
    let reportData = {};
    
    // This would be expanded based on report types
    if (type === 'summary') {
      // Generate summary report
      reportData = {
        filters,
        generatedAt: new Date().toISOString(),
        // ... additional report data
      };
    }
    
    const result = await pool.query(
      `INSERT INTO reports (name, type, data, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, JSON.stringify(reportData), req.user!.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get saved reports
router.get('/saved', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, created_at
       FROM reports
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get a specific report
router.get('/saved/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

export default router;