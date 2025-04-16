import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import type { Adapter } from '@c15t/backend/pkgs/db-adapters';
import * as p from '@clack/prompts';
import color from 'picocolors';

import { getGenerator } from '../../generators';

export type SchemaResult = Awaited<ReturnType<typeof getGenerator>>;

/**
 * Calls the schema generator and handles associated errors.
 */
export async function generateSchema(
	adapter: Adapter,
	config: C15TOptions<C15TPlugin[]>,
	outputFile: string | undefined
): Promise<SchemaResult | null> {
	const s = p.spinner();
	s.start('Preparing schema...');

	try {
		const schema = await getGenerator({
			adapter,
			file: outputFile,
			options: config,
		});
		s.stop('Schema prepared.');
		return schema;
	} catch (error) {
		s.stop('Schema preparation failed.');
		p.log.error('Failed to prepare schema:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Generation failed.')}`);
		return null; // Indicate failure
	}
}
