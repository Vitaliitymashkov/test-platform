# Test Automation Platform

A web-based test automation platform that allows users to write test scenarios in natural language, automatically converts them to Playwright code, stores tests in GitHub repositories, and executes them via GitHub Actions.

## Features

- **Natural Language Test Writing**: Write test scenarios in plain English
- **Automatic Code Generation**: Converts natural language to Playwright test code
- **GitHub Integration**: Stores tests in GitHub repositories with version control
- **Test Organization**: Organize tests by features
- **GitHub Actions Execution**: Run tests using GitHub Actions
- **Comprehensive Reporting**: View test results, trends, and analytics
- **OAuth Authentication**: Secure login with GitHub

## Architecture

```
test-automation-platform/
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Auth & error handling
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   └── services/      # API client
└── examples/              # GitHub Actions examples
```

## Prerequisites

- Node.js 18+
- PostgreSQL
- GitHub OAuth App
- OpenAI API key (for natural language processing)

## Setup

### 1. Database Setup

Create a PostgreSQL database and run the schema:

```bash
psql -U your_username -d your_database -f server/database/schema.sql
```

### 2. Environment Variables

Create `.env` file in the server directory:

```env
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/test_automation
JWT_SECRET=your-secret-key
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
OPENAI_API_KEY=your-openai-api-key
```

### 3. GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`

### 4. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 5. Run the Application

```bash
# Backend (from server directory)
npm run dev

# Frontend (from client directory)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Usage

1. **Login**: Sign in with your GitHub account
2. **Create Features**: Organize your tests by features
3. **Write Tests**: Create test scenarios in natural language
4. **View Code**: See the generated Playwright code
5. **Run Tests**: Execute tests via GitHub Actions
6. **View Reports**: Analyze test results and trends

## GitHub Actions Integration

To enable test execution in your repository:

1. Copy `examples/test-execution.yml` to `.github/workflows/` in your test repository
2. Ensure your repository has Playwright installed
3. Tests will run automatically on push or can be triggered manually

## API Endpoints

### Authentication
- `GET /api/auth/github` - Get GitHub OAuth URL
- `POST /api/auth/github/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user

### Features
- `GET /api/features` - List all features
- `POST /api/features` - Create a feature
- `PUT /api/features/:id` - Update a feature
- `DELETE /api/features/:id` - Delete a feature

### Tests
- `GET /api/tests` - List all tests
- `POST /api/tests` - Create a test
- `PUT /api/tests/:id` - Update a test
- `DELETE /api/tests/:id` - Delete a test
- `POST /api/tests/:id/run` - Run a test

### Reports
- `GET /api/reports/runs` - Get test runs
- `GET /api/reports/stats` - Get statistics
- `GET /api/reports/stats/features` - Get feature statistics

## Development

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS, React Query
- **Testing**: Playwright
- **CI/CD**: GitHub Actions
- **Authentication**: GitHub OAuth

### Project Structure
- Natural language processing uses OpenAI API
- Test files are stored in GitHub repositories
- GitHub Actions handle test execution
- PostgreSQL stores metadata and results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT