import { BASE_ERROR_CODES, C15TError } from '~/error';
import type { C15TOptions } from '~/types';
import { logger } from '../utils';
import { kyselyAdapter } from './adapters/kysely-adapter';
import { createKyselyAdapter } from './adapters/kysely-adapter/dialect';
import { memoryAdapter } from './adapters/memory-adapter';
import type { Adapter } from './adapters/types';
import { getConsentTables } from './index';

export async function getAdapter(options: C15TOptions): Promise<Adapter> {
	if (!options.database) {
		const tables = getConsentTables(options);
		const memoryDB = Object.keys(tables).reduce<Record<string, unknown[]>>(
			(acc, key) => {
				acc[key] = [];
				return acc;
			},
			{}
		);
		logger.warn(
			'No database configuration provided. Using memory adapter in development'
		);
		return memoryAdapter(memoryDB as Record<string, Record<string, unknown>[]>)(
			options
		);
	}

	if (typeof options.database === 'function') {
		return options.database(options);
	}

	const { kysely, databaseType } = await createKyselyAdapter(options);
	if (!kysely) {
		throw new C15TError('Failed to initialize database adapter', {
			code: BASE_ERROR_CODES.INTERNAL_SERVER_ERROR,
			status: 500,
		});
	}
	return kyselyAdapter(kysely, {
		type: databaseType || 'sqlite',
	})(options);
}
