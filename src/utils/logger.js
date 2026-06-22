import pino from 'pino';
const logger = pino({}, process.stderr);
export { logger };
