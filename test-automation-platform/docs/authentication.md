# Authentication System Documentation

This document provides comprehensive information about the authentication system implemented in the Test Automation Platform.

## Overview

The platform supports two authentication methods:
1. **GitHub OAuth** - Login with GitHub account
2. **Email/Password** - Traditional email and password authentication

The authentication system includes the following features:
- User registration with email verification
- Login with email/password
- Password reset functionality
- Remember me option for extended sessions
- Security features including rate limiting and CSRF protection

## Authentication Flows

### Registration Flow

1. User submits registration form with email and password
2. System validates input (email format, password strength)
3. System checks if email already exists
4. If valid, system:
   - Hashes the password using bcrypt
   - Generates a verification token
   - Stores user information in the database
   - Sends verification email to the user
5. User clicks the verification link in the email
6. System verifies the token and marks the account as verified
7. User can now log in

### Login Flow

1. User submits login form with email and password
2. System validates credentials
3. If valid and account is verified, system:
   - Generates a JWT token
   - Returns token to client
   - Client stores token in localStorage
4. If "Remember Me" is selected, token expiration is extended (30 days vs 7 days)

### Password Reset Flow

1. User requests password reset by providing email
2. System generates a reset token and sends reset link to user's email
3. User clicks the reset link and enters a new password
4. System validates the token and updates the password
5. User can log in with the new password

## Security Features

### Password Security

- Passwords are hashed using bcrypt with 10 salt rounds
- Password strength requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

### Rate Limiting

Rate limiting is applied to protect against brute force attacks:

- **API Rate Limiter**: 100 requests per 15 minutes for general API endpoints
- **Authentication Rate Limiter**: 10 requests per 15 minutes for login attempts
- **Password Reset Rate Limiter**: 5 requests per hour for password reset requests
- **Registration Rate Limiter**: 3 requests per hour for registration attempts

### CSRF Protection

Cross-Site Request Forgery protection is implemented using the csrf-csrf library:

- CSRF tokens are required for all POST, PUT, DELETE, and PATCH requests
- The client automatically fetches and includes CSRF tokens in API requests
- CSRF tokens are stored in HTTP-only cookies
- Exceptions are made for GitHub OAuth callback and public endpoints

### Security Headers

The following security headers are applied to all responses:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `X-XSS-Protection: 1; mode=block` - Helps prevent XSS attacks
- For authenticated requests, additional cache control headers are applied:
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
  - `Surrogate-Control: no-store`

## API Endpoints

### Registration and Verification

- `POST /api/auth/register` - Register a new user
  - Request body: `{ email, password, confirmPassword }`
  - Response: `{ message, userId }`

- `POST /api/auth/verify-email` - Verify email address
  - Request body: `{ token }`
  - Response: `{ message }`

### Authentication

- `POST /api/auth/login` - Login with email and password
  - Request body: `{ email, password, rememberMe }`
  - Response: `{ token, user }`

- `POST /api/auth/logout` - Logout (client-side token removal)
  - Response: `{ message }`

### Password Reset

- `POST /api/auth/forgot-password` - Request password reset
  - Request body: `{ email }`
  - Response: `{ message }`

- `POST /api/auth/reset-password` - Reset password with token
  - Request body: `{ token, password, confirmPassword }`
  - Response: `{ message }`

### GitHub OAuth

- `GET /api/auth/github` - Get GitHub OAuth URL
  - Response: `{ url }`

- `POST /api/auth/github/callback` - Handle GitHub OAuth callback
  - Request body: `{ code }`
  - Response: `{ token, user }`

### User Information

- `GET /api/auth/me` - Get current user information
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ user }`

## Client-Side Implementation

### Authentication Context

The `AuthContext` provides authentication state and functions throughout the application:

```jsx
const { user, isAuthenticated, login, logout, register } = useAuth();
```

### Login Page

The login page includes multiple views:
- Login form
- Registration form
- Forgot password form
- Reset password form
- Email verification notification

### API Service

The API service automatically handles:
- JWT token inclusion in requests
- CSRF token fetching and inclusion
- Redirecting to login on 401 errors

## Environment Variables

The following environment variables are required:

```
# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password

# Application URL (for email links)
APP_URL=http://localhost:3000

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# CSRF Protection
CSRF_SECRET=your_csrf_secret_key
```

## Best Practices and Recommendations

1. **JWT Token Storage**: Store JWT tokens in memory for single-page applications when possible, or use HTTP-only cookies for enhanced security.

2. **Password Policy**: Implement a password rotation policy for production environments.

3. **Multi-Factor Authentication**: Consider implementing MFA for additional security.

4. **Account Lockout**: Implement account lockout after multiple failed login attempts.

5. **Audit Logging**: Add comprehensive logging for authentication events.

6. **Session Management**: Implement proper session invalidation on the server side.

7. **Security Monitoring**: Set up monitoring for unusual authentication patterns.

## Troubleshooting

### Common Issues

1. **Email Verification Link Not Working**
   - Check that the APP_URL environment variable is correctly set
   - Verify that the verification token is valid and not expired

2. **CSRF Token Errors**
   - Ensure cookies are being properly sent (withCredentials: true)
   - Check that the CSRF token is included in the request headers
   - Verify that the CSRF secret is properly set

3. **Rate Limiting Issues**
   - If legitimate users are being rate limited, consider adjusting the rate limit thresholds

### Debugging

For debugging authentication issues:
1. Check browser console for client-side errors
2. Examine server logs for backend errors
3. Use browser developer tools to inspect network requests and responses
4. Verify that all required environment variables are set correctly
