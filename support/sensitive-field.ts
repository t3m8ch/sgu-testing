import type { Locator } from '@playwright/test';

export async function fillPrivateField(
  field: Locator,
  value: string,
  label: string,
) {
  try {
    await field.fill(value);
  } catch {
    // Playwright's action error can include the actual fill value. Never rethrow it.
    throw new Error(
      `Не удалось заполнить поле «${label}»: проверь локатор и доступность поля.`,
    );
  }
}
