import type { Page } from '@playwright/test';

export class ProductPage {
  private get card() {
    return this.page.locator('.CatalogDetail');
  }
  get title() {
    return this.page.getByRole('heading', { level: 1 });
  }
  get code() {
    return this.card.locator('.Code span');
  }
  get price() {
    return this.card.locator('.item_current_price');
  }
  get unit() {
    return this.card.locator('.Price .Unit');
  }
  get availability() {
    return this.card.locator('.AvialibityIcon span');
  }
  get quantity() {
    return this.card.locator('.count input');
  }
  get addButton() {
    return this.card.getByRole('link', { name: 'В корзину', exact: true });
  }
  get cartConfirmation() {
    return this.page
      .locator('.popup-window:visible')
      .getByText(/товар (?:успешно )?добавлен/i);
  }

  constructor(private readonly page: Page) {}

  async setQuantity(quantity: number) {
    await this.quantity.fill(String(quantity));
    await this.quantity.press('Tab');
  }

  async addToCart() {
    await this.addButton.click();
    await this.cartConfirmation.waitFor({ state: 'visible' });
  }
}
