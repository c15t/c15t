import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import type { SchemaResult } from '../schema';
import { performWriteAction } from './perform-write-action';

/**
 * Handles the logic for confirming and overwriting/appending to an existing schema file.
 */
export async function handleExistingFile(
	context: CliContext,
	schema: SchemaResult,
	filePath: string
): Promise<void> {
	const { logger, flags } = context;

	logger.warn(`Schema file already exists: ${color.yellow(filePath)}`);

	let action: 'overwrite' | 'append' | 'skip' = 'skip';
	let proceed = flags.y as boolean;

	if (schema.overwrite) {
		action = 'overwrite';
	} else if (schema.append) {
		action = 'append';
	}

	const forcedAction = action !== 'skip';

	if (forcedAction && proceed) {
		logger.debug(
			`Proceeding with forced action '${action}' due to flags and -y.`
		);
	} else if (forcedAction && !proceed) {
		const confirmMessage =
			action === 'overwrite'
				? `Overwrite existing file ${color.cyan(schema.fileName)}?`
				: `Append to existing file ${color.cyan(schema.fileName)}?`;
		proceed = await context.confirm(confirmMessage, false);
	} else if (!forcedAction) {
		const selectedAction = await p.select({
			message: `File ${color.yellow(filePath)} already exists. What would you like to do?`,
			options: [
				{
					value: 'overwrite',
					label: 'Overwrite',
					hint: 'Replace the entire file',
				},
				{
					value: 'append',
					label: 'Append',
					hint: 'Add new content to the end',
				},
				{ value: 'skip', label: 'Skip', hint: 'Do not modify the file' },
			],
		});

		if (p.isCancel(selectedAction)) {
			proceed = false;
			action = 'skip';
		} else {
			action = selectedAction as 'overwrite' | 'append' | 'skip';
			proceed = action !== 'skip';
		}
	}

	if (proceed && action !== 'skip') {
		try {
			if (!schema.code) {
				logger.error('Cannot write empty schema content.');
				p.log.error('Cannot write empty schema content.');
				p.outro('Generation failed.');
				return;
			}
			const writeMode = action === 'overwrite' ? 'overwrite' : 'append';
			logger.info(`Proceeding to ${writeMode} file: ${filePath}`);
			await performWriteAction(
				context,
				filePath,
				schema.code,
				`${action === 'overwrite' ? 'Overwriting' : 'Appending to'} ${color.cyan(schema.fileName)}...`,
				`🚀 Schema was ${action === 'overwrite' ? 'overwritten' : 'appended'} successfully!`
			);
			p.outro('Generation complete.');
		} catch {
			logger.debug('performWriteAction caught error (handled internally)');
		}
	} else {
		logger.warn('Schema generation skipped for existing file.');
		p.log.warning('Action skipped for existing file.');
		p.outro('Generation cancelled or skipped.');
	}
}
