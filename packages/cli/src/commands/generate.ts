import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';

import { generateSchema } from './generate/schema';
import { setupGenerateEnvironment } from './generate/setup';
import { writeSchemaFile } from './generate/write';

export async function generate(context: CliContext) {
	const { logger, cwd } = context;
	logger.info('Starting generate command...');
	logger.debug('Received context:', context);
	try {
		// 1. Setup environment (accepts context)
		const { config, adapter } = await setupGenerateEnvironment(context);

		// 2. Generate the schema content (accepts context)
		const schemaResult = await generateSchema(context, adapter, config);

		// 3. Write the schema to file (accepts context)
		if (schemaResult) {
			// writeSchemaFile gets cwd from context now
			await writeSchemaFile(context, schemaResult);
		}
		// If schemaResult is null, generateSchema already handled logging/outro
	} catch (error) {
		// Use logger from context
		logger.error(
			'An unexpected error occurred during the generation process:',
			error
		);
		p.log.error('An unexpected error occurred during the generation process:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Generation process failed unexpectedly.')}`);
		process.exit(1);
	}
}
