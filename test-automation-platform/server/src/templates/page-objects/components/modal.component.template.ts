import { Page, Locator } from '@playwright/test';

/**
 * Modal Component
 * Reusable component for modal/dialog interactions
 */
export class ModalComponent {
  private readonly page: Page;
  private readonly modal: Locator;
  private readonly modalBackdrop: Locator;
  private readonly modalHeader: Locator;
  private readonly modalTitle: Locator;
  private readonly modalBody: Locator;
  private readonly modalFooter: Locator;
  private readonly closeButton: Locator;
  private readonly confirmButton: Locator;
  private readonly cancelButton: Locator;

  constructor(page: Page, modalSelector: string = '[data-testid="modal"]') {
    this.page = page;
    this.modal = page.locator(modalSelector);
    this.modalBackdrop = page.locator('[data-testid="modal-backdrop"]');
    this.modalHeader = this.modal.locator('[data-testid="modal-header"]');
    this.modalTitle = this.modalHeader.locator('[data-testid="modal-title"]');
    this.modalBody = this.modal.locator('[data-testid="modal-body"]');
    this.modalFooter = this.modal.locator('[data-testid="modal-footer"]');
    this.closeButton = this.modalHeader.locator('[data-testid="modal-close"]');
    this.confirmButton = this.modalFooter.locator('[data-testid="modal-confirm"]');
    this.cancelButton = this.modalFooter.locator('[data-testid="modal-cancel"]');
  }

  /**
   * Wait for modal to be visible
   */
  async waitForModal(): Promise<void> {
    await this.modal.waitFor({ state: 'visible' });
  }

  /**
   * Wait for modal to be hidden
   */
  async waitForModalToClose(): Promise<void> {
    await this.modal.waitFor({ state: 'hidden' });
  }

  /**
   * Check if modal is visible
   */
  async isModalVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  /**
   * Get modal title
   */
  async getTitle(): Promise<string> {
    return await this.modalTitle.textContent() || '';
  }

  /**
   * Get modal body text
   */
  async getBodyText(): Promise<string> {
    return await this.modalBody.textContent() || '';
  }

  /**
   * Click confirm button
   */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Click cancel button
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Close modal using X button
   */
  async closeModal(): Promise<void> {
    await this.closeButton.click();
  }

  /**
   * Close modal by clicking backdrop
   */
  async closeByBackdrop(): Promise<void> {
    await this.modalBackdrop.click({ position: { x: 0, y: 0 } });
  }

  /**
   * Fill input field in modal
   */
  async fillModalInput(fieldName: string, value: string): Promise<void> {
    const input = this.modalBody.locator(`[name="${fieldName}"], [data-testid="${fieldName}-input"]`);
    await input.clear();
    await input.fill(value);
  }

  /**
   * Select option in modal
   */
  async selectModalOption(fieldName: string, value: string): Promise<void> {
    const select = this.modalBody.locator(`select[name="${fieldName}"], [data-testid="${fieldName}-select"]`);
    await select.selectOption(value);
  }

  /**
   * Check checkbox in modal
   */
  async checkModalCheckbox(fieldName: string, check: boolean = true): Promise<void> {
    const checkbox = this.modalBody.locator(`input[type="checkbox"][name="${fieldName}"]`);
    if (check) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  /**
   * Get error message in modal
   */
  async getErrorMessage(): Promise<string> {
    const errorElement = this.modalBody.locator('[data-testid="modal-error"]');
    return await errorElement.textContent() || '';
  }

  /**
   * Check if confirm button is enabled
   */
  async isConfirmEnabled(): Promise<boolean> {
    return await this.confirmButton.isEnabled();
  }

  /**
   * Check if cancel button is enabled
   */
  async isCancelEnabled(): Promise<boolean> {
    return await this.cancelButton.isEnabled();
  }

  /**
   * Wait for modal animation to complete
   */
  async waitForAnimation(): Promise<void> {
    await this.page.waitForTimeout(300); // Standard modal animation duration
  }

  /**
   * Press Escape key to close modal
   */
  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Get all buttons in modal footer
   */
  async getFooterButtons(): Promise<string[]> {
    const buttons = await this.modalFooter.locator('button').allTextContents();
    return buttons;
  }

  /**
   * Click custom button in modal
   */
  async clickCustomButton(buttonText: string): Promise<void> {
    await this.modal.locator(`button:has-text("${buttonText}")`).click();
  }

  /**
   * Check if modal has specific class
   */
  async hasClass(className: string): Promise<boolean> {
    const classes = await this.modal.getAttribute('class') || '';
    return classes.includes(className);
  }

  /**
   * Get modal size
   */
  async getModalSize(): Promise<'small' | 'medium' | 'large' | 'fullscreen'> {
    const classes = await this.modal.getAttribute('class') || '';
    if (classes.includes('modal-sm')) return 'small';
    if (classes.includes('modal-lg')) return 'large';
    if (classes.includes('modal-fullscreen')) return 'fullscreen';
    return 'medium';
  }
}