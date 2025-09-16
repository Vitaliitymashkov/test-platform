import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../index';
import { hashPassword, verifyPassword, generateToken, isStrongPassword } from '../utils/passwordUtils';
import nodemailer from 'nodemailer';

// Email configuration - should be moved to environment variables in production
const EMAIL_FROM = 'noreply@testautomationplatform.com';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.example.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || 'user';
const EMAIL_PASS = process.env.EMAIL_PASS || 'password';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Register a new user with email and password
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, confirmPassword } = req.body;

  // Validate input
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Email, password, and password confirmation are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers' 
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password and generate verification token
    const passwordHash = await hashPassword(password);
    const verificationToken = generateToken();

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, email_verification_token) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, email_verified`,
      [email, passwordHash, verificationToken]
    );

    const user = result.rows[0];

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Login with email and password
 */
export const login = async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT id, email, password_hash, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Request password reset
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate reset token and set expiration (1 hour)
    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    const result = await pool.query(
      `UPDATE users 
       SET password_reset_token = $1, password_reset_expires = $2 
       WHERE email = $3 
       RETURNING id`,
      [resetToken, resetExpires, email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body;

  // Validate input
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Token, password, and password confirmation are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers' 
    });
  }

  try {
    // Find user with valid reset token
    const result = await pool.query(
      `SELECT id, email FROM users 
       WHERE password_reset_token = $1 
       AND password_reset_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const user = result.rows[0];

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password and clear reset token
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    // Find user with verification token
    const result = await pool.query(
      `UPDATE users 
       SET email_verified = TRUE, email_verification_token = NULL 
       WHERE email_verification_token = $1 
       RETURNING id, email`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

/**
 * Send verification email to user
 */
const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <h1>Welcome to Test Automation Platform</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email Address</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create this account, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset email to user
 */
const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
