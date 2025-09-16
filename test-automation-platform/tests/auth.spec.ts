import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should navigate to login page', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
    
    // Verify that we're on the login page
    await expect(page).toHaveTitle(/Login/);
  });

  test('should show registration form when clicking register link', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
    
    // Click on the register link/button
    await page.getByText('Register').click();
    
    // Verify that the registration form is displayed
    await expect(page.getByText('Create an account')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
  });

  test('should show forgot password form when clicking forgot password link', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
    
    // Click on the forgot password link
    await page.getByText('Forgot Password?').click();
    
    // Verify that the forgot password form is displayed
    await expect(page.getByText('Reset Password')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
    
    // Submit the form without entering any data
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Verify that validation errors are displayed
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});
