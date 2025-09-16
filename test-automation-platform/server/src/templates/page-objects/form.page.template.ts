import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Generic Form Page Object
 * Can be extended for specific forms or used as-is for simple forms
 */
export class FormPage extends BasePage {
  private readonly formContainer: Locator;
  private readonly submitButton: Locator;
  private readonly cancelButton: Locator;
  private readonly errorSummary: Locator;
  private readonly successMessage: Locator;

  constructor(page: Page, formSelector: string = '[data-testid="form-container"]') {
    super(page);
    
    this.formContainer = page.locator(formSelector);
    this.submitButton = this.formContainer.locator('[type="submit"], [data-testid="submit-button"]');
    this.cancelButton = this.formContainer.locator('[data-testid="cancel-button"]');
    this.errorSummary = page.locator('[data-testid="error-summary"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }

  /**
   * Fill a text input field
   */
  async fillTextField(fieldName: string, value: string): Promise<void> {
    const field = this.formContainer.locator(`[name="${fieldName}"], [data-testid="${fieldName}-input"]`);
    await field.clear();
    await field.fill(value);
  }

  /**
   * Fill multiple text fields
   */
  async fillMultipleFields(fields: Record<string, string>): Promise<void> {
    for (const [fieldName, value] of Object.entries(fields)) {
      await this.fillTextField(fieldName, value);
    }
  }

  /**
   * Select a dropdown option
   */
  async selectDropdown(fieldName: string, value: string): Promise<void> {
    const dropdown = this.formContainer.locator(`select[name="${fieldName}"], [data-testid="${fieldName}-select"]`);
    await dropdown.selectOption(value);
  }

  /**
   * Check a checkbox
   */
  async checkCheckbox(fieldName: string, check: boolean = true): Promise<void> {
    const checkbox = this.formContainer.locator(`input[type="checkbox"][name="${fieldName}"], [data-testid="${fieldName}-checkbox"]`);
    if (check) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  /**
   * Select a radio button
   */
  async selectRadio(fieldName: string, value: string): Promise<void> {
    const radio = this.formContainer.locator(`input[type="radio"][name="${fieldName}"][value="${value}"]`);
    await radio.check();
  }

  /**
   * Fill textarea
   */
  async fillTextarea(fieldName: string, value: string): Promise<void> {
    const textarea = this.formContainer.locator(`textarea[name="${fieldName}"], [data-testid="${fieldName}-textarea"]`);
    await textarea.clear();
    await textarea.fill(value);
  }

  /**
   * Upload file to file input
   */
  async uploadFile(fieldName: string, filePath: string): Promise<void> {
    const fileInput = this.formContainer.locator(`input[type="file"][name="${fieldName}"], [data-testid="${fieldName}-file"]`);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Submit the form
   */
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Cancel the form
   */
  async cancelForm(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Submit form and wait for response
   */
  async submitAndWaitForResponse(): Promise<void> {
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/') && response.status() === 200
    );
    await this.submitForm();
    await responsePromise;
  }

  /**
   * Get field error message
   */
  async getFieldError(fieldName: string): Promise<string> {
    const errorElement = this.formContainer.locator(`[data-testid="${fieldName}-error"]`);
    return await errorElement.textContent() || '';
  }

  /**
   * Check if field has error
   */
  async fieldHasError(fieldName: string): Promise<boolean> {
    const errorElement = this.formContainer.locator(`[data-testid="${fieldName}-error"]`);
    return await errorElement.isVisible();
  }

  /**
   * Get all form errors
   */
  async getAllErrors(): Promise<string[]> {
    const errors = await this.errorSummary.locator('li').allTextContents();
    return errors;
  }

  /**
   * Check if form has any errors
   */
  async hasErrors(): Promise<boolean> {
    return await this.errorSummary.isVisible();
  }

  /**
   * Check if success message is displayed
   */
  async isSuccessMessageDisplayed(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  /**
   * Get success message text
   */
  async getSuccessMessageText(): Promise<string> {
    return await this.successMessage.textContent() || '';
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    const inputs = await this.formContainer.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all();
    for (const input of inputs) {
      await input.clear();
    }
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Get field value
   */
  async getFieldValue(fieldName: string): Promise<string> {
    const field = this.formContainer.locator(`[name="${fieldName}"], [data-testid="${fieldName}-input"]`);
    return await field.inputValue();
  }

  /**
   * Wait for form to be ready
   */
  async waitForFormReady(): Promise<void> {
    await this.formContainer.waitFor({ state: 'visible' });
    await this.submitButton.waitFor({ state: 'visible' });
  }

  /**
   * Fill date field
   */
  async fillDateField(fieldName: string, date: string): Promise<void> {
    const dateField = this.formContainer.locator(`input[type="date"][name="${fieldName}"], [data-testid="${fieldName}-date"]`);
    await dateField.fill(date);
  }

  /**
   * Fill time field
   */
  async fillTimeField(fieldName: string, time: string): Promise<void> {
    const timeField = this.formContainer.locator(`input[type="time"][name="${fieldName}"], [data-testid="${fieldName}-time"]`);
    await timeField.fill(time);
  }
}