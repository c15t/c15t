import type { C15TOptions } from '@c15t/backend';
import type { Adapter } from '@c15t/backend/pkgs/db-adapters';
import { drizzleAdapter } from '@c15t/backend/pkgs/db-adapters/adapters/drizzle-adapter';
import { kyselyAdapter } from '@c15t/backend/pkgs/db-adapters/adapters/kysely-adapter';
import { prismaAdapter } from '@c15t/backend/pkgs/db-adapters/adapters/prisma-adapter';
import type { PrismaConfig } from '@c15t/backend/pkgs/db-adapters/adapters/prisma-adapter';

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { generateDrizzleSchema } from '../src/commands/generate/generators/drizzle';
import { generateMigrations } from '../src/commands/generate/generators/kysely';
import { generatePrismaSchema } from '../src/commands/generate/generators/prisma';

// Set constant timestamp for tests to ensure consistent snapshots
const TEST_TIMESTAMP = '2023-01-01T00:00:00.000Z';

// Define a test options type that extends C15TOptions for testing purposes
interface TestOptions extends C15TOptions {
	_testTimestamp?: string;
}

type AdapterConfig = PrismaConfig;

type AdapterFactory = (
	db: unknown,
	config: AdapterConfig
) => (options: C15TOptions) => Adapter;

describe('generate', () => {
	// Helper function to create adapter configuration
	const createAdapter = (
		adapterFn: unknown,
		provider: string,
		additionalOptions = {}
	): Adapter => {
		const config = {
			provider,
			...additionalOptions,
		} as AdapterConfig;

		return (adapterFn as AdapterFactory)({}, config)({} as C15TOptions);
	};

	// Prisma schema generation tests
	describe('prisma schema generation', () => {
		const prismaTestCases = [
			{
				provider: 'postgresql',
				filePath: 'prisma/pg.prisma',
				snapshotPath: './__snapshots__/prisma/pg.prisma',
			},
			{
				provider: 'mysql',
				filePath: 'prisma/mysql.prisma',
				snapshotPath: './__snapshots__/prisma/mysql.prisma',
			},
			{
				provider: 'sqlite',
				filePath: 'prisma/u.prisma',
				snapshotPath: './__snapshots__/prisma/sqlite.prisma',
			},
		] as const;

		it.each(prismaTestCases)(
			'should generate prisma schema for $provider',
			async ({ provider, filePath, snapshotPath }) => {
				const adapter = createAdapter(prismaAdapter, provider);

				const schema = await generatePrismaSchema({
					file: filePath,
					adapter,
					options: {
						database: prismaAdapter(
							{},
							{ provider: provider as 'postgresql' | 'mysql' | 'sqlite' }
						),
					},
				});

				await expect(schema.code).toMatchFileSnapshot(snapshotPath);
			}
		);
	});

	// Drizzle schema generation tests
	describe('drizzle schema generation', () => {
		const drizzleTestCases = [
			{ provider: 'pg', snapshotPath: './__snapshots__/drizzle/pg.txt' },
			{ provider: 'mysql', snapshotPath: './__snapshots__/drizzle/mysql.txt' },
			{
				provider: 'sqlite',
				snapshotPath: './__snapshots__/drizzle/sqlite.txt',
			},
		] as const;

		it.each(drizzleTestCases)(
			'should generate drizzle schema for $provider',
			async ({ provider, snapshotPath }) => {
				const adapter = createAdapter(drizzleAdapter, provider, { schema: {} });

				const schema = await generateDrizzleSchema({
					file: 'test.drizzle',
					adapter,
					options: {
						database: drizzleAdapter(
							{},
							{ provider: provider as 'pg' | 'mysql' | 'sqlite' }
						),
					},
				});

				await expect(schema.code).toMatchFileSnapshot(snapshotPath);
			}
		);
	});

	// Kysely schema generation tests
	describe('kysely schema generation', () => {
		const kyselyTestCases = [
			{
				provider: 'sqlite',
				snapshotPath: './__snapshots__/kysely/sqlite.sql',
				getDatabase: () => new Database(':memory:'),
			},
			{
				provider: 'd1',
				snapshotPath: './__snapshots__/kysely/d1.sql',
				getDatabase: () => new Database(':memory:'),
			},
			{
				provider: 'postgresql',
				snapshotPath: './__snapshots__/kysely/postgresql.sql',
				getDatabase: () => new Database(':memory:'),
			},
			{
				provider: 'mysql',
				snapshotPath: './__snapshots__/kysely/mysql.sql',
				getDatabase: () => new Database(':memory:'),
			},
		] as const;

		it.each(kyselyTestCases)(
			'should generate kysely schema for $provider',
			async ({ provider, snapshotPath, getDatabase }) => {
				const adapter = createAdapter(kyselyAdapter, provider, { schema: {} });

				// Set process.env.NODE_ENV to 'test' to trigger fixed timestamp
				const originalNodeEnv = process.env.NODE_ENV;
				process.env.NODE_ENV = 'test';

				try {
					const schema = await generateMigrations({
						file: `test-${provider}.sql`,
						adapter,
						options: {
							database: getDatabase(),
							_testTimestamp: TEST_TIMESTAMP,
						} as TestOptions,
					});

					await expect(schema.code).toMatchFileSnapshot(snapshotPath);
				} finally {
					// Restore original NODE_ENV
					process.env.NODE_ENV = originalNodeEnv;
				}
			}
		);
	});
});
