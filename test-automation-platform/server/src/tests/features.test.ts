import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import featuresRoutes from '../routes/features';
import { authMiddleware } from '../middleware/auth';

// Mock the database pool
jest.mock('../index', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Import the mocked pool
import { pool } from '../index';

describe('Features API - Functional Tests', () => {
  let app: express.Application;
  let authToken: string;
  const testUserId = 123;
  
  // Sample feature data for testing
  const testFeatures = [
    {
      id: 1,
      name: 'Login Feature',
      description: 'User authentication functionality',
      repository_path: '/auth',
      user_id: testUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      test_count: '2'
    },
    {
      id: 2,
      name: 'Dashboard',
      description: 'Main dashboard UI',
      repository_path: '/dashboard',
      user_id: testUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      test_count: '5'
    }
  ];

  // Single feature for individual feature tests
  const testFeature = testFeatures[0];
  
  beforeEach(() => {
    // Set up Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock JWT verification for auth middleware
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      if (typeof callback === 'function') {
        callback(null, { id: testUserId });
      }
      return { id: testUserId };
    });
    
    // Apply auth middleware and feature routes
    app.use(authMiddleware);
    app.use('/api/features', featuresRoutes);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Generate test auth token
    authToken = jwt.sign({ id: testUserId }, 'test-secret');
  });
  
  describe('GET /api/features', () => {
    it('should return all features for the authenticated user', async () => {
      // Mock the database query response
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: testFeatures
      });
      
      // Make the request
      const response = await request(app)
        .get('/api/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Assertions
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Login Feature');
      expect(response.body[1].name).toBe('Dashboard');
      
      // Verify the query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM features f'),
        [testUserId]
      );
    });
    
    it('should return 500 if database query fails', async () => {
      // Mock database error
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      
      // Make the request
      const response = await request(app)
        .get('/api/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
      
      // Assertions
      expect(response.body).toHaveProperty('error', 'Failed to fetch features');
    });
  });
  
  describe('GET /api/features/:id', () => {
    it('should return a single feature by ID', async () => {
      // Mock the database query response
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [testFeature]
      });
      
      // Make the request
      const response = await request(app)
        .get(`/api/features/${testFeature.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Assertions
      expect(response.body).toHaveProperty('id', testFeature.id);
      expect(response.body).toHaveProperty('name', testFeature.name);
      expect(response.body).toHaveProperty('description', testFeature.description);
      
      // Verify the query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM features'),
        [testFeature.id, testUserId]
      );
    });
    
    it('should return 404 if feature is not found', async () => {
      // Mock empty result
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });
      
      // Make the request
      const response = await request(app)
        .get('/api/features/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      // Assertions
      expect(response.body).toHaveProperty('error', 'Feature not found');
    });
  });
  
  describe('POST /api/features', () => {
    const newFeature = {
      name: 'New Feature',
      description: 'Feature description',
      repository_path: '/new-feature'
    };
    
    it('should create a new feature', async () => {
      // Mock the database query response
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 3,
          ...newFeature,
          user_id: testUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });
      
      // Make the request
      const response = await request(app)
        .post('/api/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newFeature)
        .expect(201);
      
      // Assertions
      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('name', newFeature.name);
      expect(response.body).toHaveProperty('user_id', testUserId);
      
      // Verify the query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO features'),
        [newFeature.name, newFeature.description, newFeature.repository_path, testUserId]
      );
    });
    
    it('should return 400 if feature name is missing', async () => {
      // Make the request with missing name
      const response = await request(app)
        .post('/api/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No name feature' })
        .expect(400);
      
      // Assertions
      expect(response.body).toHaveProperty('error', 'Feature name is required');
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
  
  describe('PUT /api/features/:id', () => {
    const updateData = {
      name: 'Updated Feature',
      description: 'Updated description'
    };
    
    it('should update an existing feature', async () => {
      // Mock the database query response
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          ...testFeature,
          ...updateData,
          updated_at: new Date().toISOString()
        }]
      });
      
      // Make the request
      const response = await request(app)
        .put(`/api/features/${testFeature.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      // Assertions
      expect(response.body).toHaveProperty('id', testFeature.id);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('description', updateData.description);
      
      // Verify the query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE features'),
        [updateData.name, updateData.description, undefined, testFeature.id, testUserId]
      );
    });
    
    it('should return 404 if feature to update is not found', async () => {
      // Mock empty result
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });
      
      // Make the request
      const response = await request(app)
        .put('/api/features/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
      
      // Assertions
      expect(response.body).toHaveProperty('error', 'Feature not found');
    });
  });
  
  describe('DELETE /api/features/:id', () => {
    it('should delete an existing feature', async () => {
      // Mock the database query response
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [testFeature]
      });
      
      // Make the request
      const response = await request(app)
        .delete(`/api/features/${testFeature.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Assertions
      expect(response.body).toHaveProperty('message', 'Feature deleted successfully');
      
      // Verify the query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM features'),
        [testFeature.id, testUserId]
      );
    });
    
    it('should return 404 if feature to delete is not found', async () => {
      // Mock empty result
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });
      
      // Make the request
      const response = await request(app)
        .delete('/api/features/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      // Assertions
      expect(response.body).toHaveProperty('error', 'Feature not found');
    });
  });
  
  describe('GET /api/features/:id/tests', () => {
    const testCases = [
      {
        id: 1,
        name: 'Login Test',
        feature_id: testFeature.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Logout Test',
        feature_id: testFeature.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    it('should return all test cases for a feature', async () => {
      // Mock the database query response
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: testCases
      });
      
      // Make the request
      const response = await request(app)
        .get(`/api/features/${testFeature.id}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Assertions
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Login Test');
      expect(response.body[1].name).toBe('Logout Test');
      
      // Verify the query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM test_cases tc'),
        [testFeature.id, testUserId]
      );
    });
  });
});
