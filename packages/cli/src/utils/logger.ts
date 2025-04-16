import { createLogger } from '@c15t/backend/pkgs/logger';
import * as p from '@clack/prompts';
// Determine log level based on environment variable
const logLevel = process.env.C15T_DEBUG === 'true' ? 'debug' : 'info';

const logger = createLogger({
	level: logLevel, // Set level based on env var
	appName: 'c15t',
  error: (message) => {
    p.log.error(message);
  },
	warn: (message) => {
		p.log.warn(message);
	},
	info: (message) => {
		p.log.info(message);
	},
	debug: (message) => {
		p.log.info(message);
	},
});

export default logger;
