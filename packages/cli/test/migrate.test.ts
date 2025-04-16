import { type C15TPlugin, c15tInstance } from '@c15t/backend';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as config from '../src/actions/get-config';
import { migrate } from '../src/commands/migrate';

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
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should migrate the database', async () => {
		await migrate(['--config', 'test/c15t.ts', '-y']);
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
	});

	afterEach(async () => {
		vi.restoreAllMocks();
	});

	it('should migrate the database and sign-up a subject', async () => {
		await migrate(['--config', 'test/c15t.ts', '-y']);
		const res = db
			.prepare('INSERT INTO plugin (id, test) VALUES (?, ?)')
			.run('1', 'test');
		expect(res.changes).toBe(1);
	});
});
