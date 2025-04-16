import { existsSync } from 'node:fs';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { type Adapter, getAdapter } from '@c15t/backend/pkgs/db-adapters';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { z } from 'zod';
import { loadConfigAndOnboard } from '~/actions/load-config-and-onboard';
import type { CliContext } from '~/context/types';

const optionsSchema = z.object({
	cwd: z.string(),
	config: z.string().optional(),
	output: z.string().optional(),
	y: z.boolean().default(false),
});

export type GenerateOptions = z.infer<typeof optionsSchema>;

/**
 * Handles config loading, onboarding, and adapter setup using the context.
 */
export async function setupGenerateEnvironment(context: CliContext): Promise<{
	config: C15TOptions<C15TPlugin[]>;
	adapter: Adapter;
}> {
	const { logger, flags, cwd } = context;

	logger.info('Setting up generate environment...');
	logger.debug('Context flags:', flags);
	logger.debug(`Context CWD: ${cwd}`);

	if (!existsSync(cwd)) {
		logger.error(`Generate CWD does not exist: ${cwd}`);
		p.log.error(`The directory "${cwd}" does not exist.`);
		p.outro(`${color.red('Generation setup failed.')}`);
		process.exit(1);
	}

	const config = await loadConfigAndOnboard(context);
	logger.info('Config loaded successfully for generate.');

	let adapter: Adapter | undefined;
	try {
		logger.debug('Initializing adapter for generate...');
		adapter = await getAdapter(config);
		logger.debug('Adapter initialized for generate:', adapter);
	} catch (e) {
		logger.error('Failed to initialize database adapter for generate:', e);
		p.log.error('Failed to initialize database adapter:');
		if (e instanceof Error) {
			p.log.message(e.message);
		} else {
			p.log.message(String(e));
		}
		p.outro(`${color.red('Generation setup failed.')}`);
		process.exit(1);
	}

	if (!adapter) {
		logger.error(
			'Database adapter could not be initialized after getAdapter call.'
		);
		p.log.error('Database adapter could not be initialized.');
		p.outro(`${color.red('Generation setup failed.')}`);
		process.exit(1);
	}

	logger.info('Generate environment setup complete.');
	return { config, adapter };
}
