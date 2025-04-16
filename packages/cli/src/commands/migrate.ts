import * as p from '@clack/prompts';
import color from 'picocolors';
import { z } from 'zod';

import { parseArgs } from '../actions/parse-args';
import logger from '../utils/logger';
import { executeMigrations } from './migrate/execute';
import { planMigrations } from './migrate/plan';
import { setupEnvironment } from './migrate/setup';

export async function migrate(args: string[]) {
	logger.info('Starting migrate command...');
	logger.debug('Raw args for migrate:', args);
	// 1. Parse and validate arguments
	const parsedArgs = parseArgs(args);
	const optionsSchema = z.object({
		cwd: z.string().default(process.cwd()),
		config: z.string().optional(),
		y: z.boolean().default(false),
	});

	let options: z.infer<typeof optionsSchema>;
	try {
		options = optionsSchema.parse(parsedArgs);
		logger.debug('Parsed and validated migrate options:', options);
	} catch (error) {
		logger.error('Invalid options provided for migrate:', error);
		p.log.error('Invalid options provided.');
		if (error instanceof z.ZodError) {
			for (const err of error.errors) {
				p.log.warning(`  ${err.path.join('.')}: ${err.message}`);
			}
		}
		p.outro(`${color.red('Migration failed.')}`);
		return; // Exit early on invalid options
	}

	try {
		// 2. Setup environment (config, adapter, validation)
		// This function handles its own errors/exits/onboarding and logs internally
		const { config } = await setupEnvironment({
			cwd: options.cwd,
			configPath: options.config,
		});
		logger.info('Migrate environment setup completed.');

		// If setupEnvironment completes, config and adapter are valid

		// 3. Plan migrations (get, display, confirm)
		// This function handles its own errors/exits and logs internally
		const planResult = await planMigrations(config, options.y);
		logger.info('Migration planning process completed.');
		logger.debug('Plan result:', planResult);

		// 4. Execute migrations if necessary
		if (planResult.shouldRun && planResult.runMigrationsFn) {
			logger.info('Proceeding to execute migrations.');
			await executeMigrations(planResult.runMigrationsFn);
			logger.info('Migration execution process completed.');
		} else {
			logger.info('Skipping migration execution based on plan result.');
		}

		// Outro messages are handled within planMigrations or executeMigrations
		// unless an unexpected error occurs below.
		logger.info('Migrate command finished successfully.');
	} catch (error) {
		// Catch unexpected errors during the setup/plan/execute sequence
		logger.error('Unexpected error during migrate command:', error);
		p.log.error('An unexpected error occurred during the migration process:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Migration process failed unexpectedly.')}`);
		process.exit(1); // Exit with error for unexpected failures
	}
}
