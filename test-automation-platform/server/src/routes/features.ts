import { Router } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get all features for a user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, COUNT(tc.id) as test_count
       FROM features f
       LEFT JOIN test_cases tc ON f.id = tc.feature_id
       WHERE f.user_id = $1
       GROUP BY f.id
       ORDER BY f.name`,
      [req.user!.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Get a single feature
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM features WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({ error: 'Failed to fetch feature' });
  }
});

// Create a new feature
router.post('/', async (req: AuthRequest, res) => {
  const { name, description, repository_path } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Feature name is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO features (name, description, repository_path, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, repository_path, req.user!.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

// Update a feature
router.put('/:id', async (req: AuthRequest, res) => {
  const { name, description, repository_path } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE features 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           repository_path = COALESCE($3, repository_path),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, description, repository_path, req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// Delete a feature
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM features WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    res.json({ message: 'Feature deleted successfully' });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

// Get test cases for a feature
router.get('/:id/tests', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT tc.* 
       FROM test_cases tc
       JOIN features f ON tc.feature_id = f.id
       WHERE tc.feature_id = $1 AND f.user_id = $2
       ORDER BY tc.created_at DESC`,
      [req.params.id, req.user!.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feature test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

export default router;