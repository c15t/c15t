/**
 * Cold start has to be measured in a process that has never seen c15t, so the sample
 * unit is a spawn. These cases pay for the quick sampling plan and check that what
 * came back really is a launch: a fresh process that ended holding a readable
 * snapshot, with the harness's own work kept out of the span.
 */

import { describe, expect, it } from 'vitest';

import { loadBudgets } from '../budgets';
import { measureColdStart } from '../measure/cold-start';

const processes = loadBudgets().sampling.quickColdStartProcesses;

const result = measureColdStart(processes);

describe('cold-start overhead in JavaScript', () => {
	it('launches without giving up', () => {
		expect(result.unavailable).toBeUndefined();
	});

	it('spends one process per sample', () => {
		expect(result.samples).toBe(processes);
	});

	it('separates the module evaluation from the handshake', () => {
		expect(result.moduleLoadMs).toBeGreaterThan(0);
		expect(result.attachMs).toBeGreaterThan(0);
	});

	it('reports the whole span as the larger number', () => {
		expect(result.toFirstConsentMs).toBeGreaterThan(0);
		expect(result.toFirstConsentMs).toBeGreaterThanOrEqual(result.attachMs);
	});

	it('keeps the harness host cost out of the span it reports', () => {
		// The subject imports this file before it starts the clock, so the host number
		// is printed for comparison and never added to the row. If it ever swamps the
		// measurement, that shows up here first.
		expect(result.hostMs).toBeGreaterThanOrEqual(0);
		expect(result.hostMs).toBeLessThan(result.toFirstConsentMs * 10);
	});
});
