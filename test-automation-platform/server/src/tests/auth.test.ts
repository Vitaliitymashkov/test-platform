import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as authController from '../controllers/authController';
import { pool } from '../index';

// Mock dependencies
jest.mock('../index', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

describe('Authentication Controller', () => {
  let app: express.Application;
  let mockReq: any;
  let mockRes: any;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request and response
    mockReq = {
      body: {},
      headers: {},
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });
  
  describe('register', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };
      
      (pool.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('SELECT')) {
          return { rows: [] }; // No existing user
        }
        if (query.includes('INSERT')) {
          return { rows: [{ id: 1 }] };
        }
        return { rows: [] };
      });
    });
    
    it('should register a new user successfully', async () => {
      await authController.register(mockReq, mockRes);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Registration successful. Please check your email to verify your account.',
      }));
    });
    
    it('should return error if email already exists', async () => {
      (pool.query as jest.Mock).mockImplementationOnce(() => {
        return { rows: [{ id: 1 }] }; // Existing user
      });
      
      await authController.register(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Email already registered',
      }));
    });
    
    it('should return error if passwords do not match', async () => {
      mockReq.body.confirmPassword = 'DifferentPassword';
      
      await authController.register(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Passwords do not match',
      }));
    });
  });
  
  describe('login', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        rememberMe: false,
      };
      
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashedPassword',
          is_verified: true,
        }],
      });
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });
    
    it('should login successfully with valid credentials', async () => {
      await authController.login(mockReq, mockRes);
      
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        token: 'test-token',
      }));
    });
    
    it('should return error if user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      await authController.login(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid email or password',
      }));
    });
    
    it('should return error if password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await authController.login(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid email or password',
      }));
    });
    
    it('should return error if account is not verified', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashedPassword',
          is_verified: false,
        }],
      });
      
      await authController.login(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Please verify your email before logging in',
      }));
    });
  });
  
  describe('verifyEmail', () => {
    beforeEach(() => {
      mockReq.body = {
        token: 'valid-verification-token',
      };
      
      (pool.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('SELECT')) {
          return {
            rows: [{
              id: 1,
              email: 'test@example.com',
              verification_token: 'valid-verification-token',
              verification_token_expires: new Date(Date.now() + 3600000).toISOString(),
            }],
          };
        }
        return { rows: [] };
      });
    });
    
    it('should verify email successfully with valid token', async () => {
      await authController.verifyEmail(mockReq, mockRes);
      
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Email verified successfully',
      }));
    });
    
    it('should return error if token is invalid', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      await authController.verifyEmail(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid or expired verification token',
      }));
    });
    
    it('should return error if token is expired', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          verification_token: 'valid-verification-token',
          verification_token_expires: new Date(Date.now() - 3600000).toISOString(),
        }],
      });
      
      await authController.verifyEmail(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid or expired verification token',
      }));
    });
  });
  
  // Additional tests for forgotPassword and resetPassword can be added here
});
