/** @vitest-environment jsdom */
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	noneRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { clearStoredConsentRecords } from '../../modules/persistence/record-storage';
import { hosted } from '../../transports/mode';
import { c15tProtocolHeaders } from '../../transports/version-header';
import { createConsentRuntime } from '../index';
import type { ConsentRuntime } from '../types';

const runtimes: ConsentRuntime[] = [];
const originalPolicy = matchedResolution(optOutRule());
let policy = originalPolicy;
let unavailable = false;

beforeEach(() => {
	localStorage.clear();
	clearStoredConsentRecords();
	policy = originalPolicy;
	unavailable = false;
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
		runtime.kernel.dispose();
	}
	vi.restoreAllMocks();
	clearStoredConsentRecords();
});

const createRuntime = () => {
	const runtime = createConsentRuntime({
		consentCategories: ['necessary', 'measurement'],
		mode: hosted({
			fetch: (input) => {
				if (unavailable) {
					return Promise.resolve(new Response(null, { status: 503 }));
				}
				return Promise.resolve(
					Response.json(
						String(input).endsWith('/init')
							? {
									branding: 'c15t',
									location: { countryCode: 'US', regionCode: 'CA' },
									policyResolution: writePolicyResolutionWire(policy),
									translations: { language: 'en', translations },
								}
							: {},
						{ headers: c15tProtocolHeaders }
					)
				);
			},
			url: '/api/c15t',
		}),
		prefetch: { initRetry: false },
	});
	runtimes.push(runtime);
	return runtime;
};

const start = async () => {
	const runtime = createRuntime();
	const completed = Promise.withResolvers<undefined>();
	runtime.kernel.events.on('command:init:completed', () =>
		completed.resolve(undefined)
	);
	runtime.start();
	await completed.promise;
	return runtime;
};

const close = (runtime: ConsentRuntime) => {
	runtime.dispose();
	runtime.kernel.dispose();
};

test('hosted startup, save and clear survive blocked storage getters', async () => {
	unavailable = true;
	vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
		throw new DOMException('Storage access blocked', 'SecurityError');
	});
	vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
		throw new DOMException('Cookies blocked', 'SecurityError');
	});
	vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
		throw new DOMException('Cookies blocked', 'SecurityError');
	});
	const runtime = await start();
	expect(runtime.kernel.getSnapshot().resolution).toMatchObject({
		reason: 'transport',
		status: 'failed',
	});
	expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
	await runtime.kernel.commands.save('none');
	expect(
		runtime.kernel.getSnapshot().explicitChoice?.categories.measurement?.value
	).toBe(false);
	expect(() => runtime.clearRecords()).not.toThrow();
	expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
	close(runtime);
	expect(console.warn).toHaveBeenCalledWith(
		'Failed to read consent from localStorage:',
		expect.objectContaining({ name: 'SecurityError' })
	);
});

test.each(['opt-out', 'none', 'changed-policy'] as const)(
	'preserves a rejection across hosted init failure and %s recovery',
	async (recovery) => {
		const initial = await start();
		expect(initial.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			true
		);
		await initial.kernel.commands.save('none');
		close(initial);
		const savedChoice = initial.kernel.getSnapshot().explicitChoice;
		const savedLocal = localStorage.getItem('c15t');
		const savedCookie = document.cookie;

		unavailable = true;
		const outage = await start();
		expect(outage.kernel.getSnapshot().resolution).toMatchObject({
			reason: 'transport',
			status: 'failed',
		});
		expect(outage.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			false
		);
		close(outage);
		const outageChoice = outage.kernel.getSnapshot().explicitChoice;
		expect(outageChoice?.categories.measurement?.value).toBe(false);
		expect(outageChoice).toEqual(savedChoice);
		expect(localStorage.getItem('c15t')).toBe(savedLocal);
		expect(document.cookie).toBe(savedCookie);

		unavailable = false;
		if (recovery === 'none') {
			policy = matchedResolution(noneRule());
		}
		const changedPolicy = matchedResolution(
			optOutRule({ categories: ['measurement'], scopeMode: 'strict' })
		);
		expect(changedPolicy.fingerprints.choice).not.toBe(
			originalPolicy.fingerprints.choice
		);
		if (recovery === 'changed-policy') {
			policy = changedPolicy;
		}
		const recovered = await start();
		expect(recovered.kernel.getSnapshot().resolution.status).toBe('matched');
		expect(recovered.kernel.getSnapshot().explicitChoice).toEqual(outageChoice);
		expect(
			recovered.kernel.getSnapshot().effectivePermissions.measurement
		).toBe(false);
		close(recovered);

		unavailable = true;
		const repeated = await start();
		close(repeated);
		unavailable = false;
		const final = await start();
		expect(final.kernel.getSnapshot().explicitChoice).toEqual(outageChoice);
		expect(final.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			false
		);
	}
);

test('preserves a rejection made during an outage across repeated recovery', async () => {
	const initial = await start();
	expect(initial.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		true
	);
	close(initial);

	unavailable = true;
	const outage = await start();
	expect(outage.kernel.getSnapshot().resolution).toMatchObject({
		reason: 'transport',
		status: 'failed',
	});
	expect(outage.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
	await outage.kernel.commands.save('none');
	close(outage);
	const outageChoice = outage.kernel.getSnapshot().explicitChoice;
	expect(outageChoice?.categories.measurement?.value).toBe(false);

	unavailable = false;
	const recovered = await start();
	expect(recovered.kernel.getSnapshot().resolution.status).toBe('matched');
	expect(recovered.kernel.getSnapshot().explicitChoice).toEqual(outageChoice);
	expect(recovered.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
	close(recovered);

	unavailable = true;
	const repeated = await start();
	close(repeated);
	unavailable = false;
	const final = await start();
	expect(final.kernel.getSnapshot().explicitChoice).toEqual(outageChoice);
	expect(final.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
});
