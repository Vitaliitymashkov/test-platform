# API Reference

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints except `/auth/*` require JWT authentication:
```http
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Get GitHub OAuth URL
```http
GET /auth/github
```
Response:
```json
{
  "url": "https://github.com/login/oauth/authorize?..."
}
```

#### Handle OAuth Callback
```http
POST /auth/github/callback
```
Body:
```json
{
  "code": "github_oauth_code"
}
```
Response:
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "githubUsername": "username"
  }
}
```

### Interactive Test Builder

#### Start Session
```http
POST /interactive-test/sessions
```
Body:
```json
{
  "headless": false,
  "slowMo": 100,
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
```
Response:
```json
{
  "success": true,
  "sessionId": "session-1234567890-abc",
  "message": "Interactive session started"
}
```

#### Navigate to URL
```http
POST /interactive-test/sessions/:sessionId/navigate
```
Body:
```json
{
  "url": "https://example.com"
}
```
Response:
```json
{
  "success": true,
  "pageObject": {
    "id": "pom-1234567890",
    "name": "ExamplePage",
    "url": "https://example.com",
    "elements": [...],
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

#### Start Recording
```http
POST /interactive-test/sessions/:sessionId/record/start
```
Response:
```json
{
  "success": true,
  "message": "Recording started"
}
```

#### Stop Recording
```http
POST /interactive-test/sessions/:sessionId/record/stop
```
Response:
```json
{
  "success": true,
  "testCode": "import { test, expect } from '@playwright/test';...",
  "message": "Recording stopped and test generated"
}
```

#### Click Element
```http
POST /interactive-test/sessions/:sessionId/actions/click
```
Body:
```json
{
  "selector": "#submit-button",
  "elementName": "submitButton"
}
```
Response:
```json
{
  "success": true,
  "step": {
    "id": "step-1234567890",
    "action": "click",
    "elementName": "submitButton",
    "selector": "#submit-button",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### Fill Element
```http
POST /interactive-test/sessions/:sessionId/actions/fill
```
Body:
```json
{
  "selector": "#email-input",
  "value": "test@example.com",
  "elementName": "emailField"
}
```

#### Preview Click
```http
POST /interactive-test/sessions/:sessionId/preview/click
```
Body:
```json
{
  "selector": ".nav-link"
}
```
Response:
```json
{
  "success": true,
  "preview": {
    "willNavigate": true,
    "targetUrl": "/dashboard",
    "willOpenModal": false,
    "willSubmitForm": false
  }
}
```

#### Map Element
```http
POST /interactive-test/sessions/:sessionId/elements/map
```
Body:
```json
{
  "selector": ".button-primary",
  "name": "primaryButton"
}
```

#### Verify Element Stability
```http
POST /interactive-test/sessions/:sessionId/elements/:elementId/verify
```
Response:
```json
{
  "success": true,
  "isStable": true,
  "message": "Element is stable"
}
```

#### Get Session Details
```http
GET /interactive-test/sessions/:sessionId
```
Response:
```json
{
  "success": true,
  "session": {
    "id": "session-123",
    "currentUrl": "https://example.com",
    "isRecording": false,
    "recordedSteps": [...],
    "currentPageObject": {...},
    "elementMappings": [...]
  }
}
```

#### End Session
```http
DELETE /interactive-test/sessions/:sessionId
```

#### Get All Active Sessions
```http
GET /interactive-test/sessions
```

#### Get All Page Objects
```http
GET /interactive-test/page-objects
```

### Web Analysis

#### Analyze Page
```http
POST /web-analysis/analyze
```
Body:
```json
{
  "url": "https://example.com"
}
```
Response:
```json
{
  "success": true,
  "analysis": {
    "url": "https://example.com",
    "title": "Example Page",
    "elements": [...],
    "forms": [...],
    "navigation": [...],
    "pageType": "login"
  }
}
```

#### Generate Playwright Code
```http
POST /web-analysis/generate-code
```
Body:
```json
{
  "url": "https://example.com",
  "scenario": "Login with valid credentials"
}
```

#### Generate Page Object
```http
POST /web-analysis/generate-page-object
```
Body:
```json
{
  "url": "https://example.com"
}
```

### Tests

#### List Tests
```http
GET /tests
```
Query Parameters:
- `feature_id`: Filter by feature
- `limit`: Number of results
- `offset`: Pagination offset

#### Create Test
```http
POST /tests
```
Body:
```json
{
  "name": "Login Test",
  "description": "Test user login flow",
  "feature_id": 1,
  "test_code": "..."
}
```

#### Update Test
```http
PUT /tests/:id
```

#### Delete Test
```http
DELETE /tests/:id
```

#### Run Test
```http
POST /tests/:id/run
```

#### Convert Natural Language to Code
```http
POST /tests/convert
```
Body:
```json
{
  "naturalLanguage": "Click the login button and verify dashboard",
  "url": "https://example.com"
}
```

### Features

#### List Features
```http
GET /features
```

#### Create Feature
```http
POST /features
```
Body:
```json
{
  "name": "Authentication",
  "description": "User authentication features"
}
```

#### Update Feature
```http
PUT /features/:id
```

#### Delete Feature
```http
DELETE /features/:id
```

### Reports

#### Get Test Runs
```http
GET /reports/runs
```
Query Parameters:
- `test_id`: Filter by test
- `status`: Filter by status (passed/failed)
- `from_date`: Start date
- `to_date`: End date

#### Get Statistics
```http
GET /reports/stats
```
Response:
```json
{
  "totalTests": 50,
  "totalRuns": 200,
  "passRate": 85.5,
  "averageDuration": 12.3,
  "recentRuns": [...]
}
```

#### Get Feature Statistics
```http
GET /reports/stats/features
```

### GitHub Integration

#### Get Repositories
```http
GET /github/repos
```

#### Get Repository Workflow Runs
```http
GET /github/repos/:owner/:repo/runs
```

#### Trigger Workflow
```http
POST /github/repos/:owner/:repo/dispatch
```
Body:
```json
{
  "event_type": "test_execution",
  "client_payload": {
    "test_ids": [1, 2, 3]
  }
}
```

## WebSocket API

### Connect to Session
```
ws://localhost:3001/api/interactive-test/sessions/:sessionId/ws
```

### Events

#### Step Recorded
```json
{
  "type": "stepRecorded",
  "data": {
    "id": "step-123",
    "action": "click",
    "selector": "#button",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### Element Mapped
```json
{
  "type": "elementMapped",
  "data": {
    "id": "element-123",
    "name": "submitButton",
    "selector": "#submit",
    "type": "button"
  }
}
```

#### Page Analyzed
```json
{
  "type": "pageAnalyzed",
  "data": {
    "id": "pom-123",
    "name": "LoginPage",
    "elements": [...]
  }
}
```

## Error Responses

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "field": "Additional error context"
  }
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate-limited:
- Authentication: 5 requests per minute
- Test execution: 10 requests per minute
- Other endpoints: 100 requests per minute

Headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:
```http
GET /tests?limit=10&offset=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 20,
    "hasMore": true
  }
}
```

## Filtering and Sorting

Most list endpoints support filtering:
```http
GET /tests?feature_id=1&status=passed&sort=created_at:desc
```

Available sort fields:
- `created_at`
- `updated_at`
- `name`
- `status`

## Webhooks

Configure webhooks for test events:
```json
{
  "url": "https://your-webhook.com/endpoint",
  "events": ["test.completed", "test.failed"],
  "secret": "webhook_secret"
}
```

Events:
- `test.created`
- `test.updated`
- `test.deleted`
- `test.completed`
- `test.failed`
- `session.started`
- `session.ended`