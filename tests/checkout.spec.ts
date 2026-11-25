import { test, expect, type Site } from '../fixtures/test.js';
import { product } from '../data/checkout-case.js';
import { contacts, credentials } from '../support/config.js';
import { parseKopecks, readKopecks } from '../support/money.js';
import { signIn } from '../support/sign-in.js';

async function findProduct(site: Pick<Site, 'catalog'>) {
  await site.catalog.search(product.code);
  const result = site.catalog.result(product.name);
  await expect(result).toBeVisible();
  await result.click();
}

test(
  'PUBLIC-CATALOG: найти товар по коду и открыть карточку',
  { tag: '@public' },
  async ({ site }) => {
    await site.login.open();
    await findProduct(site);
    await expect(site.product.title).toHaveText(product.name);
    await expect(site.product.code).toHaveText(product.code);
  },
);

test.describe('Оформление без отправки заказа', () => {
  test.skip(
    !credentials || !contacts,
    'Укажи тестовую учётку и контакты для оформления в локальном .env.',
  );

  test('TM-22: вход, поиск, карточка, корзина и оформление', async ({
    site,
    page,
  }) => {
    site.log('info', 'Запускаем TM-22. Заказ отправлять не будем.');
    await site.lockAccount(credentials!.email);
    await signIn(site.login, credentials!, site.cleanupSession, (message) =>
      site.log('warning', message),
    );

    await test.step('Найти товар по коду', () => findProduct(site));

    const unitPrice = await test.step('Проверить карточку товара', async () => {
      await expect(site.product.title).toHaveText(product.name);
      await expect(site.product.code).toHaveText(product.code);
      await expect(site.product.unit).toHaveText(product.unit);
      await expect(site.product.availability).toHaveText(/^в наличии$/i);
      await expect
        .poll(() => readKopecks(site.product.price), {
          message: 'Цена в карточке отображается в рублях',
        })
        .toBeGreaterThan(0);
      const price = parseKopecks(await site.product.price.innerText());
      if (price === null || price <= 0) {
        throw new Error('В карточке нет корректной цены.');
      }
      return price;
    });

    const subtotal =
      await test.step('Добавить товар в пустую корзину и проверить покупку', async () => {
        // Verify the clean starting state before allowing any edit of the account cart.
        const productUrl = page.url();
        await site.cart.open();
        const state = site.cart.empty.or(site.cart.rows.first());
        await expect(state.first()).toBeVisible();
        if (!(await site.cart.empty.isVisible())) {
          site.log(
            'warning',
            'Тестовая корзина уже содержит товары. Не меняем её состояние.',
          );
          throw new Error(
            'Для TM-22 нужна отдельная учётка с пустой корзиной.',
          );
        }
        await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
        await site.product.setQuantity(product.quantity);
        await expect(site.product.quantity).toHaveValue(
          String(product.quantity),
        );
        site.cartMutationStarted();
        await site.product.addToCart();
        await site.cart.open();
        const item = site.cart.item(product.name);
        await expect(site.cart.rows).toHaveCount(1);
        await expect(item.row).toBeVisible();
        const rowId = await item.row.getAttribute('data-id');
        if (!rowId || !/^\d+$/.test(rowId)) {
          throw new Error(
            'Не удалось подтвердить идентификатор новой позиции.',
          );
        }
        site.cleanupCartItem({
          id: rowId,
          name: product.name,
          quantity: product.quantity,
        });
        await expect(item.quantity).toHaveValue(String(product.quantity));
        const expected = unitPrice * product.quantity;
        await expect
          .poll(() => readKopecks(item.sum), {
            message: 'Сумма позиции соответствует цене и количеству',
          })
          .toBe(expected);
        await expect
          .poll(() => readKopecks(site.cart.total), {
            message: 'Сумма всей корзины совпадает с суммой позиции',
          })
          .toBe(expected);
        return expected;
      });

    await test.step('Проверить оформление без нажатия кнопки заказа', async () => {
      await site.cart.openCheckout();
      await expect(page).toHaveURL(/\/personal\/order\/make(?:\/|\?|$)/);
      await expect(site.checkout.form).toBeVisible();
      const item = site.checkout.item(product.name);
      // Bitrix renders the product summary inside a collapsed section at this step.
      await expect(item.row).toHaveCount(1);
      await expect(item.quantity).toHaveText(
        new RegExp(`^${product.quantity}(?:\\s*шт\\.?)?$`),
      );
      await expect
        .poll(() => readKopecks(site.checkout.productSubtotal), {
          message: 'В оформление перешла сумма товаров из корзины',
        })
        .toBe(subtotal);
      await site.checkout.fillContacts(contacts!);
      site.log(
        'info',
        'Контакты заполнены. Кнопку подтверждения заказа не нажимаем.',
      );
    });
  });
});
