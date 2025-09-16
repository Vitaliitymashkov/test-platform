import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * List/Table Page Object
 * Handles interactions with lists, tables, and grids
 */
export class ListPage extends BasePage {
  private readonly tableContainer: Locator;
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly addButton: Locator;
  private readonly filterButton: Locator;
  private readonly sortButton: Locator;
  private readonly paginationContainer: Locator;
  private readonly itemsPerPageSelect: Locator;
  private readonly loadingIndicator: Locator;
  private readonly noDataMessage: Locator;

  constructor(page: Page, tableSelector: string = '[data-testid="table-container"]') {
    super(page);
    
    this.tableContainer = page.locator(tableSelector);
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.addButton = page.locator('[data-testid="add-button"]');
    this.filterButton = page.locator('[data-testid="filter-button"]');
    this.sortButton = page.locator('[data-testid="sort-button"]');
    this.paginationContainer = page.locator('[data-testid="pagination"]');
    this.itemsPerPageSelect = page.locator('[data-testid="items-per-page"]');
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.noDataMessage = page.locator('[data-testid="no-data-message"]');
  }

  /**
   * Get all table rows
   */
  async getAllRows(): Promise<Locator[]> {
    return await this.tableContainer.locator('tbody tr').all();
  }

  /**
   * Get row count
   */
  async getRowCount(): Promise<number> {
    const rows = await this.getAllRows();
    return rows.length;
  }

  /**
   * Get row by index
   */
  async getRowByIndex(index: number): Promise<Locator> {
    return this.tableContainer.locator('tbody tr').nth(index);
  }

  /**
   * Get row by text content
   */
  async getRowByText(text: string): Promise<Locator> {
    return this.tableContainer.locator('tbody tr').filter({ hasText: text });
  }

  /**
   * Click action button in specific row
   */
  async clickRowAction(rowIndex: number, action: 'edit' | 'delete' | 'view'): Promise<void> {
    const row = await this.getRowByIndex(rowIndex);
    await row.locator(`[data-testid="${action}-button"]`).click();
  }

  /**
   * Select row checkbox
   */
  async selectRow(rowIndex: number, select: boolean = true): Promise<void> {
    const row = await this.getRowByIndex(rowIndex);
    const checkbox = row.locator('input[type="checkbox"]');
    if (select) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  /**
   * Select all rows
   */
  async selectAllRows(): Promise<void> {
    const selectAllCheckbox = this.tableContainer.locator('thead input[type="checkbox"]');
    await selectAllCheckbox.check();
  }

  /**
   * Search for items
   */
  async search(searchTerm: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.searchButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click add new item button
   */
  async clickAddNew(): Promise<void> {
    await this.addButton.click();
  }

  /**
   * Apply filter
   */
  async applyFilter(filterName: string, value: string): Promise<void> {
    await this.filterButton.click();
    // Wait for filter dropdown to appear
    await this.page.waitForSelector('[data-testid="filter-dropdown"]');
    await this.page.locator(`[data-testid="filter-${filterName}"]`).selectOption(value);
    await this.page.locator('[data-testid="apply-filters"]').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Sort by column
   */
  async sortByColumn(columnName: string, order: 'asc' | 'desc' = 'asc'): Promise<void> {
    const columnHeader = this.tableContainer.locator(`th[data-column="${columnName}"]`);
    await columnHeader.click();
    
    // Click again if we need descending order
    if (order === 'desc') {
      await columnHeader.click();
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to page
   */
  async goToPage(pageNumber: number): Promise<void> {
    await this.paginationContainer.locator(`[data-page="${pageNumber}"]`).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Go to next page
   */
  async goToNextPage(): Promise<void> {
    await this.paginationContainer.locator('[data-testid="next-page"]').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Go to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.paginationContainer.locator('[data-testid="prev-page"]').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Change items per page
   */
  async changeItemsPerPage(count: string): Promise<void> {
    await this.itemsPerPageSelect.selectOption(count);
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    // Wait for loading indicator to appear and disappear
    try {
      await this.loadingIndicator.waitFor({ state: 'visible', timeout: 1000 });
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      // Loading might be too fast to catch, continue
    }
  }

  /**
   * Check if no data message is displayed
   */
  async isNoDataDisplayed(): Promise<boolean> {
    return await this.noDataMessage.isVisible();
  }

  /**
   * Get cell value
   */
  async getCellValue(rowIndex: number, columnIndex: number): Promise<string> {
    const row = await this.getRowByIndex(rowIndex);
    const cell = row.locator('td').nth(columnIndex);
    return await cell.textContent() || '';
  }

  /**
   * Get column values
   */
  async getColumnValues(columnIndex: number): Promise<string[]> {
    const cells = await this.tableContainer.locator(`tbody tr td:nth-child(${columnIndex + 1})`).allTextContents();
    return cells;
  }

  /**
   * Get selected rows count
   */
  async getSelectedRowsCount(): Promise<number> {
    const checkboxes = await this.tableContainer.locator('tbody input[type="checkbox"]:checked').all();
    return checkboxes.length;
  }

  /**
   * Export data
   */
  async exportData(format: 'csv' | 'excel' | 'pdf'): Promise<void> {
    await this.page.locator(`[data-testid="export-${format}"]`).click();
  }

  /**
   * Refresh list
   */
  async refreshList(): Promise<void> {
    await this.page.locator('[data-testid="refresh-button"]').click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get current page number
   */
  async getCurrentPageNumber(): Promise<number> {
    const activePageText = await this.paginationContainer.locator('.active').textContent();
    return parseInt(activePageText || '1', 10);
  }

  /**
   * Get total pages
   */
  async getTotalPages(): Promise<number> {
    const totalPagesText = await this.paginationContainer.locator('[data-testid="total-pages"]').textContent();
    return parseInt(totalPagesText || '1', 10);
  }
}