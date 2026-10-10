import { describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { vercelSpeedInsights } from './vercel-speed-insights';
import type { VercelSpeedInsightsBeforeSend } from './vercel-speed-insights';

type SpeedInsightsGlobal = typeof globalThis & {
	si?: (action: string, handler: VercelSpeedInsightsBeforeSend) => void;
	siq?: [string, VercelSpeedInsightsBeforeSend][];
};

const event = {
	route: '/blog/[slug]',
	type: 'vital',
	url: 'https://example.com/blog/hello',
} as const;

// The collector replaces the `si` stub with a function that keeps only the
// latest `beforeSend` callback, after replaying the queue.
const installCollector = function installCollector(
	globalRef: SpeedInsightsGlobal
): () => VercelSpeedInsightsBeforeSend | undefined {
	let current: VercelSpeedInsightsBeforeSend | undefined;
	globalRef.si = (action, handler) => {
		if (action === 'beforeSend') {
			current = handler;
		}
	};
	for (const [action, handler] of globalRef.siq ?? []) {
		globalRef.si(action, handler);
	}

	return () => current;
};

describe('vercelSpeedInsights', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = vercelSpeedInsights();

		expectScriptMatchesIntegration('vercelSpeedInsights', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://va.vercel-scripts.com/v1/speed-insights/script.js',
		});
		expect(script.defer).toBe(true);
		expect(script.attributes).toEqual({ 'data-sdkn': 'c15t' });
	});

	it('uses debug bundle when mode or debug flag requests it', () => {
		const debugUrl =
			'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';

		expect(vercelSpeedInsights({ mode: 'development' }).src).toBe(debugUrl);
		expect(vercelSpeedInsights({ debug: true }).src).toBe(debugUrl);
		expect(vercelSpeedInsights({ mode: 'production' }).src).toBe(
			'https://va.vercel-scripts.com/v1/speed-insights/script.js'
		);
	});

	it('prefers scriptUrl over mode and debug', () => {
		expect(
			vercelSpeedInsights({
				debug: true,
				mode: 'development',
				scriptUrl: ' /_vercel/speed-insights/script.js ',
			}).src
		).toBe('/_vercel/speed-insights/script.js');
	});

	it('maps collector options to data attributes', () => {
		const script = vercelSpeedInsights({
			dsn: 'dsn_123',
			endpoint: 'https://vitals.example.com/v1/vitals',
			sampleRate: 0.25,
		});

		expect(script.attributes).toEqual({
			'data-dsn': 'dsn_123',
			'data-endpoint': 'https://vitals.example.com/v1/vitals',
			'data-sample-rate': '0.25',
			'data-sdkn': 'c15t',
		});
	});

	it('keeps sampleRate 0 and the 0 to 1 bounds', () => {
		expect(
			vercelSpeedInsights({ sampleRate: 0 }).attributes?.['data-sample-rate']
		).toBe('0');
		expect(
			vercelSpeedInsights({ sampleRate: 1 }).attributes?.['data-sample-rate']
		).toBe('1');
	});

	it.each([-0.1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects sampleRate %s',
		(sampleRate) => {
			expect(() => vercelSpeedInsights({ sampleRate })).toThrow(
				'vercelSpeedInsights: sampleRate must be a number from 0 to 1'
			);
		}
	);

	it('queues a beforeSend callback that passes reports while allowed', () => {
		const globalRef = getTestGlobal() as SpeedInsightsGlobal;
		const script = vercelSpeedInsights();

		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);

		expect(globalRef.siq).toHaveLength(1);
		const [action, gate] = globalRef.siq?.[0] ?? [];
		expect(action).toBe('beforeSend');
		expect(gate?.(event)).toEqual(event);
	});

	it('drops reports after revocation and resumes after a new grant', () => {
		const globalRef = getTestGlobal() as SpeedInsightsGlobal;
		const script = vercelSpeedInsights();

		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		const getBeforeSend = installCollector(globalRef);
		expect(getBeforeSend()?.(event)).toEqual(event);

		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		expect(getBeforeSend()?.(event)).toBeNull();

		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(getBeforeSend()?.(event)).toEqual(event);
	});

	it('drops reports when revoked before the collector starts', () => {
		const globalRef = getTestGlobal() as SpeedInsightsGlobal;
		const script = vercelSpeedInsights();

		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		const getBeforeSend = installCollector(globalRef);

		expect(getBeforeSend()?.(event)).toBeNull();
	});

	it('runs the caller beforeSend only while measurement is allowed', () => {
		const globalRef = getTestGlobal() as SpeedInsightsGlobal;
		const beforeSend = vi.fn<VercelSpeedInsightsBeforeSend>((report) => ({
			...report,
			url: report.url.replace('hello', '[slug]'),
		}));
		const script = vercelSpeedInsights({ beforeSend });

		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		const getBeforeSend = installCollector(globalRef);
		expect(getBeforeSend()?.(event)).toEqual({
			...event,
			url: 'https://example.com/blog/[slug]',
		});

		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		expect(getBeforeSend()?.(event)).toBeNull();
		expect(beforeSend).toHaveBeenCalledTimes(1);
	});

	it('lets the instance that receives consent changes own the gate', () => {
		const globalRef = getTestGlobal() as SpeedInsightsGlobal;
		const first = vercelSpeedInsights();
		const second = vercelSpeedInsights();

		first.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: first.id })
		);
		const getBeforeSend = installCollector(globalRef);

		second.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: second.id })
		);
		expect(getBeforeSend()?.(event)).toBeNull();
	});
});
