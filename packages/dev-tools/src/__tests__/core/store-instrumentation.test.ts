import { createConsentKernel } from '@c15t/core';
import { describe, expect, it } from 'vitest';

import {
	kernelEventToLogEntry,
	registerKernelInstrumentation,
} from '../../core/store-instrumentation';

describe('kernel instrumentation', () => {
	it('fans out kernel events to every subscriber', () => {
		const kernel = createConsentKernel();
		const eventsA: string[] = [];
		const eventsB: string[] = [];
		const cleanupA = registerKernelInstrumentation({
			kernel,
			namespace: 'test-kernel',
			onEvent: (event) => eventsA.push(event.type),
		});
		const cleanupB = registerKernelInstrumentation({
			kernel,
			namespace: 'test-kernel',
			onEvent: (event) => eventsB.push(event.type),
		});

		kernel.set.consent({ measurement: true });
		expect(eventsA).toEqual(['consent_set']);
		expect(eventsB).toEqual(['consent_set']);

		cleanupA();
		kernel.set.overrides({ country: 'GB' });
		expect(eventsA).toEqual(['consent_set']);
		expect(eventsB).toEqual(['consent_set', 'info']);

		cleanupB();
		kernel.set.consent({ marketing: true });
		expect(eventsB).toEqual(['consent_set', 'info']);
	});

	it('maps failures without assuming Error instances', () => {
		const entry = kernelEventToLogEntry({
			attempt: 2,
			error: 'offline',
			nextRetryMs: 1000,
			type: 'init:failed',
		});

		expect(entry).toEqual({
			data: { attempt: 2, error: 'offline', nextRetryMs: 1000 },
			message: 'Init failed (attempt 2): offline',
			type: 'error',
		});
	});
});
