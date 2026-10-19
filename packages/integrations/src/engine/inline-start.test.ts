import type { ConsentState, Script, ScriptCallbackInfo } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	getTestGlobal,
	setupScriptHelperTest,
} from '../__tests__/helpers';
import { helperParityCases } from '../__tests__/integration-cases';
import { metaPixel } from '../vendors/ads-and-pixels/meta-pixel';
import { gtag } from '../vendors/analytics/google-tag';
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
	vi.clearAllMocks();
};

type StartInfo = Parameters<NonNullable<Script['serverStart']>>[0];

/** The page `onBeforeLoad` leaves, then the one the inline code leaves. */
const runBoth = function runBoth(
	script: Script,
	info: StartInfo
): [unknown, unknown] {
	const start = script.serverStart?.(info, script);
	if (!start) {
		throw new Error(`${script.id} has no inline form`);
	}
	resetPage();
	script.onBeforeLoad?.(createCallbackInfo(info) as ScriptCallbackInfo);
	const fromCallback = describePage();

	resetPage();
	// oxlint-disable-next-line no-new-func -- Runs the inline code, as the page would.
	new Function(`${start.prelude ?? ''};${start.code}`)();
	const fromInline = describePage();
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
		delete (getTestGlobal() as Record<string, unknown>).__c15tRunSteps;
	});

	it('compares the vendors that have an inline form', () => {
		expect(inlineCases.map(([key]) => key)).toEqual(
			expect.arrayContaining(['gtag', 'googleTagManager', 'metaPixel'])
		);
	});

	describe.each(inlineCases)('%s', (_key, script) => {
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
	});

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

	it('has no inline form when a helper wraps onBeforeLoad', () => {
		const script = klaviyo({ mode: 'forms-only', publicApiKey: 'AbC123' });

		expect(
			script.serverStart?.(
				{ consents: granted, hasConsent: true, id: script.id },
				script
			)
		).toBeUndefined();
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
				{
					methods: ['track'],
					name: 'Queue',
					target: 'vendor',
					type: 'defineQueueClass',
				},
			])
		).toBeUndefined();
		expect(
			inlineStepsStart([
				{
					methods: ['track'],
					queueFormat: 'methodCall',
					target: 'vendor',
					type: 'defineQueueMethods',
				},
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
