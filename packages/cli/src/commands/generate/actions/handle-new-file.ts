
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import type { SchemaResult } from '../schema';
import { performWriteAction } from './perform-write-action';

/**
 * Handles the logic for confirming and writing a new schema file.
 */
export async function handleNewFile(
	context: CliContext,
	schema: SchemaResult,
	filePath: string
): Promise<void> {
	const { logger, flags, error } = context;
	let proceed = flags.y as boolean;

	if (!proceed) {
		logger.debug('Requesting confirmation to write new file');
		proceed = await context.confirm(
			`Generate the schema to ${color.cyan(schema.fileName)}?`,
			true
		);
	}

	if (proceed) {
		if (!schema.code) {
			return error.handleError(
				new Error('Empty schema content'),
				'Cannot write empty schema content'
			);
		}

		logger.info(`Proceeding to write new file: ${filePath}`);
		await performWriteAction(
			context,
			filePath,
			schema.code,
			`Writing schema to ${color.cyan(schema.fileName)}...`,
			'🚀 Schema was generated successfully!'
		);
		logger.success('Generation complete.');
	} else {
		logger.warn('Schema generation aborted by user.');
		logger.failed('Generation cancelled.');
	}
}
