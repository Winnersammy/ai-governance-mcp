import { createWriteStream, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, '..', 'logs');
mkdirSync(logsDir, { recursive: true });
const logFilePath = join(logsDir, 'server.log');
const stream = createWriteStream(logFilePath, { flags: 'a' });
stream.on('error', (err) => console.error('[logger] Log write failed:', err));
process.on('beforeExit', () => stream.end());

const levels = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DEBUG' };

function log(level, message, context = {}) {
  const entry = { level, message, timestamp: new Date().toISOString(), context };
  stream.write(JSON.stringify(entry) + '\n');
}

export default {
  error: (message, context) => log(levels.ERROR, message, context),
  warn: (message, context) => log(levels.WARN, message, context),
  info: (message, context) => log(levels.INFO, message, context),
  debug: (message, context) => log(levels.DEBUG, message, context),
};
