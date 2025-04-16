import { existsSync } from 'node:fs';
import path from 'node:path';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { type Adapter, getAdapter } from '@c15t/backend/pkgs/db-adapters';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { z } from 'zod';

import { loadConfigAndOnboard } from '~/actions/load-config-and-onboard';
import { parseArgs } from '~/actions/parse-args';

const optionsSchema = z.object({
	cwd: z.string().default(process.cwd()),
	config: z.string().optional(),
	output: z.string().optional(),
	y: z.boolean().default(false),
});

export type GenerateOptions = z.infer<typeof optionsSchema>;

/**
 * Handles argument parsing, validation, config loading, onboarding, and adapter setup.
 */
export async function setupGenerateEnvironment(args: string[]): Promise<{
	options: GenerateOptions;
	config: C15TOptions<C15TPlugin[]>;
	adapter: Adapter;
}> {
	// 1. Parse and Validate Arguments
	const parsedArgs = parseArgs(args);
	let options: GenerateOptions;
	try {
		options = optionsSchema.parse(parsedArgs);
	} catch (error) {
		p.log.error('Invalid options provided.');
		if (error instanceof z.ZodError) {
			for (const err of error.errors) {
				p.log.warning(`  ${err.path.join('.')}: ${err.message}`);
			}
		}
		p.outro(`${color.red('Generation failed.')}`);
		process.exit(1); // Exit on invalid options
	}

	// 2. Validate CWD
	const cwd = path.resolve(options.cwd);
	if (!existsSync(cwd)) {
		p.log.error(`The directory "${cwd}" does not exist.`);
		p.outro(`${color.red('Generation setup failed.')}`);
		process.exit(1);
	}

	// 3. Load Config / Onboarding
	const config = await loadConfigAndOnboard({
		cwd,
		configPath: options.config,
	});

	// 4. Initialize Adapter
	let adapter: Adapter | undefined;
	try {
		adapter = await getAdapter(config);
	} catch (e) {
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
		p.log.error('Database adapter could not be initialized.');
		p.outro(`${color.red('Generation setup failed.')}`);
		process.exit(1);
	}

	return { options, config, adapter };
}
