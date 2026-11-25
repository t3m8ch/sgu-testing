import type { Page } from '@playwright/test';

export class CatalogPage {
  get searchForm() {
    return this.page.locator('#smart-title-search form');
  }
  get query() {
    return this.searchForm.locator('[name="q"]');
  }
  get results() {
    return this.page.locator('.Content');
  }

  constructor(private readonly page: Page) {}

  async search(text: string) {
    await this.query.fill(text);
    await this.searchForm.locator('button[type="submit"]').click();
  }

  result(name: string) {
    // The tile has image links with the same title; select the link in its name block.
    return this.results
      .locator('.bx_catalog_item_title')
      .getByRole('link', { name, exact: true });
  }
}
