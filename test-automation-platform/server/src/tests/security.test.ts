import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { configureSecurityMiddleware } from '../middleware/security';
import { csrfProtection, attachCsrfToken, getCsrfToken } from '../middleware/csrfProtection';

// Mock csrf-csrf
jest.mock('csrf-csrf', () => {
  const mockDoubleCsrfProtection = jest.fn((req, res, next) => next());
  const mockGenerateCsrfToken = jest.fn(() => 'test-csrf-token');
  
  return {
    doubleCsrf: jest.fn(() => ({
      generateCsrfToken: mockGenerateCsrfToken,
      doubleCsrfProtection: mockDoubleCsrfProtection
    }))
  };
});

describe('Security Middleware', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('CSRF Protection', () => {
    beforeEach(() => {
      app.get('/csrf-token', getCsrfToken);
      app.post('/protected', csrfProtection, (req, res) => {
        res.json({ success: true });
      });
      app.get('/unprotected', attachCsrfToken, (req, res) => {
        res.json({ success: true });
      });
    });
    
    it('should provide a CSRF token via the /csrf-token endpoint', async () => {
      const response = await request(app)
        .get('/csrf-token')
        .expect(200);
      
      expect(response.body).toHaveProperty('csrfToken', 'test-csrf-token');
    });
    
    it('should attach CSRF token to response locals', async () => {
      app.get('/test-locals', attachCsrfToken, (req, res) => {
        res.json({ csrfToken: res.locals.csrfToken });
      });
      
      const response = await request(app)
        .get('/test-locals')
        .expect(200);
      
      expect(response.body).toHaveProperty('csrfToken', 'test-csrf-token');
    });
  });
  
  describe('Security Middleware Configuration', () => {
    it('should apply security headers to responses', async () => {
      configureSecurityMiddleware(app);
      
      app.get('/test-headers', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .get('/test-headers')
        .expect(200);
      
      // Check security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
    
    it('should apply additional cache control headers for authenticated requests', async () => {
      configureSecurityMiddleware(app);
      
      app.get('/test-auth-headers', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .get('/test-auth-headers')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
      
      // Check cache control headers for authenticated requests
      expect(response.headers).toHaveProperty('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(response.headers).toHaveProperty('pragma', 'no-cache');
      expect(response.headers).toHaveProperty('expires', '0');
      expect(response.headers).toHaveProperty('surrogate-control', 'no-store');
    });
  });
});
