# User Story: GitHub Account Integration

## Title
As a registered user, I want to connect my GitHub account to my existing email-based account so that I can store test cases in GitHub repositories and leverage GitHub Actions for test execution.

## User Story
**As a** user with an email-based account  
**I want to** link my GitHub account to my existing profile  
**So that** I can store test cases in my GitHub repositories and run them using GitHub Actions

## Acceptance Criteria

### Account Linking Flow
1. **Given** I am logged in with my email/password account
   - **When** I navigate to Account Settings or Profile
   - **Then** I should see an option to "Connect GitHub Account"

2. **Given** I click "Connect GitHub Account"
   - **When** I am redirected to GitHub OAuth
   - **And** I authorize the application
   - **Then** My GitHub account should be linked to my existing account
   - **And** I should see my GitHub username displayed in settings

3. **Given** I have connected my GitHub account
   - **When** I view my account settings
   - **Then** I should see:
     - GitHub username
     - Connected repositories count
     - Option to disconnect GitHub account
     - Last sync date

### Repository Access
1. **Given** I have linked my GitHub account
   - **When** I create a new feature/test
   - **Then** I should be able to:
     - Select from my GitHub repositories
     - Create a new repository
     - Choose public or private repository

2. **Given** I select a repository for storing tests
   - **When** I save a test case
   - **Then** The test should be committed to the selected repository
   - **And** I should see the GitHub file URL in the test details

### Permissions Management
1. **Given** I am connecting my GitHub account
   - **When** GitHub requests permissions
   - **Then** The app should request only necessary scopes:
     - `repo` - Full control of private repositories
     - `workflow` - Update GitHub Action workflows
     - `read:user` - Read user profile data

2. **Given** I want to revoke GitHub access
   - **When** I click "Disconnect GitHub Account"
   - **Then** I should see a warning about losing repository access
   - **And** Upon confirmation, the GitHub token should be removed
   - **But** My account should remain active with email login

### Migration Capabilities
1. **Given** I previously signed in with GitHub OAuth only
   - **When** I create an email/password for my account
   - **Then** Both authentication methods should work
   - **And** My test history should be preserved

2. **Given** I have tests stored locally (before GitHub connection)
   - **When** I connect my GitHub account
   - **Then** I should be offered to migrate existing tests to a repository

### Sync and Conflict Resolution
1. **Given** I have connected my GitHub account
   - **When** Tests are modified directly in GitHub
   - **Then** The platform should detect changes on next access
   - **And** Show a sync status indicator

2. **Given** There are conflicts between local and GitHub versions
   - **When** I access a test with conflicts
   - **Then** I should see a conflict resolution interface
   - **And** Be able to choose which version to keep

## Technical Requirements

### Database Schema Updates
```sql
-- Already existing in schema:
-- github_id VARCHAR(255) UNIQUE
-- github_username VARCHAR(255)
-- access_token TEXT

-- Add additional fields for enhanced integration
ALTER TABLE users
ADD COLUMN github_connected_at TIMESTAMP,
ADD COLUMN github_scopes TEXT, -- Store granted OAuth scopes
ADD COLUMN primary_auth_method VARCHAR(50) DEFAULT 'email'; -- 'email' or 'github'

-- Repository connections table
CREATE TABLE IF NOT EXISTS user_repositories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    repository_name VARCHAR(255) NOT NULL,
    repository_full_name VARCHAR(255) NOT NULL,
    repository_id BIGINT,
    is_private BOOLEAN DEFAULT FALSE,
    default_branch VARCHAR(100) DEFAULT 'main',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, repository_full_name)
);
```

### API Endpoints
- `POST /api/auth/connect-github` - Initiate GitHub OAuth flow for existing user
- `POST /api/auth/github/link-callback` - Handle OAuth callback for account linking
- `DELETE /api/auth/disconnect-github` - Remove GitHub connection
- `GET /api/github/repositories` - List user's GitHub repositories
- `POST /api/github/sync-repository` - Sync tests with GitHub repository
- `GET /api/auth/connection-status` - Check GitHub connection status

### Authentication Flow Updates
1. Modify existing auth middleware to support dual authentication
2. Update JWT token to include `auth_method` field
3. Implement account merging logic for users with both auth methods
4. Ensure session management works with both auth types

### Security Considerations
1. Store GitHub tokens encrypted in database
2. Implement token refresh mechanism for expired tokens
3. Validate GitHub webhooks with secret
4. Audit log for all GitHub operations
5. Implement proper CORS for GitHub OAuth flow
6. Regular token permission audits

### UI/UX Requirements
1. Clear visual indicator of GitHub connection status
2. Step-by-step guide for first-time GitHub connection
3. Repository selector with search functionality
4. Visual diff viewer for sync conflicts
5. Progress indicators for repository operations
6. Clear permission explanations during OAuth

## Edge Cases to Handle
1. User's GitHub account already linked to another account
2. GitHub token expiration during operation
3. Repository access revoked externally
4. GitHub API rate limiting
5. Network failures during sync operations
6. Large repository handling (>1000 files)

## Definition of Done
- [ ] GitHub connection flow implemented in settings
- [ ] OAuth callback handling for account linking
- [ ] Repository selection interface created
- [ ] Token storage and encryption implemented
- [ ] API endpoints created and tested
- [ ] Dual authentication support added
- [ ] GitHub sync functionality implemented
- [ ] Conflict resolution UI created
- [ ] Integration tests for GitHub operations
- [ ] Documentation updated with GitHub setup guide
- [ ] Error handling for all edge cases
- [ ] Migration tool for existing GitHub-only users