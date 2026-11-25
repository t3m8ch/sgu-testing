import type { Page } from '@playwright/test';
import { privateValues } from './config.js';

export async function failureScreenshot(page: Page) {
  // CSS visibility hides form values even if autofilled. Mask plain-text regions and exact configured values too.
  const sensitiveRegions =
    'input:not([type="submit"]), select, textarea, [contenteditable], .Header .User, .bx-authform :is(.alert, .errortext, .bx-authform-error), #bx-soa-properties, #bx-soa-auth, #bx-soa-delivery, #bx-soa-region, #bx-soa-pickup';
  const escapedValues = privateValues.map((value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return page.screenshot({
    mask: [
      ...page.frames().map((frame) => frame.locator(sensitiveRegions)),
      ...(escapedValues.length
        ? page
            .frames()
            .map((frame) =>
              frame.getByText(new RegExp(escapedValues.join('|'), 'i')),
            )
        : []),
    ],
    maskColor: '#222222',
    timeout: 5_000,
  });
}
