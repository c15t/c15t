import type { MigrateReport } from '@c15t/backend';
import { describe, expect, it, vi } from 'vitest';

import { describePlan } from './report';

const createContext = () =>
	({
		logger: {
			info: vi.fn(),
			message: vi.fn(),
			note: vi.fn(),
			warn: vi.fn(),
		},
	}) as unknown as Parameters<typeof describePlan>[0];

const DATABASE_CLASSIFICATION_KEY = 'shape';

const report = (drift: string[]) =>
	({
		[DATABASE_CLASSIFICATION_KEY]: { _tag: 'Baseline' },
		adoption: [],
		applied: false,
		blocked: undefined,
		drift,
		pending: [],
		retained: [],
	}) as unknown as MigrateReport;

describe('describePlan', () => {
	it('warns about drift on a database that is otherwise up to date', () => {
		const context = createContext();

		describePlan(context, report(['missing dedupe index']));

		expect(context.logger.warn).toHaveBeenCalledWith('missing dedupe index');
	});

	it('stays quiet without drift', () => {
		const context = createContext();

		describePlan(context, report([]));

		expect(context.logger.warn).not.toHaveBeenCalled();
	});
});
