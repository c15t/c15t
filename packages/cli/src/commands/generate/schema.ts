import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import type { Adapter } from '@c15t/backend/pkgs/db-adapters';
import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { getGenerator } from './generators';

export type SchemaResult = Awaited<ReturnType<typeof getGenerator>>;

/**
 * Calls the schema generator and handles associated errors.
 */
export async function generateSchema(
	context: CliContext,
	adapter: Adapter,
	config: C15TOptions<C15TPlugin[]>
): Promise<SchemaResult | null> {
	const { logger, flags } = context;
	const s = p.spinner();
	s.start('Preparing schema...');
	logger.info('Generating schema...');
	logger.debug('Adapter:', adapter);
	logger.debug('Config:', config);
	logger.debug(
		`Output file hint (from flags): ${flags.output as string | undefined}`
	);

	try {
		logger.debug('Calling getGenerator...');
		const schema = await getGenerator(context, {
			adapter,
			file: flags.output as string | undefined,
			options: config,
		});
		logger.debug('Schema generation result:', schema);
		s.stop('Schema prepared.');
		return schema;
	} catch (error) {
		logger.error('Error during schema generation:', error);
		s.stop('Schema preparation failed.');
		p.log.error('Failed to prepare schema:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Generation failed.')}`);
		return null;
	}
}
