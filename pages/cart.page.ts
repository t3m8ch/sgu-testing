import type { Page } from '@playwright/test';

export interface CartEntry {
  id: string;
  name: string;
  quantity: number;
}

export class CartPage {
  get empty() {
    return this.page.getByText('Ваша корзина пуста', { exact: true });
  }
  get rows() {
    return this.page
      .locator('[data-entity="basket-item"]')
      .filter({ has: this.page.locator('[data-entity="basket-item-name"]') });
  }
  get total() {
    return this.page.locator('[data-entity="basket-total-price"]:visible');
  }
  get checkoutButton() {
    return this.page.locator('[data-entity="basket-checkout-button"]:visible');
  }

  constructor(private readonly page: Page) {}

  async open(timeout = 20_000) {
    await this.page.goto('/personal/cart/', {
      waitUntil: 'domcontentloaded',
      timeout,
    });
  }

  item(name: string, id?: string) {
    const expectedName = new RegExp(
      `^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
    );
    const candidates = id
      ? this.rows.and(this.page.locator(`[data-id="${id}"]`))
      : this.rows;
    const row = candidates.filter({
      has: this.page
        .locator('[data-entity="basket-item-name"]')
        .filter({ hasText: expectedName }),
    });
    return {
      row,
      quantity: row.locator('[data-entity="basket-item-quantity-field"]'),
      sum: row.locator(
        '.basket-item-price-current-text[id^="basket-item-sum-price-"]',
      ),
      remove: row.locator('[data-entity="basket-item-delete"]'),
    };
  }

  async removeIfPresent(entry: CartEntry) {
    await this.open(10_000);
    await this.empty
      .or(this.rows.first())
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
    const item = this.item(entry.name, entry.id);
    if (!(await item.row.isVisible())) {
      if (await this.item(entry.name).row.count()) {
        throw new Error(
          'Идентификатор позиции изменился; корзина не затронута.',
        );
      }
      return;
    }
    if (
      Number(await item.quantity.inputValue({ timeout: 3_000 })) !==
      entry.quantity
    ) {
      throw new Error('Количество позиции изменилось; корзина не затронута.');
    }
    // Bitrix displays Undo before committing deletion. Wait for its AJAX request, then reload to verify persistence.
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URLSearchParams(response.request().postData() ?? '').has(
            `basket[DELETE_${entry.id}]`,
          ),
        { timeout: 10_000 },
      ),
      item.remove.click({ timeout: 5_000 }),
    ]);
    if (!response.ok() || (await response.finished())) {
      throw new Error('Сервер не подтвердил удаление из корзины.');
    }
    await this.open(10_000);
    await this.empty
      .or(this.rows.first())
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
    await item.row.waitFor({ state: 'hidden', timeout: 3_000 });
  }

  async openCheckout() {
    await this.checkoutButton.click();
  }
}
