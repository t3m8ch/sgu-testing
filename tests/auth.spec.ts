import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures/test.js';
import { negativeAuthCases } from '../data/auth-cases.js';
import { credentials } from '../support/config.js';
import { signIn } from '../support/sign-in.js';

test(
  'PUBLIC-AUTH: форма входа доступна гостю',
  { tag: '@public' },
  async ({ site }) => {
    await site.login.open();
    await expect(site.login.email).toBeVisible();
    await expect(site.login.password).toHaveAttribute('type', 'password');
    await expect(site.login.submit).toBeEnabled();
  },
);

test.describe('Вход с тестовой учёткой', () => {
  const account = credentials;
  test.skip(!account, 'Укажи NVS_EMAIL и NVS_PASSWORD в локальном .env.');

  test('TA-01: вход по email и паролю', async ({ site }) => {
    site.log('info', 'Проверяем вход по email и паролю.');
    await site.lockAccount(account!.email);
    await signIn(site.login, account!, site.cleanupSession, (message) =>
      site.log('warning', message),
    );
  });

  for (const scenario of negativeAuthCases) {
    test(`${scenario.id}: ${scenario.title}`, async ({ site }) => {
      const unique = randomUUID();
      const email = {
        valid: account!.email,
        unknown: `${unique}@example.test`,
        empty: '',
        malformed: `invalid-${unique}`,
      }[scenario.email];
      const password = {
        valid: account!.password,
        wrong: `test-invalid-${unique}`,
        empty: '',
      }[scenario.password];
      site.log('info', `Проверяем отказ во входе: ${scenario.title}.`);
      await site.lockAccount(account!.email);
      await test.step('Отправить форму с невалидными данными', async () => {
        await site.login.open();
        site.cleanupSession();
        await site.login.submitCredentials(email, password, (message) =>
          site.log('warning', message),
        );
      });
      await test.step('Проверить ошибку и отсутствие сессии', async () => {
        await expect
          .poll(() => site.login.errorText(), {
            message: 'Форма показала ожидаемый класс ошибки',
          })
          .toMatch(scenario.error);
        await site.login.openAccount();
        await expect(site.login.form).toBeVisible();
      });
    });
  }
});
