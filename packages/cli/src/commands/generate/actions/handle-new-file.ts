import * as p from '@clack/prompts';
import color from 'picocolors';
import { confirmAction } from '~/actions/confirm-action';
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
	const { logger, flags } = context;
	let proceed = flags.y as boolean;

	if (!proceed) {
		logger.debug('Requesting confirmation to write new file');
		proceed = await confirmAction(
			context,
			`Generate the schema to ${color.cyan(schema.fileName)}?`,
			true
		);
	}

	if (proceed) {
		try {
			if (!schema.code) {
				logger.error('Cannot write empty schema content.');
				p.log.error('Cannot write empty schema content.');
				p.outro('Generation failed.');
				return;
			}
			logger.info(`Proceeding to write new file: ${filePath}`);
			await performWriteAction(
				context,
				filePath,
				schema.code,
				`Writing schema to ${color.cyan(schema.fileName)}...`,
				'🚀 Schema was generated successfully!'
			);
			p.outro('Generation complete.');
		} catch {
			logger.debug('performWriteAction caught error (handled internally)');
			// Error handled in performWrite
		}
	} else {
		logger.warn('Schema generation aborted by user confirmation.');
		p.log.warning('Schema generation aborted by user.');
		p.outro('Generation cancelled.');
	}
}
