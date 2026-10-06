/** @vitest-environment jsdom */
/**
 * A site that declares no category, under a permissive policy, asks about
 * strictly necessary alone. The banner still shows, any action on it is an
 * acknowledgement that sends a receipt and is stored, and a category
 * declared later asks again.
 */
import type { PolicyResolution } from '@c15t/schema/types';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { clearStoredConsentRecords } from '../../modules/persistence/__tests__/record-writes';
import { hosted } from '../../transports/mode';
import { c15tProtocolHeaders } from '../../transports/version-header';
import { createConsentRuntime } from '../index';
import type { ConsentRuntime, ConsentRuntimeOptions } from '../types';

const runtimes: ConsentRuntime[] = [];
let policy: PolicyResolution = matchedResolution(optInRule());
let saves: Record<string, unknown>[] = [];

beforeEach(() => {
	localStorage.clear();
	clearStoredConsentRecords();
	policy = matchedResolution(optInRule());
	saves = [];
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
		runtime.kernel.dispose();
	}
	clearStoredConsentRecords();
});

const start = async (options: Partial<ConsentRuntimeOptions> = {}) => {
	const runtime = createConsentRuntime({
		mode: hosted({
			fetch: (input, init) => {
				const url = String(input);
				if (url.endsWith('/subjects')) {
					saves.push(JSON.parse(String(init?.body)));
				}
				return Promise.resolve(
					Response.json(
						url.endsWith('/init')
							? {
									branding: 'c15t',
									location: { countryCode: 'DE', regionCode: null },
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

test('a permissive policy with nothing declared asks about necessary alone', async () => {
	const runtime = await start();
	const snapshot = runtime.kernel.getSnapshot();
	expect(snapshot.evaluationPolicy.choiceScope).toEqual([]);
	expect(runtime.consentCategories).toEqual(['necessary']);
	expect(snapshot.promptRequirement).toEqual({
		kind: 'choice',
		reason: 'missing',
	});
	expect(snapshot.activeUI).toBe('banner');
});

test('a strict policy with nothing declared keeps its whole scope', async () => {
	policy = matchedResolution(optInRule({ scopeMode: 'strict' }));
	const runtime = await start();
	expect(runtime.kernel.getSnapshot().evaluationPolicy.choiceScope).toBe(
		undefined
	);
	// In consentTypes order: the resolved scope is sorted, not ordered.
	expect(runtime.consentCategories).toEqual([
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	]);
	expect(runtime.kernel.getSnapshot().activeUI).toBe('banner');
});

test.each([
	['all', 'all'],
	['none', 'necessary'],
	[undefined, 'custom'],
] as const)(
	'save(%j) acknowledges, sends a necessary-only receipt and survives a reload',
	async (input, consentAction) => {
		const runtime = await start();
		const result = await runtime.kernel.commands.save(input);
		expect(result.ok).toBe(true);
		const snapshot = runtime.kernel.getSnapshot();
		expect(snapshot.explicitChoice).toBeNull();
		expect(snapshot.noticeDismissal).toMatchObject({
			fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
		});
		expect(snapshot.promptRequirement).toEqual({ kind: 'none' });
		expect(snapshot.activeUI).toBe('none');
		expect(saves).toHaveLength(1);
		expect(saves[0]).toMatchObject({
			choice: { categories: {}, version: 3 },
			consentAction,
			preferences: { necessary: true },
			type: 'cookie_banner',
		});
		close(runtime);

		const reloaded = await start();
		expect(reloaded.kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'none',
		});
		expect(reloaded.kernel.getSnapshot().activeUI).toBe('none');
	}
);

test('an IAB policy with nothing declared keeps its whole scope', async () => {
	// TCF consent is given per purpose and recorded in the TC string, so it
	// never shrinks to an acknowledgement.
	policy = matchedResolution(optInRule({ model: 'iab' }));
	const runtime = await start();
	const snapshot = runtime.kernel.getSnapshot();
	expect(snapshot.policyRule.scopeMode).toBe('permissive');
	expect(snapshot.evaluationPolicy.choiceScope).toBe(undefined);
	// In consentTypes order: the resolved scope is sorted, not ordered.
	expect(runtime.consentCategories).toEqual([
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	]);
});

test('another tab adopts the acknowledgement', async () => {
	const first = await start();
	const second = await start();
	await first.kernel.commands.save('all');
	await vi.waitFor(() => expect(localStorage.length).toBeGreaterThan(0));
	expect(second.kernel.getSnapshot().activeUI).toBe('banner');
	second.reconcileStorage();
	expect(second.kernel.getSnapshot().promptRequirement).toEqual({
		kind: 'none',
	});
});

test('a category declared after the acknowledgement asks again', async () => {
	const runtime = await start();
	await runtime.kernel.commands.save('all');
	expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
	runtime.kernel.set.registerConsentCategories(['marketing']);
	const snapshot = runtime.kernel.getSnapshot();
	expect(snapshot.evaluationPolicy.choiceScope).toEqual(['marketing']);
	expect(snapshot.promptRequirement).toEqual({
		kind: 'choice',
		reason: 'missing',
	});
	expect(snapshot.activeUI).toBe('banner');
	await runtime.kernel.commands.save('all');
	expect(saves.at(-1)).toMatchObject({
		choice: { categories: { marketing: { value: true } } },
	});
	expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
});
