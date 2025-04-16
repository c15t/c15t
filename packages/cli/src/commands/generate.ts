import path from 'node:path';
import * as p from '@clack/prompts';
import color from 'picocolors';
import logger from '~/utils/logger';
import { generateSchema } from './generate/schema';
import { setupGenerateEnvironment } from './generate/setup';
import { writeSchemaFile } from './generate/write';

export async function generate(args: string[]) {
	logger.info('Starting generate command...');
	logger.debug('Raw args for generate:', args);
	try {
		// 1. Setup environment (args, config, adapter, onboarding)
		const { options, config, adapter } = await setupGenerateEnvironment(args);

		// If setup completes, we have valid options, config, and adapter

		// 2. Generate the schema content
		const schemaResult = await generateSchema(adapter, config, options.output);

		// 3. Write the schema to file (handles confirmations)
		if (schemaResult) {
			// Resolve cwd from options for writing
			const cwd = path.resolve(options.cwd);
			await writeSchemaFile(schemaResult, options, cwd);
		}
		// If schemaResult is null, generateSchema already handled logging/outro
	} catch (error) {
		// Catch unexpected errors during the setup/schema/write sequence
		p.log.error('An unexpected error occurred during the generation process:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Generation process failed unexpectedly.')}`);
		process.exit(1); // Exit with error for unexpected failures
	}
}
