import { privateValues } from './config.js';

const levels = ['debug', 'info', 'warning', 'error'] as const;
type Level = (typeof levels)[number];
const configured =
  levels.find((level) => level === process.env.LOG_LEVEL) ?? 'info';

export function redact(message: string, extra: readonly string[] = []) {
  const values = [...privateValues, ...extra]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const value of values) {
    // Escape the secret for literal, case-insensitive matching.
    message = message.replace(
      new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      '[MASKED]',
    );
  }
  return message
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[MASKED EMAIL]')
    .replace(
      /(?:\+7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s()-]*\d{2}[\s()-]*\d{2}\b/g,
      '[MASKED PHONE]',
    );
}

export function createLogger() {
  const lines: string[] = [];
  return {
    log(level: Level, message: string) {
      if (levels.indexOf(level) < levels.indexOf(configured)) {
        return;
      }
      const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${redact(message)}`;
      lines.push(line);
      if (level === 'error') {
        console.error(line);
      } else if (level === 'warning') {
        console.warn(line);
      } else {
        console.log(line);
      }
    },
    contents: () => lines.join('\n'),
  };
}
