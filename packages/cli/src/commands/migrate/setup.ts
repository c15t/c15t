import { existsSync } from 'node:fs';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { type Adapter, getAdapter } from '@c15t/backend/pkgs/db-adapters';
import { loadConfigAndOnboard } from '~/actions/load-config-and-onboard';
import type { CliContext } from '~/context/types';

/**
 * Validates that the provided adapter is the Kysely adapter.
 * Returns normally if valid, otherwise uses error handler to exit.
 */
function validateAdapterIsKysely(
	context: CliContext,
	adapter: Adapter | undefined
): void {
	const { logger, error } = context;
	logger.debug('Validating adapter is Kysely...', adapter);

	if (!adapter || adapter.id !== 'kysely') {
		let message =
			'Invalid or unsupported database configuration for migrate. Migrate command only works with built-in Kysely adapter.';

		if (adapter?.id === 'prisma') {
			message =
				"The migrate command only works with the built-in Kysely adapter. For Prisma, run `npx @c15t/cli generate` to create the schema, then use Prisma's migrate or push to apply it.";
		} else if (adapter?.id === 'drizzle') {
			message =
				"The migrate command only works with the built-in Kysely adapter. For Drizzle, run `npx @c15t/cli generate` to create the schema, then use Drizzle's migrate or push to apply it.";
		}

		error.handleError(
			new Error('Adapter validation failed: Not using Kysely'),
			message
		);
	}
}

/**
 * Loads config, checks for onboarding, initializes and validates the DB adapter using context.
 * Returns the config and adapter if successful, otherwise handles exit/errors.
 */
export async function setupEnvironment(context: CliContext): Promise<{
	config: C15TOptions<C15TPlugin[]>;
	adapter: Adapter;
}> {
	const { logger, flags, cwd, error } = context;

	logger.info('Setting up migration environment...');
	logger.debug('Context flags:', flags);
	logger.debug(`Context CWD: ${cwd}`);

	if (!existsSync(cwd)) {
		return error.handleError(
			new Error(`The directory "${cwd}" does not exist`),
			'Migration setup failed'
		);
	}

	const config = await loadConfigAndOnboard(context);
	logger.info('Config loaded successfully for migration.');

	let adapter: Adapter | undefined;
	try {
		logger.debug('Initializing database adapter...');
		adapter = await getAdapter(config);
		logger.debug('Adapter initialized:', adapter);
	} catch (e) {
		return error.handleError(e, 'Failed to initialize database adapter');
	}

	validateAdapterIsKysely(context, adapter);
	logger.info('Adapter validated successfully (Kysely).');

	logger.info('Migration environment setup complete.');
	return { config, adapter: adapter as Adapter };
}
