/**
 * @vitest-environment jsdom
 *
 * For each consent state, a page that runs the server start and then the
 * runtime ends like a page that runs only the runtime: the same number of
 * vendor elements, never two, and the vendor last told the same consent.
 */
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { Script } from '../../libs/script-loader/types';
import { custom } from '../../transports/mode';
import { createConsentRuntime } from '../index';
import { serverScriptStart } from '../script-server-start';
import type { ConsentRuntimeOptions, RuntimePrefetch } from '../types';

type SignalWindow = Window & {
	__c15tLoaderRan?: boolean;
	__c15tStarted?: unknown;
	__signals?: boolean[];
};

const SRC = 'https://cdn.example.com/pixel.js';
const CONFIRMED_AT = NOW - 1000;
const mode = custom({ init: () => Promise.resolve({}) });

/** Tells the vendor its consent from setup and on every change. */
const signal = (hasConsent: boolean): void => {
	const page = window as SignalWindow;
	page.__signals = [...(page.__signals ?? []), hasConsent];
};

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	onBeforeLoad: (info) => {
		if (!info.startedOnServer) {
			signal(info.hasConsent);
		}
	},
	onConsentChange: (info) => signal(info.hasConsent),
	serverStart: (info) => ({
		code: `window.__signals=(window.__signals||[]).concat(${info.hasConsent})`,
	}),
	src: SRC,
};

interface Case {
	name: string;
	options?: Partial<ConsentRuntimeOptions>;
	prefetch: RuntimePrefetch;
	script?: Partial<Script>;
	stored?: 'newer-denial' | 'older-denial';
}

const prefetchFor = function prefetchFor(
	values?: Parameters<typeof choiceRecords>[0],
	rule: Partial<PolicyRule> = {},
	extra: Partial<RuntimePrefetch> = {},
	vendorDenied?: string[]
): RuntimePrefetch {
	const resolution = matchedResolution(optInRule(rule));
	const records = values
		? choiceRecords(values, {
				confirmedAt: CONFIRMED_AT,
				fingerprint: resolution.fingerprints.choice,
			})
		: undefined;
	if (records && vendorDenied) {
		records.vendorChoice = {
			confirmedAt: CONFIRMED_AT,
			denied: vendorDenied,
			version: 1,
		};
	}
	return {
		initialPolicyResolution: resolution,
		initialRecords: records,
		now: NOW,
		...extra,
	};
};

const cases: Case[] = [
	{ name: 'granted', prefetch: prefetchFor({ marketing: true }) },
	{ name: 'denied', prefetch: prefetchFor({ marketing: false }) },
	{ name: 'no choice yet', prefetch: prefetchFor() },
	{
		name: 'alwaysLoad, no choice yet',
		prefetch: prefetchFor(),
		script: { alwaysLoad: true },
	},
	{
		name: 'alwaysLoad, denied',
		prefetch: prefetchFor({ marketing: false }),
		script: { alwaysLoad: true },
	},
	{
		name: 'category granted, vendor denied',
		options: {
			vendors: [
				{
					category: 'marketing',
					id: 'acme',
					name: 'Acme',
					privacyPolicyUrl: 'https://acme.example/privacy',
				},
			],
		},
		prefetch: prefetchFor({ marketing: true }, {}, {}, ['acme']),
		script: { vendor: 'acme' },
	},
	{
		name: 'category granted, vendor undeclared',
		prefetch: prefetchFor({ marketing: true }),
		script: { vendor: 'undeclared' },
	},
	{
		name: 'GPC denies marketing',
		prefetch: prefetchFor(
			{ marketing: true },
			{ privacySignals: { gpc: { denyCategories: ['marketing'] } } },
			{ initialPrivacySignals: { gpc: true } }
		),
	},
	{
		name: 'runtime disabled',
		options: { enabled: false },
		prefetch: prefetchFor(),
	},
	{
		name: 'browser stored a newer denial',
		prefetch: prefetchFor({ marketing: true }),
		stored: 'newer-denial',
	},
	{
		name: 'browser stored a newer denial, alwaysLoad',
		prefetch: prefetchFor({ marketing: true }),
		script: { alwaysLoad: true },
		stored: 'newer-denial',
	},
	{
		name: 'browser stored an older denial',
		prefetch: prefetchFor({ marketing: true }),
		stored: 'older-denial',
	},
];

/** Writes a real denial through the runtime's own persistence. */
const storeDenial = async function storeDenial(at: number): Promise<void> {
	vi.useFakeTimers({ now: at, toFake: ['Date'] });
	const writer = createConsentRuntime({
		mode,
		prefetch: { initialPolicyResolution: matchedResolution(optInRule()) },
	});
	writer.start();
	await writer.kernel.commands.save('none');
	await new Promise((resolve) => {
		setTimeout(resolve, 20);
	});
	writer.dispose();
	vi.useRealTimers();
};

const resetPage = function resetPage(): void {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		// oxlint-disable-next-line unicorn/no-document-cookie -- Clears the consent cookies between pages.
		document.cookie = `${cookie.split('=')[0]?.trim()}=; max-age=0; path=/`;
	}
	document.head.innerHTML = '';
	const page = window as SignalWindow;
	delete page.__c15tLoaderRan;
	delete page.__c15tStarted;
	delete page.__signals;
};

/** The vendor elements the page ends with, and the consent it last signaled. */
const runPage = async function runPage(
	scenario: Case,
	withServerStart: boolean
): Promise<{ elements: number; lastSignal: boolean | undefined }> {
	resetPage();
	if (scenario.stored) {
		await storeDenial(
			scenario.stored === 'newer-denial'
				? CONFIRMED_AT + 5000
				: CONFIRMED_AT - 5000
		);
	}
	const options: ConsentRuntimeOptions = {
		mode,
		prefetch: scenario.prefetch,
		scripts: [{ ...pixel, ...scenario.script }],
		...scenario.options,
	};
	if (withServerStart) {
		const code = serverScriptStart(options);
		if (code) {
			// A hidden page runs the work at once, before the loader mounts.
			const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
			// oxlint-disable-next-line no-new-func -- Runs the inline script, as the page would.
			new Function(code)();
			hidden.mockRestore();
		}
	}
	const runtime = createConsentRuntime(options);
	runtime.start();
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	const result = {
		elements: document.querySelectorAll(`script[src="${SRC}"]`).length,
		lastSignal: (window as SignalWindow).__signals?.at(-1),
	};
	runtime.dispose();
	return result;
};

afterEach(() => {
	vi.useRealTimers();
	resetPage();
});

test.each(cases)('$name', async (scenario) => {
	const loaderOnly = await runPage(scenario, false);
	const withStart = await runPage(scenario, true);

	expect(withStart).toEqual(loaderOnly);
	expect(withStart.elements).toBeLessThanOrEqual(1);
});

test('a loader that mounts before the first frame starts the script once', async () => {
	resetPage();
	const options: ConsentRuntimeOptions = {
		mode,
		prefetch: prefetchFor({ marketing: true }),
		scripts: [pixel],
	};
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	const frames: FrameRequestCallback[] = [];
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
		frames.push(frame);
		return frames.length;
	});
	// oxlint-disable-next-line no-new-func -- Runs the inline script, as the page would.
	new Function(serverScriptStart(options) ?? '')();
	const runtime = createConsentRuntime(options);
	runtime.start();
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	for (const frame of frames) {
		frame(performance.now());
	}
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});

	expect(document.querySelectorAll(`script[src="${SRC}"]`)).toHaveLength(1);
	expect((window as SignalWindow).__signals).toEqual([true]);
	runtime.dispose();
	vi.restoreAllMocks();
});
