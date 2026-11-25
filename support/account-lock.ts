import { createHash } from 'node:crypto';
import { mkdir, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function lockAccount(email: string) {
  const root = join(homedir(), '.nvs-playwright-locks');
  const key = createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');
  const lock = join(root, key);
  await mkdir(root, { recursive: true, mode: 0o700 });
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
    throw new Error(
      'Учётка уже занята другим прогоном. Если предыдущий процесс аварийно завершился, см. README.',
    );
  }
  return () => rmdir(lock);
}
