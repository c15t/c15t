/** @vitest-environment jsdom */
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	noneRule,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { clearStoredConsentRecords } from '../../modules/persistence/record-storage';
import { hosted } from '../../transports/mode';
import { c15tProtocolHeaders } from '../../transports/version-header';
import { createConsentRuntime } from '../index';
import type { ConsentRuntime, ConsentRuntimeOptions } from '../types';

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

const createRuntime = (options: Partial<ConsentRuntimeOptions> = {}) => {
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
		...options,
	});
	runtimes.push(runtime);
	return runtime;
};

const start = async (options: Partial<ConsentRuntimeOptions> = {}) => {
	const runtime = createRuntime(options);
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

test.each(['opt-out', 'none', 'changed-policy', 'offline-rejection'] as const)(
	'preserves a rejection across hosted init failure and %s recovery',
	async (recovery) => {
		const initial = await start();
		expect(initial.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			true
		);
		if (recovery !== 'offline-rejection') {
			await initial.kernel.commands.save('none');
		}
		close(initial);
		let savedChoice = initial.kernel.getSnapshot().explicitChoice;
		let savedLocal = localStorage.getItem('c15t');
		let savedCookie = document.cookie;

		unavailable = true;
		const outage = await start();
		expect(outage.kernel.getSnapshot().resolution).toMatchObject({
			reason: 'transport',
			status: 'failed',
		});
		expect(outage.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			false
		);
		if (recovery === 'offline-rejection') {
			await outage.kernel.commands.save('none');
			savedChoice = outage.kernel.getSnapshot().explicitChoice;
			savedLocal = localStorage.getItem('c15t');
			savedCookie = document.cookie;
		}
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
		if (recovery === 'changed-policy') {
			policy = matchedResolution(
				optOutRule({ categories: ['measurement'], scopeMode: 'strict' })
			);
		}
		expect(
			policy.fingerprints.choice === originalPolicy.fingerprints.choice
		).toBe(recovery !== 'changed-policy' && recovery !== 'none');
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

test.each(['all', 'none', 'custom'] as const)(
	'%s completes the configured categories across a hosted reload',
	async (action) => {
		policy = matchedResolution(
			optInRule({
				categories: ['necessary'],
				id: 'europe_opt_in',
				match: { countries: ['DE'] },
				scopeMode: 'permissive',
			}),
			'country'
		);
		const initial = await start();
		expect(initial.kernel.getSnapshot().activeUI).toBe('banner');
		const result = await initial.kernel.commands.save(
			action === 'custom' ? { measurement: true } : action,
			{
				categories: initial.consentCategories,
			}
		);
		expect(result).toMatchObject({ confirmed: ['measurement'], ok: true });
		expect(
			initial.kernel.getSnapshot().explicitChoice?.categories.measurement?.value
		).toBe(action !== 'none');
		expect(initial.kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'none',
		});
		expect(initial.kernel.getSnapshot().effectivePermissions.marketing).toBe(
			false
		);
		expect(
			initial.kernel.getSnapshot().explicitChoice?.categories.marketing
		).toBeUndefined();
		close(initial);

		const reloaded = await start();
		expect(
			reloaded.kernel.getSnapshot().explicitChoice?.categories.measurement
				?.value
		).toBe(action !== 'none');
		expect(reloaded.kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'none',
		});
		expect(reloaded.kernel.getSnapshot().activeUI).toBe('none');
	}
);

test('changing configured categories re-evaluates completion without granting hidden categories', async () => {
	policy = matchedResolution(optInRule());
	const runtime = await start();
	await runtime.kernel.commands.save('all');
	expect(runtime.kernel.getSnapshot().promptRequirement).toEqual({
		kind: 'none',
	});
	expect(
		Object.keys(runtime.kernel.getSnapshot().explicitChoice?.categories ?? {})
	).toEqual(['measurement']);

	runtime.setConsentCategories(['necessary', 'measurement', 'marketing']);
	expect(runtime.kernel.getSnapshot().promptRequirement).toEqual({
		kind: 'choice',
		reason: 'missing',
	});
	expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
		false
	);
	await runtime.kernel.commands.save('all');
	expect(runtime.kernel.getSnapshot().promptRequirement).toEqual({
		kind: 'none',
	});
	expect(
		runtime.kernel.getSnapshot().explicitChoice?.categories.marketing?.value
	).toBe(true);
});

test('scripts infer marketing and measurement without a category list and keep a hosted reload dismissed', async () => {
	policy = matchedResolution(
		optInRule({ categories: ['necessary'], scopeMode: 'permissive' })
	);
	const options: Partial<ConsentRuntimeOptions> = {
		consentCategories: undefined,
		scripts: [
			{ callbackOnly: true, category: 'measurement', id: 'analytics' },
			{ callbackOnly: true, category: 'marketing', id: 'ads' },
		],
	};
	const initial = await start(options);
	expect(
		initial.kernel.getServerSnapshot().evaluationPolicy.choiceScope
	).toEqual(['marketing', 'measurement']);
	expect(initial.kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
		'marketing',
		'measurement',
	]);
	expect(await initial.kernel.commands.save('all')).toMatchObject({ ok: true });
	const choice = initial.kernel.getSnapshot().explicitChoice;
	expect(choice?.categories.measurement?.value).toBe(true);
	expect(choice?.categories.marketing?.value).toBe(true);
	expect(choice?.categories.functionality).toBeUndefined();
	close(initial);
	const reloaded = await start(options);
	expect(reloaded.kernel.getSnapshot().explicitChoice).toEqual(choice);
	expect(reloaded.kernel.getSnapshot().activeUI).toBe('none');
	expect(reloaded.kernel.getSnapshot().promptRequirement.kind).toBe('none');
});
