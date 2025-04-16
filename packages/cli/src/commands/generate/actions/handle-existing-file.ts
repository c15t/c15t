import * as p from '@clack/prompts';
import color from 'picocolors';

import { confirmAction } from '~/actions/confirm-action';
import { performWriteAction } from '~/actions/perform-write-action'; // New import

import type { SchemaResult } from '../schema';
import type { GenerateOptions } from '../setup';
/**
 * Handles the logic when the schema file already exists (overwrite/append).
 */
export async function handleExistingFile(
	schema: SchemaResult,
	options: GenerateOptions,
	filePath: string
): Promise<void> {
	let proceed = options.y;
	const action = schema.overwrite ? 'overwrite' : 'append';

	if (!proceed) {
		proceed = await confirmAction(
			`The file ${color.cyan(schema.fileName)} already exists. Do you want to ${color.yellow(action)} it?`,
			false
		);
	}

	if (proceed) {
		const description = `${action === 'overwrite' ? 'Overwriting' : 'Appending'} file ${color.cyan(schema.fileName)}...`;
		const successMsg = `🚀 Schema was ${action === 'overwrite' ? 'overwritten' : 'appended'} successfully!`;
		try {
			if (!schema.code) {
				// Should ideally not happen if checked before calling, but safe guard.
				p.log.error('Cannot write empty schema content.');
				p.outro('Generation failed.');
				return;
			}
			if (schema.overwrite) {
				await performWriteAction(
					filePath,
					schema.code,
					description,
					successMsg
				);
			} else {
				// Append logic still needs refinement if truly needed.
				// Currently performWrite overwrites.
				p.log.warning('Append operation currently overwrites the file.');
				await performWriteAction(
					filePath,
					schema.code,
					description,
					successMsg
				);
			}
			p.outro('Generation complete.');
		} catch {
			// Error handled in performWrite
		}
	} else {
		p.log.warning('Schema generation aborted by user.');
		p.outro('Generation cancelled.');
	}
}
