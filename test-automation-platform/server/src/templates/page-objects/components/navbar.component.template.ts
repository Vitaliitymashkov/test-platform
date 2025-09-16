import { Page, Locator } from '@playwright/test';

/**
 * Navbar Component
 * Reusable component for navigation bar interactions
 */
export class NavbarComponent {
  private readonly page: Page;
  private readonly navbar: Locator;
  private readonly logo: Locator;
  private readonly homeLink: Locator;
  private readonly userMenu: Locator;
  private readonly userMenuDropdown: Locator;
  private readonly notificationBell: Locator;
  private readonly searchBox: Locator;

  constructor(page: Page, navbarSelector: string = '[data-testid="navbar"]') {
    this.page = page;
    this.navbar = page.locator(navbarSelector);
    this.logo = this.navbar.locator('[data-testid="logo"]');
    this.homeLink = this.navbar.locator('[data-testid="home-link"]');
    this.userMenu = this.navbar.locator('[data-testid="user-menu"]');
    this.userMenuDropdown = this.navbar.locator('[data-testid="user-menu-dropdown"]');
    this.notificationBell = this.navbar.locator('[data-testid="notification-bell"]');
    this.searchBox = this.navbar.locator('[data-testid="search-box"]');
  }

  /**
   * Navigate to a menu item
   */
  async navigateToMenuItem(itemName: string): Promise<void> {
    await this.navbar.locator(`[data-testid="nav-${itemName.toLowerCase()}"]`).click();
  }

  /**
   * Click logo to go home
   */
  async clickLogo(): Promise<void> {
    await this.logo.click();
  }

  /**
   * Open user menu
   */
  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
    await this.userMenuDropdown.waitFor({ state: 'visible' });
  }

  /**
   * Select user menu option
   */
  async selectUserMenuOption(option: 'profile' | 'settings' | 'logout'): Promise<void> {
    await this.openUserMenu();
    await this.userMenuDropdown.locator(`[data-testid="${option}-link"]`).click();
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    const badge = this.notificationBell.locator('[data-testid="notification-count"]');
    const countText = await badge.textContent();
    return parseInt(countText || '0', 10);
  }

  /**
   * Click notifications
   */
  async clickNotifications(): Promise<void> {
    await this.notificationBell.click();
  }

  /**
   * Search in navbar
   */
  async search(searchTerm: string): Promise<void> {
    await this.searchBox.fill(searchTerm);
    await this.searchBox.press('Enter');
  }

  /**
   * Check if user is logged in (user menu visible)
   */
  async isUserLoggedIn(): Promise<boolean> {
    return await this.userMenu.isVisible();
  }

  /**
   * Get current user name
   */
  async getCurrentUserName(): Promise<string> {
    return await this.userMenu.locator('[data-testid="user-name"]').textContent() || '';
  }

  /**
   * Check if navbar item is active
   */
  async isMenuItemActive(itemName: string): Promise<boolean> {
    const menuItem = this.navbar.locator(`[data-testid="nav-${itemName.toLowerCase()}"]`);
    const classes = await menuItem.getAttribute('class') || '';
    return classes.includes('active');
  }

  /**
   * Get all visible menu items
   */
  async getVisibleMenuItems(): Promise<string[]> {
    const items = await this.navbar.locator('[data-testid^="nav-"]').allTextContents();
    return items.filter(item => item.length > 0);
  }

  /**
   * Check if navbar is sticky
   */
  async isNavbarSticky(): Promise<boolean> {
    const position = await this.navbar.evaluate(el => 
      window.getComputedStyle(el).position
    );
    return position === 'sticky' || position === 'fixed';
  }

  /**
   * Toggle mobile menu
   */
  async toggleMobileMenu(): Promise<void> {
    const hamburger = this.navbar.locator('[data-testid="mobile-menu-toggle"]');
    await hamburger.click();
  }

  /**
   * Navigate using breadcrumb
   */
  async clickBreadcrumb(index: number): Promise<void> {
    await this.navbar.locator('[data-testid="breadcrumb-item"]').nth(index).click();
  }
}