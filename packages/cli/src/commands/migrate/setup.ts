import { existsSync } from 'node:fs';
import path from 'node:path';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { type Adapter, getAdapter } from '@c15t/backend/pkgs/db-adapters';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { loadConfigAndOnboard } from '~/actions/load-config-and-onboard';
import logger from '~/utils/logger';

/**
 * Validates that the provided adapter is the Kysely adapter.
 * Exits the process with an error message if validation fails.
 */
function validateAdapterIsKysely(adapter: Adapter | undefined): void {
	logger.debug('Validating adapter is Kysely...', adapter);
	if (!adapter || adapter.id !== 'kysely') {
		logger.error('Adapter validation failed. Adapter is not Kysely.');
		if (adapter?.id === 'prisma') {
			p.log.error(
				"The migrate command only works with the built-in Kysely adapter. For Prisma, run `npx @c15t/cli generate` to create the schema, then use Prisma's migrate or push to apply it."
			);
		} else if (adapter?.id === 'drizzle') {
			p.log.error(
				"The migrate command only works with the built-in Kysely adapter. For Drizzle, run `npx @c15t/cli generate` to create the schema, then use Drizzle's migrate or push to apply it."
			);
		} else {
			p.log.error(
				'Invalid or unsupported database configuration for migrate. Migrate command only works with built-in Kysely adapter.'
			);
		}
		p.outro('Migration aborted.');
		process.exit(1);
	}
}

/**
 * Loads config, checks for onboarding, initializes and validates the DB adapter.
 * Returns the config and adapter if successful, otherwise handles exit/errors.
 */
export async function setupEnvironment(options: {
	cwd: string;
	configPath?: string;
}): Promise<{
	config: C15TOptions<C15TPlugin[]>;
	adapter: Adapter;
}> {
	logger.info('Setting up migration environment...');
	logger.debug('Setup options:', options);

	const cwd = path.resolve(options.cwd);
	logger.debug(`Resolved CWD: ${cwd}`);
	if (!existsSync(cwd)) {
		logger.error(`Directory does not exist: ${cwd}`);
		p.log.error(`The directory "${cwd}" does not exist.`);
		p.outro(`${color.red('Migration setup failed.')}`);
		process.exit(1);
	}

	const config = await loadConfigAndOnboard({
		cwd,
		configPath: options.configPath,
	});
	logger.info('Config loaded successfully for migration.');

	let adapter: Adapter | undefined;
	try {
		logger.debug('Initializing database adapter...');
		adapter = await getAdapter(config);
		logger.debug('Adapter initialized:', adapter);
	} catch (e) {
		logger.error('Failed to initialize database adapter:', e);
		p.log.error('Failed to initialize database adapter:');
		if (e instanceof Error) {
			p.log.message(e.message);
		} else {
			p.log.message(String(e));
		}
		p.outro(`${color.red('Migration setup failed.')}`);
		process.exit(1);
	}

	validateAdapterIsKysely(adapter);
	logger.info('Adapter validated successfully (Kysely).');

	logger.info('Migration environment setup complete.');
	return { config, adapter: adapter as Adapter };
}
