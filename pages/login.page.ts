import type { Page } from '@playwright/test';
import { manualCaptcha } from '../support/config.js';
import { redact } from '../support/logger.js';
import { fillPrivateField } from '../support/sensitive-field.js';

export class LoginPage {
  get form() {
    return this.page.locator('form[name="form_auth"]');
  }
  get email() {
    return this.form.locator('[name="USER_LOGIN"]');
  }
  get password() {
    return this.form.locator('[name="USER_PASSWORD"]');
  }
  get submit() {
    return this.form.getByRole('button', { name: 'Войти', exact: true });
  }
  get logoutLink() {
    return this.page.locator('a[href*="logout=yes" i]');
  }
  get accountMarker() {
    return this.logoutLink.or(
      this.page.locator(
        '.Content a[href*="/personal/private/"], .Content a[href*="/personal/order/"]',
      ),
    );
  }
  get error() {
    return this.page.locator(
      '.Content .alert-danger:visible, .Content .errortext:visible, .Content .bx-authform-error:visible, .Content [role="alert"]:visible',
    );
  }
  get captcha() {
    return this.page.locator(
      'input[name="captcha_word"]:visible, iframe[src*="captcha"]:visible',
    );
  }

  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/auth/', { waitUntil: 'domcontentloaded' });
  }

  async openAccount(timeout = 20_000) {
    await this.page.goto('/personal/', {
      waitUntil: 'domcontentloaded',
      timeout,
    });
  }

  async submitCredentials(
    email: string,
    password: string,
    warn: (message: string) => void,
  ) {
    await fillPrivateField(this.email, email, 'Email');
    await fillPrivateField(this.password, password, 'Пароль');
    const hadCaptcha = await this.checkCaptcha(warn);
    await this.submit.click();
    // The first submit may bring up a challenge and clear the password.
    if (!hadCaptcha && (await this.captcha.first().isVisible())) {
      if (await this.form.isVisible()) {
        await fillPrivateField(this.email, email, 'Email');
        await fillPrivateField(this.password, password, 'Пароль');
      }
      await this.checkCaptcha(warn);
      if (await this.submit.isVisible()) {
        await this.submit.click();
      }
    }
    if (await this.captcha.first().isVisible()) {
      throw new Error('Сайт не принял капчу.');
    }
  }

  async errorText() {
    return redact((await this.error.allTextContents()).join(' '))
      .replace(/\s+/g, ' ')
      .trim();
  }

  async logOutIfSignedIn() {
    await this.openAccount(7_000);
    if (await this.form.isVisible()) {
      return;
    }
    const logout = this.logoutLink.filter({ visible: true }).first();
    if (await logout.isVisible()) {
      await logout.click({ timeout: 5_000 });
    } else {
      await this.page.goto('/personal/?logout=yes', {
        waitUntil: 'domcontentloaded',
        timeout: 7_000,
      });
    }
    await this.openAccount(7_000);
    await this.form.waitFor({ state: 'visible', timeout: 4_000 });
  }

  private async checkCaptcha(warn: (message: string) => void) {
    if (!(await this.captcha.first().isVisible())) {
      return false;
    }
    if (!manualCaptcha) {
      throw new Error(
        'Сайт показал капчу. Для ручного ввода включи NVS_MANUAL_CAPTCHA=1.',
      );
    }
    warn('Сайт показал капчу. Реши её в окне Chromium.');
    // Bitrix uses an input in the form: let the user type only the captcha, then submit automatically.
    const code = this.page.locator('input[name="captcha_word"]:visible');
    if (await code.isVisible()) {
      await this.page.waitForFunction(
        () => {
          const field = document.querySelector<HTMLInputElement>(
            'input[name="captcha_word"]',
          );
          return Boolean(field && field.value.trim().length >= 5);
        },
        undefined,
        { timeout: 60_000 },
      );
    } else {
      await this.captcha.first().waitFor({ state: 'hidden', timeout: 60_000 });
    }
    return true;
  }
}
