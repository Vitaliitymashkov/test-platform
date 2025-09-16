import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';

// CSRF protection configuration
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-key-should-be-in-env',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax', // Helps prevent CSRF
    secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
    path: '/',
  },
  size: 64, // Token size
  getSessionIdentifier: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown', // Use IP as session identifier
});

// Middleware to generate and attach CSRF token to response
export const attachCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Generate and attach CSRF token to response
  const csrfToken = generateCsrfToken(req, res);
  res.locals.csrfToken = csrfToken;
  next();
};

// Middleware to provide CSRF token via API endpoint
export const getCsrfToken = (req: Request, res: Response) => {
  const csrfToken = generateCsrfToken(req, res);
  return res.json({ csrfToken });
};

// Export the CSRF protection middleware
export const csrfProtection = doubleCsrfProtection;
