import fs from 'node:fs/promises';
import path from 'node:path';
import type { defineConfig } from '@c15t/backend/v2';
import { createJiti } from 'jiti';
import type { CliContext } from '~/context/types';

type BackendConfigReturn = ReturnType<typeof defineConfig>;
type DatabaseClient = BackendConfigReturn['client'];

export async function readConfigAndGetDb(
	context: CliContext,
	absoluteConfigPath: string
) {
	// ): Promise<DatabaseClient> {
	const { logger } = context;
	const resolvedPath = path.resolve(absoluteConfigPath);

	logger.debug(`Reading backend config from: ${resolvedPath}`);

	try {
		await fs.access(resolvedPath);
	} catch {
		throw new Error(`Backend config not found at: ${resolvedPath}`);
	}

	try {
		const jiti = createJiti(import.meta.url, {
			interopDefault: true,
			jsx: true,
			debug: true,
			moduleCache: false,
			transformModules: ['@c15t/backend', '@c15t/backend/v2'],
		});

		logger.debug('Jiti Created');

		const exported = await jiti.import(absoluteConfigPath, {
			default: true,
		});

		logger.debug('Imported Config');

		// if (!exported || typeof exported !== 'object') {
		// 	throw new Error('Invalid backend config export');
		// }

		// const client = (exported as { client?: DatabaseClient }).client;
		// if (!client) {
		// 	throw new Error(
		// 		'Invalid backend config: expected default export to be the result of defineConfig({...}) with a client property.'
		// 	);
		// }

		// logger.debug('Backend config loaded and client created.');
		// return client;
	} catch (error) {
		logger.error('Failed to load backend config', error);
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Unknown error loading backend config: ${String(error)}`);
	}
}
