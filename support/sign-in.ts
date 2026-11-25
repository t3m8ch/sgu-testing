import { expect, test } from '../fixtures/test.js';
import type { LoginPage } from '../pages/login.page.js';

export async function signIn(
  login: LoginPage,
  account: { email: string; password: string },
  willUseSession: () => void,
  warn: (message: string) => void,
) {
  await test.step('Войти по email и паролю', async () => {
    await login.open();
    await expect(login.form).toBeVisible();
    willUseSession();
    await login.submitCredentials(account.email, account.password, warn);
    await login.openAccount();
    await expect(login.form).toBeHidden();
    await expect(
      login.accountMarker.filter({ visible: true }).first(),
      'Личный кабинет доступен',
    ).toBeVisible();
  });
}
