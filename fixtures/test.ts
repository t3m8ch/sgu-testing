import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page.js';
import { CatalogPage } from '../pages/catalog.page.js';
import { ProductPage } from '../pages/product.page.js';
import { CartPage } from '../pages/cart.page.js';
import { CheckoutPage } from '../pages/checkout.page.js';
import { createLogger } from '../support/logger.js';
import { failureScreenshot } from '../support/failure-screenshot.js';
import { lockAccount } from '../support/account-lock.js';
import type { CartEntry } from '../pages/cart.page.js';

export interface Site {
  login: LoginPage;
  catalog: CatalogPage;
  product: ProductPage;
  cart: CartPage;
  checkout: CheckoutPage;
  lockAccount: (email: string) => Promise<void>;
  cartMutationStarted: () => void;
  cleanupCartItem: (item: CartEntry) => void;
  cleanupSession: () => void;
  log: ReturnType<typeof createLogger>['log'];
}

export const test = base.extend<{ site: Site }>({
  site: [
    async ({ page }, use, info) => {
      const logger = createLogger();
      const login = new LoginPage(page);
      const cart = new CartPage(page);
      let cartItem: CartEntry | undefined;
      let cartMutationStarted = false;
      let releaseAccount: (() => Promise<void>) | undefined;
      let signedIn = false;
      let screenshotAttached = false;

      async function capture() {
        if (screenshotAttached || page.isClosed()) {
          return;
        }
        try {
          const screenshot = await failureScreenshot(page);
          await info.attach('Скриншот при падении (личные данные скрыты)', {
            body: screenshot,
            contentType: 'image/png',
          });
          screenshotAttached = true;
        } catch {
          logger.log(
            'warning',
            'Не удалось прикрепить скриншот. Ошибка теста остаётся в отчёте.',
          );
        }
      }

      logger.log('debug', 'Подготовлен отдельный контекст браузера.');
      try {
        await use({
          login,
          cart,
          catalog: new CatalogPage(page),
          product: new ProductPage(page),
          checkout: new CheckoutPage(page),
          lockAccount: async (email) => {
            releaseAccount = await lockAccount(email);
          },
          cartMutationStarted: () => {
            cartMutationStarted = true;
          },
          cleanupCartItem: (item) => {
            cartItem = item;
          },
          cleanupSession: () => {
            signedIn = true;
          },
          log: logger.log,
        });

        const failed = info.status !== info.expectedStatus;
        if (failed) {
          logger.log('error', 'Тест завершился ошибкой. Подробности в отчёте.');
          await capture();
        }

        const cleanupErrors: string[] = [];
        if (cartMutationStarted && !cartItem) {
          cleanupErrors.push(
            'Добавление начато, но позиция не подтверждена. Проверь корзину тестовой учётки вручную.',
          );
        }
        const item = cartItem;
        if (item) {
          try {
            await test.step('Убрать из корзины товар теста', () =>
              cart.removeIfPresent(item));
          } catch {
            cleanupErrors.push('Не удалось убрать тестовый товар из корзины.');
            await capture();
          }
        }
        if (signedIn) {
          try {
            await test.step('Выйти из тестовой учётки', () =>
              login.logOutIfSignedIn());
          } catch {
            cleanupErrors.push('Не удалось подтвердить выход из учётки.');
            await capture();
          }
        }
        for (const message of cleanupErrors) {
          logger.log('error', message);
        }
        if (logger.contents()) {
          await info.attach('Логи прогона', {
            body: logger.contents(),
            contentType: 'text/plain',
          });
        }
        if (!failed && cleanupErrors.length) {
          throw new Error(cleanupErrors.join(' '));
        }
      } finally {
        await releaseAccount?.();
      }
    },
    { timeout: 85_000 },
  ],
});

export { expect } from '@playwright/test';
