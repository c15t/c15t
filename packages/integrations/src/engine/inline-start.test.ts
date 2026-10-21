import type { ConsentState, Script, ScriptCallbackInfo } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	getTestGlobal,
	setupScriptHelperTest,
} from '../__tests__/helpers';
import { helperParityCases } from '../__tests__/integration-cases';
import { resolveManifest } from '../resolve';
import { vendorManifestContract } from '../types';
import { metaPixel } from '../vendors/ads-and-pixels/meta-pixel';
import { gtag } from '../vendors/analytics/google-tag';
import { vercelSpeedInsights } from '../vendors/analytics/vercel-speed-insights';
import { klaviyo } from '../vendors/email-and-sms/klaviyo';
import { inlineStepsStart } from './inline-start';

const granted: ConsentState = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

const denied: ConsentState = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

/** A comparable copy of a value, with `arguments` and cycles marked. */
const describeValue = function describeValue(
	value: unknown,
	seen: Map<unknown, string>,
	path: string
): unknown {
	if (
		value === null ||
		(typeof value !== 'object' && typeof value !== 'function')
	) {
		return value;
	}
	const earlier = seen.get(value);
	if (earlier) {
		return { ref: earlier };
	}
	seen.set(value, path);
	const isArguments =
		Object.prototype.toString.call(value) === '[object Arguments]';
	if (Array.isArray(value) || isArguments) {
		return {
			items: Array.from(value as ArrayLike<unknown>, (item, index) =>
				describeValue(item, seen, `${path}[${index}]`)
			),
			kind: isArguments ? 'arguments' : 'array',
			props: Object.fromEntries(
				Object.entries(value)
					.filter(([key]) => !/^\d+$/u.test(key))
					.map(([key, item]) => [
						key,
						describeValue(item, seen, `${path}.${key}`),
					])
			),
		};
	}
	return {
		kind: typeof value,
		props: Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				describeValue(item, seen, `${path}.${key}`),
			])
		),
	};
};

/** Globals the test environment had before any vendor ran. */
let baseline = new Set<string>();

const vendorGlobals = function vendorGlobals(): string[] {
	return Object.getOwnPropertyNames(getTestGlobal()).filter(
		// `__c15t*` globals are c15t's own (the runner, debug listeners).
		(name) => !(baseline.has(name) || name.startsWith('__c15t'))
	);
};

/** Every global a vendor left, and every element its steps inserted. */
const describePage = function describePage(): unknown {
	const globalRef = getTestGlobal() as unknown as Record<string, unknown>;
	const seen = new Map<unknown, string>();
	const page = document as unknown as {
		getElementsByTagName: () => [
			{ parentNode: { insertBefore: ReturnType<typeof vi.fn> } },
		];
		head: { appendChild: ReturnType<typeof vi.fn> };
	};
	const inserted = [
		...page.head.appendChild.mock.calls,
		...(page.getElementsByTagName()[0]?.parentNode.insertBefore.mock.calls ??
			[]),
	].map(([node]) => {
		const element = node as Record<string, unknown> & {
			setAttribute: ReturnType<typeof vi.fn>;
		};
		return {
			attributes: element.setAttribute.mock.calls,
			fields: Object.fromEntries(
				Object.entries(element).filter(
					([, value]) => typeof value !== 'function'
				)
			),
		};
	});
	return {
		cookie: (document as { cookie?: string }).cookie,
		globals: Object.fromEntries(
			vendorGlobals()
				.sort()
				.map((name) => [name, describeValue(globalRef[name], seen, name)])
		),
		inserted,
	};
};

const resetPage = function resetPage(): void {
	const globalRef = getTestGlobal() as unknown as Record<string, unknown>;
	for (const name of vendorGlobals()) {
		Reflect.deleteProperty(globalRef, name);
	}
	Reflect.deleteProperty(document, 'cookie');
	vi.clearAllMocks();
};

type StartInfo = Parameters<NonNullable<Script['serverStart']>>[0];

/**
 * The page `onBeforeLoad` leaves, then the one the inline code leaves. `act`
 * runs after each, as the app would call the vendor before its script loads,
 * and what it returns joins the page.
 */
const runBoth = function runBoth(
	script: Script,
	info: StartInfo,
	act: () => unknown = () => undefined
): [unknown, unknown] {
	const start = script.serverStart?.(info, script);
	if (!start) {
		throw new Error(`${script.id} has no inline form`);
	}
	resetPage();
	script.onBeforeLoad?.(createCallbackInfo(info) as ScriptCallbackInfo);
	const fromCallback = [describeValue(act(), new Map(), 'act'), describePage()];

	resetPage();
	// oxlint-disable-next-line no-new-func -- Runs the inline code, as the page would.
	new Function(`${start.prelude ?? ''};${start.code}`)();
	const fromInline = [describeValue(act(), new Map(), 'act'), describePage()];
	return [fromCallback, fromInline];
};

const states = [
	['granted', { consents: granted, hasConsent: true }],
	['denied', { consents: denied, hasConsent: false }],
] as const;

/** The vendors whose script has an inline form, granted and denied. */
const inlineCases = Object.entries(helperParityCases)
	.map(([key, { script }]) => [key, script as Script] as const)
	.filter(([, script]) =>
		states.every(([, state]) =>
			script.serverStart?.({ ...state, id: script.id }, script)
		)
	);

describe('inlineStepsStart', () => {
	setupScriptHelperTest();

	beforeEach(() => {
		vi.useFakeTimers({ now: 1_700_000_000_000, toFake: ['Date'] });
		baseline = new Set(Object.getOwnPropertyNames(getTestGlobal()));
	});

	afterEach(() => {
		vi.useRealTimers();
		// A global left here would join the next test's baseline and escape
		// its resets.
		resetPage();
		delete (getTestGlobal() as Record<string, unknown>).__c15tRunSteps;
	});

	it('compares the vendors that have an inline form', () => {
		expect(inlineCases.map(([key]) => key)).toEqual(
			expect.arrayContaining([
				'amplitude',
				'gtag',
				'googleTagManager',
				'heap',
				'klaviyo',
				'metaPixel',
				'microsoft-clarity',
				'posthog',
				'vercelSpeedInsights',
			])
		);
	});
	it.each([undefined, false, true])(
		'returns the queue only when returnQueue is %s in both runners',
		(returnQueue) => {
			const script = resolveManifest(
				{
					...vendorManifestContract,
					bootstrap: [
						{ name: 'chainQueue', type: 'setGlobal', value: [] },
						{
							methods: ['identify', 'track'],
							returnQueue,
							target: 'chainQueue',
							type: 'defineQueueMethods',
						},
					],
					category: 'measurement',
					install: [{ src: 'https://example.com/sdk.js', type: 'loadScript' }],
					vendor: 'chain-queue',
				},
				{}
			);
			const pages = runBoth(
				script,
				{ consents: granted, hasConsent: true, id: script.id },
				() => {
					const queue = getTestGlobal().chainQueue as unknown as {
						identify: (id: string) => unknown;
						track: (event: string) => unknown;
					};
					expect(queue.identify('customer-123')).toBe(
						returnQueue ? queue : undefined
					);
					expect(queue.track('Signed up')).toBe(
						returnQueue ? queue : undefined
					);
					return queue;
				}
			);
			expect(pages[1]).toStrictEqual(pages[0]);
		}
	);

	// Speed Insights registers its consent gate at hydration; see below.
	describe.each(inlineCases.filter(([key]) => key !== 'vercelSpeedInsights'))(
		'%s',
		(_key, script) => {
			it.each(states)(
				'leaves the page onBeforeLoad leaves when %s',
				(_state, state) => {
					const [fromCallback, fromInline] = runBoth(script, {
						...state,
						id: script.id,
						vendor: { granted: true, id: script.id },
					});

					expect(fromInline).toStrictEqual(fromCallback);
				}
			);
		}
	);

	it('runs the denied steps when the server has no consent', () => {
		const pages = runBoth(helperParityCases.microsoftUet.script as Script, {
			consents: denied,
			hasConsent: false,
			id: 'microsoft-uet',
			vendor: { granted: true, id: 'microsoft-uet' },
		});

		expect(JSON.stringify(pages[1])).toContain('denied');
		expect(JSON.stringify(pages[1])).not.toContain('granted');
	});

	it('registers the Speed Insights gate when the app hydrates', () => {
		const script = helperParityCases.vercelSpeedInsights.script as Script;
		const info = { consents: granted, hasConsent: true, id: script.id };
		const [fromCallback] = runBoth(script, info);

		resetPage();
		const start = script.serverStart?.(info, script);
		// oxlint-disable-next-line no-new-func -- Runs the inline code, as the page would.
		new Function(`${start?.prelude ?? ''};${start?.code}`)();
		script.onBeforeLoad?.({
			...createCallbackInfo(info),
			startedOnServer: true,
		} as ScriptCallbackInfo);

		expect([
			describeValue(undefined, new Map(), 'act'),
			describePage(),
		]).toStrictEqual(fromCallback);
	});

	it('has no inline form for Speed Insights with a beforeSend', () => {
		const script = vercelSpeedInsights({ beforeSend: (event) => event });

		expect(
			script.serverStart?.(
				{ consents: granted, hasConsent: true, id: script.id },
				script
			)
		).toBeUndefined();
	});

	it('sets the forms-only cookie for Klaviyo the way onBeforeLoad does', () => {
		const script = klaviyo({ mode: 'forms-only', publicApiKey: 'AbC123' });
		const [fromCallback, fromInline] = runBoth(script, {
			consents: granted,
			hasConsent: true,
			id: script.id,
		});

		expect(fromInline).toStrictEqual(fromCallback);
		expect(JSON.stringify(fromInline)).toContain('__kla_off=true');
	});

	it('has no inline form for a copy whose onBeforeLoad was replaced', () => {
		const script = metaPixel({ pixelId: '123456' });
		const copy = { ...script, onBeforeLoad: () => undefined };

		expect(
			copy.serverStart?.(
				{ consents: granted, hasConsent: true, id: copy.id },
				copy
			)
		).toBeUndefined();
	});

	it('signals the consent default the vendor choice allows', () => {
		const script = gtag({ category: 'measurement', id: 'G-TEST000001' });
		const start = script.serverStart?.(
			{
				consents: granted,
				hasConsent: true,
				id: script.id,
				vendor: { granted: false, id: script.id },
			},
			script
		);

		expect(start?.code).toContain('"ad_storage":"denied"');
		expect(start?.code).toContain('"analytics_storage":"denied"');
	});

	it('has no inline form for a step the runner does not run', () => {
		expect(
			inlineStepsStart([
				{ assignTo: 'vendor', constructor: 'Vendor', type: 'constructGlobal' },
			])
		).toBeUndefined();
	});

	it('has no inline form for a value JSON would change', () => {
		const date = new Date(0);
		for (const value of [
			date,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			-0,
			() => {},
			10n,
			new Map(),
			[1, undefined],
			// oxlint-disable-next-line no-sparse-arrays -- The hole is the case.
			[1, , 3],
			{ sent: date },
			// An own `__proto__` key, which an object literal reads as the
			// prototype.
			{ config: JSON.parse('{"__proto__":{"debug":true}}') },
		]) {
			expect(
				inlineStepsStart([{ name: 'x', type: 'setGlobal', value }])
			).toBeUndefined();
		}
		expect(
			inlineStepsStart([
				{
					args: ['config', { id: undefined }],
					global: 'g',
					type: 'callGlobal',
				},
			])
		).toBeUndefined();
		expect(
			inlineStepsStart([
				{
					name: 'f',
					properties: { loaded: date },
					queue: { property: 'q' },
					type: 'defineStubFunction',
				},
			])
		).toBeUndefined();
		expect(
			inlineStepsStart([
				{
					methods: [{ behavior: 'return', name: 'sentAt', value: date }],
					target: 'g',
					type: 'defineGlobalMethods',
				},
			])
		).toBeUndefined();
	});

	it('starts inline when every value is plain JSON', () => {
		// The runner reads a dropped `undefined` value as `undefined`.
		expect(
			inlineStepsStart([{ name: 'x', type: 'setGlobal', value: undefined }])
		).toBeDefined();
		expect(
			inlineStepsStart([
				{
					name: 'x',
					type: 'setGlobal',
					value: { list: [1, 'a', true, null], nested: { n: 1.5 } },
				},
			])
		).toBeDefined();
	});

	/** The vendor calls an app makes before the vendor's script loads. */
	const calls: [string, () => unknown][] = [
		[
			'amplitude',
			() => {
				const { amplitude } = getTestGlobal() as unknown as {
					amplitude: Record<string, (...args: unknown[]) => unknown> & {
						Identify: new () => Record<string, (...args: unknown[]) => unknown>;
					};
				};
				return [
					amplitude.track?.('signup', { plan: 'pro' }),
					amplitude.setUserId?.('user-1'),
					new amplitude.Identify().set?.('plan', 'pro'),
				];
			},
		],
		[
			'heap',
			() => {
				const { heap, heapReadyCb } = getTestGlobal() as unknown as {
					heap: Record<string, (...args: unknown[]) => unknown>;
					heapReadyCb: { fn: () => void }[];
				};
				const result = heap.track?.('signup', { plan: 'pro' });
				// heap.js replaces the stub, then runs each queued call.
				const tracked: unknown[] = [];
				heap.track = (...args: unknown[]) => tracked.push(args);
				for (const entry of heapReadyCb) {
					entry.fn();
				}
				return [result, tracked];
			},
		],
		[
			'klaviyo',
			() => {
				const { klaviyo: onsite } = getTestGlobal() as unknown as {
					klaviyo: Record<string, (...args: unknown[]) => unknown>;
				};
				return [
					onsite.identify?.({ email: 'a@example.com' }, () => undefined),
					onsite.push?.(['track', 'signup']),
					onsite.then,
					JSON.stringify(onsite),
				];
			},
		],
		[
			'posthog',
			() => {
				const { posthog } = getTestGlobal() as unknown as {
					posthog: Record<string, (...args: unknown[]) => unknown>;
				};
				return [
					posthog.capture?.('signup', { plan: 'pro' }),
					posthog.get_explicit_consent_status?.(),
					posthog.init?.('phc_other'),
				];
			},
		],
	];

	it.each(calls)('queues %s calls the way onBeforeLoad does', (key, act) => {
		const { script } = helperParityCases[key as keyof typeof helperParityCases];
		const { id } = script as Script;
		const [fromCallback, fromInline] = runBoth(
			script as Script,
			{
				consents: granted,
				hasConsent: true,
				id,
				vendor: { granted: true, id },
			},
			act
		);

		expect(fromInline).toStrictEqual(fromCallback);
		expect(JSON.stringify(fromInline)).toContain('signup');
	});

	it('keeps step values from closing the inline script', () => {
		const start = inlineStepsStart([
			{ name: 'x', type: 'setGlobal', value: '</script><script>alert(1)' },
		]);

		expect(start?.code).not.toContain('</script>');
	});

	it('runs no steps in onBeforeLoad when the HTML started the script', () => {
		const script = metaPixel({ pixelId: '123456' });
		resetPage();

		script.onBeforeLoad?.({
			...createCallbackInfo({ hasConsent: true, id: script.id }),
			startedOnServer: true,
		});

		expect(getTestGlobal().fbq).toBeUndefined();
	});
});
