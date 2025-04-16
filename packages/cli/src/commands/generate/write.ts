import { existsSync } from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';

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
	if (!schema || !schema.code) {
		p.log.info('Your schema is already up to date.');
		p.outro('Nothing to generate.');
		return;
	}

	const filePath = options.output || path.join(cwd, schema.fileName);
	const fileExists = existsSync(filePath);

	if (fileExists) {
		await handleExistingFile(schema, options, filePath);
	} else {
		await handleNewFile(schema, options, filePath);
	}
}
