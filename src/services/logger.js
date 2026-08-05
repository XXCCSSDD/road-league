export const logger = {
  info: (...args) => console.log('[road-league]', ...args),
  warn: (...args) => console.warn('[road-league]', ...args),
  error: (...args) => console.error('[road-league]', ...args)
};
