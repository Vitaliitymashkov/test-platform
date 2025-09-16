# Setup Guide - Test Automation Platform

## Quick Start

### 1. Database Setup
First, ensure PostgreSQL is running and create the database:

```bash
# Create database
createdb test_automation

# Run schema
psql -U postgres -d test_automation -f server/database/schema.sql
```

### 2. Environment Variables
Create `.env` file in the `server` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/test_automation

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-here

# GitHub OAuth App Settings
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Server Port
PORT=3001
```

### 3. GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Test Automation Platform
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** to your `.env` file
6. Generate a new **Client Secret** and copy it to your `.env` file

### 4. Install Dependencies

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install

# Install Playwright browsers
npx playwright install
```

### 5. Start the Application

```bash
# Terminal 1 - Start backend server
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

### 6. Access the Application

1. Open browser to `http://localhost:3000`
2. Click "Login with GitHub"
3. Authorize the OAuth app
4. You'll be redirected to the dashboard

## Troubleshooting

### GitHub OAuth Issues

If you're getting authentication errors:

1. **Verify GitHub OAuth App Settings**:
   - Ensure the callback URL exactly matches: `http://localhost:3000/auth/github/callback`
   - Check that both Client ID and Secret are correctly copied to `.env`

2. **Check Server Logs**:
   ```bash
   # In the server terminal, look for error messages
   ```

3. **Test OAuth Flow Manually**:
   ```bash
   # Get the OAuth URL
   curl http://localhost:3001/api/auth/github
   ```

4. **Clear Browser Data**:
   - Clear cookies and localStorage for localhost
   - Try in an incognito window

### Database Connection Issues

1. **Verify PostgreSQL is running**:
   ```bash
   psql -U postgres -c "SELECT 1"
   ```

2. **Check database exists**:
   ```bash
   psql -U postgres -l | grep test_automation
   ```

3. **Verify tables are created**:
   ```bash
   psql -U postgres -d test_automation -c "\dt"
   ```

### Interactive Test Builder Issues

1. **401 Unauthorized**:
   - Ensure you're logged in first
   - Check that token is stored in localStorage
   - Try logging out and back in

2. **Session Won't Start**:
   - Verify Playwright is installed: `npx playwright install`
   - Check server has sufficient permissions
   - Try with `headless: true` option

## Testing Authentication

Run this test script to verify your setup:

```javascript
// Save as test-setup.js in server directory
const axios = require('axios');

async function testSetup() {
  console.log('Testing server connection...');
  try {
    const response = await axios.get('http://localhost:3001/api/auth/github');
    console.log('✓ Server is running');
    console.log('✓ GitHub OAuth URL:', response.data.url);
    
    // Check if URL has your client ID
    if (response.data.url.includes('client_id=')) {
      console.log('✓ GitHub Client ID is configured');
    } else {
      console.log('✗ GitHub Client ID missing');
    }
  } catch (error) {
    console.log('✗ Server not responding:', error.message);
  }
}

testSetup();
```

Run with: `node test-setup.js`

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module" errors | Run `npm install` in both server and client directories |
| GitHub callback fails | Verify OAuth app callback URL matches exactly |
| Database connection refused | Ensure PostgreSQL is running and credentials are correct |
| 401 Unauthorized on API calls | Log out and log back in to refresh token |
| WebSocket connection fails | Currently disabled, using polling instead |

## Next Steps

Once authenticated:

1. **Navigate to Interactive Test Builder**:
   - Click "Interactive" in the sidebar
   - Start a browser session
   - Navigate to any URL to begin mapping elements

2. **Create Your First Test**:
   - Click "Start Recording"
   - Interact with your application
   - Stop recording to generate Playwright code

3. **Manage Page Objects**:
   - Elements are automatically mapped
   - Name them for reusability
   - Page Objects are saved for future tests

## Support

For issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Try clearing browser cache and cookies