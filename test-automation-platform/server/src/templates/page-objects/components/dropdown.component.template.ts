import { Page, Locator } from '@playwright/test';

/**
 * Dropdown Component
 * Reusable component for dropdown/select interactions
 */
export class DropdownComponent {
  private readonly page: Page;
  private readonly container: Locator;
  private readonly trigger: Locator;
  private readonly menu: Locator;
  private readonly searchInput: Locator;

  constructor(page: Page, containerSelector: string) {
    this.page = page;
    this.container = page.locator(containerSelector);
    this.trigger = this.container.locator('[data-testid="dropdown-trigger"]');
    this.menu = this.container.locator('[data-testid="dropdown-menu"]');
    this.searchInput = this.menu.locator('[data-testid="dropdown-search"]');
  }

  /**
   * Open dropdown
   */
  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      await this.trigger.click();
      await this.menu.waitFor({ state: 'visible' });
    }
  }

  /**
   * Close dropdown
   */
  async close(): Promise<void> {
    if (await this.isOpen()) {
      await this.trigger.click();
      await this.menu.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Check if dropdown is open
   */
  async isOpen(): Promise<boolean> {
    return await this.menu.isVisible();
  }

  /**
   * Select option by text
   */
  async selectByText(text: string): Promise<void> {
    await this.open();
    await this.menu.locator(`[data-testid="dropdown-option"]:has-text("${text}")`).click();
  }

  /**
   * Select option by value
   */
  async selectByValue(value: string): Promise<void> {
    await this.open();
    await this.menu.locator(`[data-testid="dropdown-option"][data-value="${value}"]`).click();
  }

  /**
   * Select option by index
   */
  async selectByIndex(index: number): Promise<void> {
    await this.open();
    await this.menu.locator('[data-testid="dropdown-option"]').nth(index).click();
  }

  /**
   * Get selected text
   */
  async getSelectedText(): Promise<string> {
    return await this.trigger.textContent() || '';
  }

  /**
   * Get all options
   */
  async getAllOptions(): Promise<string[]> {
    await this.open();
    const options = await this.menu.locator('[data-testid="dropdown-option"]').allTextContents();
    await this.close();
    return options;
  }

  /**
   * Get options count
   */
  async getOptionsCount(): Promise<number> {
    await this.open();
    const count = await this.menu.locator('[data-testid="dropdown-option"]').count();
    await this.close();
    return count;
  }

  /**
   * Search in dropdown
   */
  async search(searchTerm: string): Promise<void> {
    await this.open();
    if (await this.searchInput.isVisible()) {
      await this.searchInput.clear();
      await this.searchInput.fill(searchTerm);
      // Wait for search results to update
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Clear selection
   */
  async clearSelection(): Promise<void> {
    const clearButton = this.container.locator('[data-testid="dropdown-clear"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  /**
   * Check if option exists
   */
  async hasOption(text: string): Promise<boolean> {
    await this.open();
    const exists = await this.menu.locator(`[data-testid="dropdown-option"]:has-text("${text}")`).count() > 0;
    await this.close();
    return exists;
  }

  /**
   * Check if dropdown is disabled
   */
  async isDisabled(): Promise<boolean> {
    return await this.trigger.isDisabled();
  }

  /**
   * Check if option is disabled
   */
  async isOptionDisabled(text: string): Promise<boolean> {
    await this.open();
    const option = this.menu.locator(`[data-testid="dropdown-option"]:has-text("${text}")`);
    const isDisabled = await option.getAttribute('aria-disabled') === 'true' || 
                      await option.isDisabled();
    await this.close();
    return isDisabled;
  }

  /**
   * Select multiple options (for multi-select dropdowns)
   */
  async selectMultiple(options: string[]): Promise<void> {
    await this.open();
    for (const option of options) {
      await this.menu.locator(`[data-testid="dropdown-option"]:has-text("${option}")`).click();
      // Don't close dropdown between selections for multi-select
      await this.page.waitForTimeout(100);
    }
    // Click outside to close
    await this.page.click('body', { position: { x: 0, y: 0 } });
  }

  /**
   * Get selected values (for multi-select)
   */
  async getSelectedValues(): Promise<string[]> {
    const selectedElements = await this.container.locator('[data-testid="selected-value"]').allTextContents();
    return selectedElements;
  }

  /**
   * Remove selected value (for multi-select)
   */
  async removeSelectedValue(value: string): Promise<void> {
    const removeButton = this.container.locator(`[data-testid="selected-value"]:has-text("${value}") [data-testid="remove-value"]`);
    await removeButton.click();
  }

  /**
   * Check if dropdown has error
   */
  async hasError(): Promise<boolean> {
    const errorElement = this.container.locator('[data-testid="dropdown-error"]');
    return await errorElement.isVisible();
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    const errorElement = this.container.locator('[data-testid="dropdown-error"]');
    return await errorElement.textContent() || '';
  }
}