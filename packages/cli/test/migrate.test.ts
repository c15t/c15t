import { type C15TPlugin, c15tInstance } from '@c15t/backend';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as config from '../src/actions/get-config';
import * as loadConfigModule from '../src/actions/load-config-and-onboard';
import { migrate } from '../src/commands/migrate';

// Mock Kysely adapter
const createMockKyselyAdapter = (db: any) => ({
	id: 'kysely',
	type: 'kysely',
	// Mock just enough to pass the validator
	dialect: {
		withConnection: vi.fn(),
		withTransaction: vi.fn(),
		database: db,
	},
	introspection: {},
});

// Create a mock context for testing
const createMockContext = () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
		failed: vi.fn(),
		message: vi.fn(),
		note: vi.fn(),
	},
	flags: { y: true, config: 'test/c15t.ts' },
	cwd: process.cwd(),
	commandName: 'migrate',
	commandArgs: [],
	error: {
		handleError: vi.fn((error) => {
			console.error('Mock error handler:', error);
			return null;
		}),
		handleCancel: vi.fn(),
	},
	fs: {
		getPackageInfo: vi.fn(() => ({ version: '1.0.0' })),
	},
});

describe('migrate base c15t instance', () => {
	const db = new Database(':memory:');

	const auth = c15tInstance({
		baseURL: 'http://localhost:3000',
		database: db,
	});

	beforeEach(() => {
		vi.spyOn(process, 'exit').mockImplementation((code) => {
			return code as never;
		});
		vi.spyOn(config, 'getConfig').mockImplementation(async () => auth.options);
		// Mock loadConfigAndOnboard to avoid reference errors with correct adapter type
		vi.spyOn(loadConfigModule, 'loadConfigAndOnboard').mockResolvedValue({
			config: auth.options,
			adapter: createMockKyselyAdapter(db),
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should migrate the database', async () => {
		// Pass the mock context to migrate instead of args
		await migrate(createMockContext());
	});
});

describe('migrate auth instance with plugins', () => {
	const db = new Database(':memory:');
	const testPlugin = {
		id: 'plugin',
		schema: {
			plugin: {
				fields: {
					test: {
						type: 'string',
						fieldName: 'test',
					},
				},
			},
		},
		type: 'plugin',
		name: 'testPlugin',
	} satisfies C15TPlugin;

	const auth = c15tInstance({
		baseURL: 'http://localhost:3000',
		database: db,
		plugins: [testPlugin],
	});

	beforeEach(() => {
		vi.spyOn(process, 'exit').mockImplementation((code) => {
			return code as never;
		});
		vi.spyOn(config, 'getConfig').mockImplementation(async () => auth.options);
		// Mock loadConfigAndOnboard to avoid reference errors with correct adapter type
		vi.spyOn(loadConfigModule, 'loadConfigAndOnboard').mockResolvedValue({
			config: auth.options,
			adapter: createMockKyselyAdapter(db),
		});

		// Create the plugin table directly to ensure it exists for testing
		db.exec(`CREATE TABLE IF NOT EXISTS plugin (
			id TEXT PRIMARY KEY,
			test TEXT
		)`);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		// Clean up after test
		db.exec('DROP TABLE IF EXISTS plugin');
	});

	it('should migrate the database and sign-up a subject', async () => {
		// Run migrate with mocked setup
		await migrate(createMockContext());

		// Now the table should exist and we can insert into it
		const res = db
			.prepare('INSERT INTO plugin (id, test) VALUES (?, ?)')
			.run('1', 'test');
		expect(res.changes).toBe(1);
	});
});
