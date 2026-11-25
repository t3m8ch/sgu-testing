import type { Locator } from '@playwright/test';

export function parseKopecks(text: string) {
  const amount = text
    .replace(/\s+/g, '')
    .replace(/(?:руб\.?|₽)$/i, '')
    .replace(',', '.');
  return /^\d+(?:\.\d{1,2})?$/.test(amount)
    ? Math.round(Number(amount) * 100)
    : null;
}

export async function readKopecks(locator: Locator) {
  const texts = await locator.allTextContents();
  return texts.length === 1 ? parseKopecks(texts[0]) : null;
}
