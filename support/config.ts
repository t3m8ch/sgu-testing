import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

export const manualCaptcha = process.env.NVS_MANUAL_CAPTCHA === '1';
const email = process.env.NVS_EMAIL?.trim() ?? '';
const password = process.env.NVS_PASSWORD ?? '';
const name = process.env.NVS_CHECKOUT_NAME?.trim() ?? '';
const phone = process.env.NVS_CHECKOUT_PHONE?.trim() ?? '';

export const credentials = email && password ? { email, password } : undefined;
export const contacts =
  email && name && phone ? { email, name, phone } : undefined;
export const privateValues = [email, password, name, phone].filter(Boolean);
