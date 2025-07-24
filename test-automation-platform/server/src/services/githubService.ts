import { Octokit } from '@octokit/rest';
import { pool } from '../index';

interface GitHubFileResult {
  filePath: string;
  githubUrl: string;
}

export async function createOrUpdateTestFile(
  userId: number,
  featureId: number,
  testId: number,
  testTitle: string,
  playwrightCode: string
): Promise<GitHubFileResult> {
  try {
    // Get user's access token
    const userResult = await pool.query(
      'SELECT access_token, github_username FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const { access_token, github_username } = userResult.rows[0];
    
    // Get feature information
    const featureResult = await pool.query(
      'SELECT name, repository_path FROM features WHERE id = $1',
      [featureId]
    );
    
    if (featureResult.rows.length === 0) {
      throw new Error('Feature not found');
    }
    
    const { name: featureName, repository_path } = featureResult.rows[0];
    
    // Parse repository information
    const repoInfo = parseRepositoryPath(repository_path || `${github_username}/playwright-tests`);
    
    const octokit = new Octokit({
      auth: access_token,
    });
    
    // Create file path
    const sanitizedFeatureName = featureName.toLowerCase().replace(/\s+/g, '-');
    const sanitizedTestTitle = testTitle.toLowerCase().replace(/\s+/g, '-');
    const filePath = `tests/features/${sanitizedFeatureName}/${sanitizedTestTitle}.spec.ts`;
    
    // Check if file exists
    let sha: string | undefined;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        path: filePath,
      });
      
      if ('sha' in existingFile) {
        sha = existingFile.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
      // File doesn't exist, which is fine
    }
    
    // Create or update file
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: filePath,
      message: sha ? `Update test: ${testTitle}` : `Add test: ${testTitle}`,
      content: Buffer.from(playwrightCode).toString('base64'),
      sha,
    });
    
    return {
      filePath,
      githubUrl: data.content?.html_url || `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/main/${filePath}`,
    };
  } catch (error) {
    console.error('Error creating/updating test file:', error);
    throw error;
  }
}

export async function deleteTestFile(
  userId: number,
  filePath: string,
  repositoryPath: string
): Promise<void> {
  try {
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const { access_token } = userResult.rows[0];
    const repoInfo = parseRepositoryPath(repositoryPath);
    
    const octokit = new Octokit({
      auth: access_token,
    });
    
    // Get file SHA
    const { data: file } = await octokit.repos.getContent({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: filePath,
    });
    
    if (!('sha' in file)) {
      throw new Error('File not found');
    }
    
    // Delete file
    await octokit.repos.deleteFile({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: filePath,
      message: `Delete test: ${filePath}`,
      sha: file.sha,
    });
  } catch (error) {
    console.error('Error deleting test file:', error);
    throw error;
  }
}

function parseRepositoryPath(repositoryPath: string): { owner: string; repo: string } {
  // Handle various formats: owner/repo, https://github.com/owner/repo, etc.
  const match = repositoryPath.match(/(?:github\.com\/)?([^\/]+)\/([^\/\.]+)/);
  
  if (!match) {
    throw new Error('Invalid repository path');
  }
  
  return {
    owner: match[1],
    repo: match[2],
  };
}