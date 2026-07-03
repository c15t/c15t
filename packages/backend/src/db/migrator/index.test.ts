import { describe, expect, it, vi } from 'vitest';
import { DB, NamingMismatchError } from '../schema';
import { exportNameVariantsForVersion } from '../schema/naming';
import { migrator } from './index';

type MigrationEngine = ReturnType<
	ReturnType<(typeof DB)['client']>['createMigrator']
>;

const createEngine = (
	overrides: Partial<MigrationEngine> = {}
): MigrationEngine =>
	({
		getVersion: vi.fn(async () => '2.0.0'),
		getNameVariants: vi.fn(async () => undefined),
		next: vi.fn(),
		previous: vi.fn(),
		up: vi.fn(),
		down: vi.fn(),
		migrateTo: vi.fn(),
		migrateToLatest: vi.fn(async () => ({
			operations: [],
			execute: vi.fn(async () => undefined),
		})),
		...overrides,
	}) as MigrationEngine;

const createDb = (
	engine: MigrationEngine,
	variants?: Record<string, { sql: string; mongodb: string }>
) => {
	const adapter = {
		name: 'kysely',
		createORM: vi.fn(),
		getSchemaVersion: vi.fn(async () => '2.0.0'),
		createMigrationEngine: vi.fn(() => engine),
	};
	const factory = variants ? DB.names(variants) : DB;
	return factory.client(adapter as Parameters<(typeof DB)['client']>[0]);
};

const getStoredNameVariants = () => {
	const engine = createEngine();
	const db = createDb(engine);
	const variants = exportNameVariantsForVersion(db.schemas, '2.0.0');
	if (!variants) {
		throw new Error('expected test DB to export 2.0.0 name variants');
	}
	return variants;
};

describe('migrator naming guard', () => {
	it('runs migrations when persisted names match the configured DB factory', async () => {
		const stored = getStoredNameVariants();
		const migrationResult = {
			operations: [],
			execute: vi.fn(async () => undefined),
		};
		const engine = createEngine({
			getNameVariants: vi.fn(async () => stored),
			migrateToLatest: vi.fn(async () => migrationResult),
		});
		const db = createDb(engine);

		await expect(migrator({ db, schema: 'latest' })).resolves.toBe(
			migrationResult
		);
		expect(engine.migrateToLatest).toHaveBeenCalledWith({
			mode: 'from-schema',
		});
	});

	it('fails closed when persisted names differ from the configured DB factory', async () => {
		const stored = getStoredNameVariants();
		const engine = createEngine({
			getNameVariants: vi.fn(async () => stored),
		});
		const db = createDb(engine, {
			consent: { sql: 'consents', mongodb: 'consents' },
		});

		await expect(migrator({ db, schema: 'latest' })).rejects.toThrow(
			NamingMismatchError
		);
		await expect(migrator({ db, schema: 'latest' })).rejects.toThrow(
			/Stored fingerprint:/
		);
		expect(engine.migrateToLatest).not.toHaveBeenCalled();
	});

	it('adopts current names by returning only FumaDB settings operations', async () => {
		const stored = getStoredNameVariants();
		const settingsNameVariantOperation = {
			type: 'custom',
			sql: "update private_c15t_settings set value = '{}' where key = 'name-variants'",
		};
		const settingsVersionOperation = {
			type: 'custom',
			sql: "update private_c15t_settings set value = '2.0.0' where key = 'version'",
		};
		const operations = [
			{ type: 'rename-table', from: 'consent', to: 'consents' },
			settingsNameVariantOperation,
			settingsVersionOperation,
		];
		const executedOperations: unknown[] = [];
		const adoptionResult = {
			operations,
			execute: vi.fn(async () => {
				executedOperations.push(...operations);
			}),
		};
		const engine = createEngine({
			getNameVariants: vi.fn(async () => stored),
			migrateTo: vi.fn(async () => adoptionResult),
		});
		const db = createDb(engine, {
			consent: { sql: 'consents', mongodb: 'consents' },
		});

		const result = await migrator({
			db,
			schema: 'latest',
			namingMismatch: 'adopt-current',
		});

		expect(engine.migrateTo).toHaveBeenCalledWith('2.0.0', {
			mode: 'from-schema',
		});
		expect('operations' in result ? result.operations : []).toEqual([
			settingsNameVariantOperation,
			settingsVersionOperation,
		]);
		if ('operations' in result) {
			await result.execute();
		}
		expect(executedOperations).toEqual([
			settingsNameVariantOperation,
			settingsVersionOperation,
		]);
		expect(engine.migrateToLatest).not.toHaveBeenCalled();
	});
});
