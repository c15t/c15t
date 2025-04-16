import * as p from '@clack/prompts';
import color from 'picocolors';

import { confirmAction } from '~/actions/confirm-action';

import type { SchemaResult } from '../schema';
import type { GenerateOptions } from '../setup';
import { performWriteAction } from './perform-write-action';

/**
 * Handles the logic for confirming and writing a new schema file.
 */
export async function handleNewFile(
	schema: SchemaResult,
	options: GenerateOptions,
	filePath: string
): Promise<void> {
	let proceed = options.y;

	if (!proceed) {
		proceed = await confirmAction(
			`Generate the schema to ${color.cyan(schema.fileName)}?`,
			true
		);
	}

	if (proceed) {
		try {
			if (!schema.code) {
				// Add safeguard
				p.log.error('Cannot write empty schema content.');
				p.outro('Generation failed.');
				return;
			}
			await performWriteAction(
				filePath,
				schema.code,
				`Writing schema to ${color.cyan(schema.fileName)}...`,
				'🚀 Schema was generated successfully!'
			);
			p.outro('Generation complete.');
		} catch {
			// Error handled in performWrite
		}
	} else {
		p.log.warning('Schema generation aborted by user.');
		p.outro('Generation cancelled.');
	}
}
