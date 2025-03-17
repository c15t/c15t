import Crypto from 'node:crypto';
import { logger } from '@c15t/backend/pkgs/logger';
import chalk from 'chalk';
import { Command } from 'commander';

export const generateSecret = new Command('secret').action(() => {
	const secret = Crypto.randomBytes(32).toString('hex');
	logger.info(`\nAdd the following to your .env file: 
${chalk.gray('# Auth Secret') + chalk.green(`\nC15T_SECRET=${secret}`)}`);
});
