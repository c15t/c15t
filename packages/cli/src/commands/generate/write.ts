import { existsSync } from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import logger from '~/utils/logger';

import { handleExistingFile } from './actions/handle-existing-file';
import { handleNewFile } from './actions/handle-new-file';
import type { SchemaResult } from './schema';
import type { GenerateOptions } from './setup';

/**
 * Handles confirming and writing the generated schema to a file.
 * Acts as a decision tree, delegating to action handlers.
 */
export async function writeSchemaFile(
	schema: SchemaResult,
	options: GenerateOptions,
	cwd: string
): Promise<void> {
	logger.info('Determining how to write schema file...');
	logger.debug('Schema:', schema);
	logger.debug('Options:', options);
	logger.debug(`CWD: ${cwd}`);
	if (!schema || !schema.code) {
		logger.info('Schema is empty or up to date, nothing to write.');
		p.log.info('Your schema is already up to date.');
		p.outro('Nothing to generate.');
		return;
	}

	const filePath = options.output || path.join(cwd, schema.fileName);
	logger.debug(`Target file path: ${filePath}`);
	const fileExists = existsSync(filePath);
	logger.debug(`File exists: ${fileExists}`);

	if (fileExists) {
		logger.info(`File exists at ${filePath}, handling existing file.`);
		await handleExistingFile(schema, options, filePath);
	} else {
		logger.info(`File does not exist at ${filePath}, handling new file.`);
		await handleNewFile(schema, options, filePath);
	}
}
