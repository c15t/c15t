/**
 * The migrate command's control flow.
 *
 * The database work itself is tested against real Postgres, MySQL and SQLite
 * in `@c15t/backend`. What matters here is the decision-making around it,
 * because this is the one command that writes to a production database:
 *
 * - a blocked plan stops, and nothing is applied;
 * - an up-to-date database says so instead of prompting;
 * - declining the confirmation applies nothing;
 * - the pool is released whichever way the command exits.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { migrate } from './index';

const plan = vi.fn();
const apply = vi.fn();
const dispose = vi.fn(() => Promise.resolve());
const confirmApply = vi.fn();

const dependencies = {
	confirmApply,
	createMigrator: vi.fn(() => ({ apply, dispose, plan })),
	describePlan: vi.fn(),
	ensureBackendConfig: vi.fn(() =>
		Promise.resolve({
			dependencies: [],
			path: '/abs/c15t-backend.config.ts',
		})
	),
	installDependencies: vi.fn(() => Promise.resolve()),
	isUpToDate: (report: { adoption: unknown[]; pending: unknown[] }) =>
		report.adoption.length === 0 && report.pending.length === 0,
	readDatabaseConfig: vi.fn(() =>
		Promise.resolve({
			dialect: 'postgres',
			url: 'postgres://localhost/c15t',
		})
	),
};

const DATABASE_CLASSIFICATION_KEY = 'shape';
const assignInOrder = Object.assign;

const report = (over: Record<string, unknown> = {}) =>
	assignInOrder(
		{},
		{ [DATABASE_CLASSIFICATION_KEY]: { _tag: 'Empty' } },
		{ adoption: ['Create "subject"'] },
		{ pending: ['2-hot-path-indexes'] },
		{ retained: [] },
		{ blocked: undefined },
		{ applied: false },
		over
	);

const createMockContext = function createMockContext() {
	return {
		cwd: '/tmp/project',
		logger: {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			message: vi.fn(),
			note: vi.fn(),
			success: vi.fn(),
		},
		telemetry: { trackEvent: vi.fn() },
	} as unknown as Parameters<typeof migrate>[0];
};

describe('migrate command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		confirmApply.mockResolvedValue(true);
		plan.mockResolvedValue(report());
		apply.mockResolvedValue(report({ applied: true }));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns early when there is no backend config', async () => {
		(
			dependencies.ensureBackendConfig as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(null);
		const context = createMockContext();

		await migrate(context, dependencies);

		expect(context.logger.error).toHaveBeenCalledWith(
			'No backend config found.'
		);
		expect(dependencies.readDatabaseConfig).not.toHaveBeenCalled();
	});

	it('plans before applying', async () => {
		const context = createMockContext();
		await migrate(context, dependencies);

		expect(plan).toHaveBeenCalledTimes(1);
		expect(apply).toHaveBeenCalledTimes(1);
		// The dry run has to come first, or the operator is confirming a plan
		// that already ran.
		expect(plan.mock.invocationCallOrder[0] as number).toBeLessThan(
			apply.mock.invocationCallOrder[0] as number
		);
	});

	it('applies nothing when the plan is blocked', async () => {
		plan.mockResolvedValue(
			report({ blocked: 'Refusing to migrate an unrecognised database.' })
		);
		const context = createMockContext();

		await migrate(context, dependencies);

		expect(apply).not.toHaveBeenCalled();
		expect(context.logger.error).toHaveBeenCalledWith(
			expect.stringContaining('unrecognised')
		);
	});

	it('does not prompt when the database is already up to date', async () => {
		plan.mockResolvedValue(report({ adoption: [], pending: [] }));
		const context = createMockContext();

		await migrate(context, dependencies);

		expect(confirmApply).not.toHaveBeenCalled();
		expect(apply).not.toHaveBeenCalled();
		expect(context.logger.success).toHaveBeenCalledWith(
			expect.stringContaining('already up to date')
		);
	});

	it('applies nothing when the operator declines', async () => {
		confirmApply.mockResolvedValue(false);
		const context = createMockContext();

		await migrate(context, dependencies);

		expect(apply).not.toHaveBeenCalled();
	});

	it('releases the pool even when planning throws', async () => {
		plan.mockRejectedValue(new Error('connection refused'));
		const context = createMockContext();

		await expect(migrate(context, dependencies)).rejects.toThrow(
			'connection refused'
		);

		// A CLI process holding a pool open does not exit.
		expect(dispose).toHaveBeenCalledTimes(1);
	});
});
