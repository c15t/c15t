import Crypto from 'node:crypto';
import chalk from 'chalk';
import { Command } from 'commander';
import logger from '../utils/logger';

export const generateSecret = new Command('secret').action(() => {
	const secret = Crypto.randomBytes(32).toString('hex');
	logger.info(`\nAdd the following to your .env file: 
${chalk.gray('# C15T Secret') + chalk.green(`\nC15T_SECRET=${secret}`)}`);
});
