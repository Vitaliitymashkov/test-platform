import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../index';
import axios from 'axios';

const router = Router();

router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const scope = 'repo user:email';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  res.json({ url: githubAuthUrl });
});

router.post('/github/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get user information
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const githubUser = userResponse.data;

    // Get user email
    const emailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const primaryEmail = emailResponse.data.find((email: any) => email.primary)?.email || githubUser.email;

    // Check if user exists or create new user
    const userQuery = `
      INSERT INTO users (email, github_id, github_username, access_token)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (github_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        github_username = EXCLUDED.github_username,
        access_token = EXCLUDED.access_token,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, github_id, github_username
    `;

    const result = await pool.query(userQuery, [
      primaryEmail,
      githubUser.id.toString(),
      githubUser.login,
      accessToken,
    ]);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        githubId: user.github_id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        githubUsername: user.github_username,
      },
    });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const result = await pool.query(
      'SELECT id, email, github_username FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;