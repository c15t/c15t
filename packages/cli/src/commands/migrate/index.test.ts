import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@c15t/backend/v2/pkgs/migrator', () => ({
	migrator: vi.fn(async () => ({ execute: vi.fn(), getSQL: vi.fn() })),
}));
vi.mock('./ensure-backend-config', () => ({
	ensureBackendConfig: vi.fn(async () => '/abs/c15t-backend.config.ts'),
}));
vi.mock('./read-config', () => ({
	readConfigAndGetDb: vi.fn(async () => ({ db: {}, adapter: 'kysely' })),
}));
vi.mock('./migrator-result', () => ({
	handleMigrationResult: vi.fn(async (..._args: unknown[]) => undefined),
}));
vi.mock('./orm-result', () => ({
	handleORMResult: vi.fn(async (..._args: unknown[]) => undefined),
}));

import { migrator } from '../../../../backend/dist/v2/db/migrator';
import { ensureBackendConfig } from './ensure-backend-config';
import { migrate } from './index';
import { handleMigrationResult } from './migrator-result';
import { handleORMResult } from './orm-result';
import { readConfigAndGetDb } from './read-config';

function createMockContext() {
	return {
		cwd: '/tmp/project',
		logger: {
			info: vi.fn(),
			error: vi.fn(),
		},
		telemetry: { trackEvent: vi.fn() },
	} as unknown as Parameters<typeof migrate>[0];
}

describe('migrate command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns early when ensureBackendConfig yields null', async () => {
		(
			ensureBackendConfig as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(null);
		const context = createMockContext();
		await migrate(context);
		expect(context.logger.error).toHaveBeenCalledWith(
			'No backend config found.'
		);
		expect(readConfigAndGetDb).not.toHaveBeenCalled();
	});

	it('loads config, runs migrator, and handles MigrationResult path without path', async () => {
		(migrator as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			execute: vi.fn(),
			getSQL: vi.fn(),
		});
		const context = createMockContext();
		await migrate(context);
		expect(ensureBackendConfig).toHaveBeenCalled();
		expect(readConfigAndGetDb).toHaveBeenCalled();
		expect(migrator).toHaveBeenCalled();
		expect(handleMigrationResult).toHaveBeenCalled();
		expect(handleORMResult).not.toHaveBeenCalled();
	});

	it('delegates to handleORMResult when migrator returns ORMResult with path', async () => {
		(migrator as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			path: 'migrations/001.sql',
			code: 'CREATE TABLE test(id INT);',
		});
		const context = createMockContext();
		await migrate(context);
		expect(handleORMResult).toHaveBeenCalled();
		expect(handleMigrationResult).not.toHaveBeenCalled();
	});
});
