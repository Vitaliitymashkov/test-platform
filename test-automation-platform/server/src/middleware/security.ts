import { Express } from 'express';
import cookieParser from 'cookie-parser';
import { attachCsrfToken, csrfProtection, getCsrfToken } from './csrfProtection';
import { apiLimiter } from './rateLimiter';

/**
 * Configure security middleware for the Express application
 * @param app Express application instance
 */
export function configureSecurityMiddleware(app: Express): void {
  // Parse cookies for CSRF protection
  app.use(cookieParser());
  
  // Apply general rate limiting to all API routes
  app.use('/api', apiLimiter);
  
  // Provide CSRF token endpoint
  app.get('/api/csrf-token', getCsrfToken);
  
  // Apply CSRF protection to all POST, PUT, DELETE, PATCH routes
  // Skip CSRF for API routes that need to be accessed by external services
  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    const path = req.path;
    
    // Skip CSRF for GitHub OAuth callback and public endpoints
    const skipCsrfPaths = [
      '/auth/github/callback',
      '/api/public',
      '/api/webhooks'
    ];
    
    // Apply CSRF protection only to mutation methods and non-exempt paths
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && 
        !skipCsrfPaths.some(skipPath => path.startsWith(skipPath))) {
      return csrfProtection(req, res, next);
    }
    
    // For all other requests, attach CSRF token but don't validate
    return attachCsrfToken(req, res, next);
  });
  
  // Add security headers
  app.use((req, res, next) => {
    // Prevent browsers from incorrectly detecting non-scripts as scripts
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Disable client-side caching for authenticated pages
    if (req.headers.authorization) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    
    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  });
}
