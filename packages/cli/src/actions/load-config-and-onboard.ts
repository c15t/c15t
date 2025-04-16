import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { startOnboarding } from '../onboarding';
import { getConfig } from '../utils/get-config';

/**
 * Loads the c15t configuration, triggering onboarding if necessary.
 * Exits the process if loading fails or after onboarding is triggered.
 * Returns the loaded config if found.
 */
export async function loadConfigAndOnboard(options: {
	cwd: string;
	configPath?: string;
}): Promise<C15TOptions<C15TPlugin[]>> {
	let config: C15TOptions<C15TPlugin[]> | undefined;
	try {
		const configResult = await getConfig({
			cwd: options.cwd,
			configPath: options.configPath,
		});
		config = configResult ?? undefined;
	} catch (error) {
		p.log.error('Error loading configuration:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Operation failed: Could not load config.')}`);
		process.exit(1);
	}

	if (!config) {
		await startOnboarding({ cwd: options.cwd });
		// Onboarding handles its own exit/completion. Exit here.
		process.exit(0);
	}

	// If we reach here, config is guaranteed to be defined.
	return config;
}
