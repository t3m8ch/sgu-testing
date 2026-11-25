import type { Locator, Page } from '@playwright/test';
import { fillPrivateField } from '../support/sensitive-field.js';

export class CheckoutPage {
  get form() {
    return this.page.locator('form#bx-soa-order-form');
  }
  private get products() {
    return this.form.locator('#bx-soa-basket');
  }
  private get properties() {
    return this.form.locator('#bx-soa-properties');
  }
  get productSubtotal() {
    return this.form
      .locator('#bx-soa-total .bx-soa-cart-total-line')
      .filter({ hasText: /товаров на|сумма покупок|стоимость товаров/i })
      .locator('.bx-soa-cart-d');
  }

  constructor(private readonly page: Page) {}

  item(name: string) {
    const row = this.products
      .locator('.bx-soa-item-tr')
      .filter({ has: this.page.getByText(name, { exact: true }) });
    return {
      row,
      quantity: row
        .locator('.bx-soa-item-td', {
          has: this.page.getByText(/^количество:?$/i),
        })
        .locator('.bx-soa-item-td-text'),
    };
  }

  private phoneDigits(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/^8(?=\d{10}$)/, '7');
  }

  private async fillPhone(input: Locator, value: string) {
    const digits = this.phoneDigits(value);
    try {
      // The Russian phone mask can supply +7 itself and consume the first typed digit.
      // Try the canonical form, then emulate typing the ten national digits into the mask.
      await fillPrivateField(
        input,
        /^7\d{10}$/.test(digits) ? `+${digits}` : value,
        'Телефон',
      );
      await input.press('Tab');
      if (
        this.phoneDigits(await input.inputValue()) === digits ||
        !/^7\d{10}$/.test(digits)
      ) {
        return;
      }
      await input.fill('');
      await input.pressSequentially(digits.slice(1));
      await input.press('Tab');
    } catch {
      throw new Error('Не удалось заполнить поле «Телефон».');
    }
  }

  async fillContacts(contacts: { email: string; name: string; phone: string }) {
    const fields = [
      ['Имя', /(?:ф\.?\s*и\.?\s*о\.?|имя)/i, contacts.name],
      ['Телефон', /телефон/i, contacts.phone],
      ['Email', /e-?mail|электронн.*почт/i, contacts.email],
    ] as const;
    const values: { label: string; input: Locator; expected: string }[] = [];
    for (const [label, text, value] of fields) {
      const input = this.properties
        .locator('.bx-soa-customer-field')
        .filter({ hasText: text })
        .locator('input:visible');
      if (label === 'Телефон') {
        await this.fillPhone(input, value);
      } else {
        await fillPrivateField(input, value, label);
      }
      values.push({ label, input, expected: value });
    }
    for (const { label, input, expected } of values) {
      const normalize = (value: string) =>
        label === 'Телефон' ? this.phoneDigits(value) : value.trim();
      try {
        if (normalize(await input.inputValue()) === normalize(expected)) {
          continue;
        }
      } catch {
        // Keep field contents out of Playwright's diagnostic messages.
      }
      throw new Error(`В поле «${label}» не сохранилось ожидаемое значение.`);
    }
  }
}
