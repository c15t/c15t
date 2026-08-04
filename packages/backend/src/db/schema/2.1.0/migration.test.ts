import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { kyselyAdapter } from '~/db/adapters/kysely';
import { DB } from '~/db/schema';

describe('database schema 2.1.0 migration', () => {
	let database: Kysely<Record<string, never>>;
	let client: ReturnType<(typeof DB)['client']>;
	let destructiveOperations: string[];
	let addedScopeKeyConstraint: boolean;
	let createdReplayTable: boolean;

	beforeAll(async () => {
		const pglite = await KyselyPGlite.create();
		database = new Kysely({ dialect: pglite.dialect });
		client = DB.client(
			kyselyAdapter({
				db: database,
				provider: 'postgresql',
			})
		);

		const initialMigration = await client
			.createMigrator()
			.migrateTo('2.0.0', { mode: 'from-database' });
		await initialMigration.execute();

		const oldOrm = client.orm('2.0.0');
		await oldOrm.create('subject', {
			id: 'sub_legacy',
			externalId: null,
			identityProvider: 'anonymous',
		});
		await oldOrm.create('domain', {
			id: 'dom_legacy',
			name: 'legacy.example',
		});
		await oldOrm.create('consent', {
			id: 'cns_legacy',
			subjectId: 'sub_legacy',
			domainId: 'dom_legacy',
			policyId: null,
			purposeIds: { json: [] },
		});

		const migration = await client
			.createMigrator()
			.migrateTo('2.1.0', { mode: 'from-schema' });
		destructiveOperations = migration.operations.flatMap((operation) => {
			if (operation.type === 'update-table') {
				return operation.value
					.filter((column) => column.type !== 'create-column')
					.map((column) => `${operation.type}:${column.type}`);
			}

			return [
				'create-table',
				'add-foreign-key',
				'add-unique-constraint',
				// FumaDB emits custom operations for its version metadata.
				'custom',
			].includes(operation.type)
				? []
				: [operation.type];
		});
		addedScopeKeyConstraint = migration.operations.some(
			(operation) =>
				operation.type === 'add-unique-constraint' &&
				operation.table === 'domain' &&
				operation.columns.includes('scopeKey')
		);
		createdReplayTable = migration.operations.some(
			(operation) =>
				operation.type === 'create-table' &&
				operation.value.ormName === 'writeReplay'
		);
		await migration.execute();
	}, 30_000);

	afterAll(async () => {
		await database.destroy();
	});

	it('uses an additive-only migration', () => {
		expect(destructiveOperations).toEqual([]);
		expect(addedScopeKeyConstraint).toBe(true);
		expect(createdReplayTable).toBe(true);
	});

	it('preserves legacy records with nullable integrity fields', async () => {
		const orm = client.orm('2.1.0');
		const consent = await orm.findFirst('consent', {
			where: (builder) => builder('id', '=', 'cns_legacy'),
		});
		const domain = await orm.findFirst('domain', {
			where: (builder) => builder('id', '=', 'dom_legacy'),
		});

		expect(consent).toMatchObject({
			writeSource: null,
			writeCredentialId: null,
			writeIssuer: null,
			writeOrigin: null,
		});
		expect(domain?.scopeKey).toBeNull();
	});

	it('allows legacy null scope keys but rejects duplicate canonical keys', async () => {
		const orm = client.orm('2.1.0');
		await orm.create('domain', {
			id: 'dom_null_scope',
			name: 'another-legacy.example',
			scopeKey: null,
		});
		await orm.create('domain', {
			id: 'dom_canonical',
			name: 'canonical.example',
			scopeKey: 'tenant_1:canonical.example',
		});

		await expect(
			orm.create('domain', {
				id: 'dom_duplicate',
				name: 'CANONICAL.example',
				scopeKey: 'tenant_1:canonical.example',
			})
		).rejects.toBeDefined();
	});

	it('atomically rejects a consumed replay key', async () => {
		const orm = client.orm('2.1.0');
		const replay = {
			id: 'replay_credential_1',
			tenantId: 'tenant_1',
			audience: 'subject_1',
			tokenId: 'credential_1',
			requestFingerprint: 'sha256:fingerprint',
			expiresAt: new Date('2030-01-01T00:00:00.000Z'),
		};

		await orm.create('writeReplay', replay);
		await expect(orm.create('writeReplay', replay)).rejects.toBeDefined();
	});
});
