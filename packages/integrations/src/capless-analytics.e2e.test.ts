/** @vitest-environment jsdom */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { caplessAnalytics } from './vendors/analytics/capless-analytics';

/** Capless `c.js` 0.1.4, saved from https://c.capless.sh/c.js. */
const caplessSource = readFileSync(
	join(
		dirname(fileURLToPath(import.meta.url)),
		'__tests__/fixtures/capless/c.js.txt'
	),
	'utf8'
);

/** Event names in every batch `c.js` posted. */
let sentEvents: string[];
let sentUrls: string[];

/**
 * Runs the saved `c.js` as if the browser had just executed `element`, so it
 * reads `data-key` and the endpoint origin from that element.
 */
const runCaplessSdk = function runCaplessSdk(element: HTMLScriptElement) {
	vi.spyOn(document, 'currentScript', 'get').mockReturnValue(element);
	// oxlint-disable-next-line typescript/no-implied-eval, no-new-func -- runs the saved vendor SDK
	new Function(caplessSource)();
	element.dispatchEvent(new Event('load'));
};

/** Lets `c.js` flush its batch timer. */
const flush = function flush() {
	vi.advanceTimersByTime(5000);
};

describe('Capless consent lifecycle', () => {
	registerVendorContractCleanup();

	beforeEach(() => {
		vi.useFakeTimers();
		// Node 25+ replaces jsdom's storage globals with its own Web Storage.
		vi.stubGlobal('localStorage', jsdom.window.localStorage);
		vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
		window.localStorage.clear();
		window.sessionStorage.clear();
		sentEvents = [];
		sentUrls = [];
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string, init: { body: string }) => {
				sentUrls.push(url);
				const batch = JSON.parse(init.body) as { e: [string][] };
				sentEvents.push(...batch.e.map(([name]) => name));
				return Promise.resolve({ json: () => Promise.resolve({ r: 0 }) });
			})
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('uses the saved c.js fixture', () => {
		expect(createHash('sha256').update(caplessSource).digest('hex')).toBe(
			'41bcbffd0d42e9daafa30f97fbbafc1592ecc26e648d339bb7c29ffc5ba31901'
		);
	});

	it('creates no script, global or storage before measurement consent', () => {
		const script = caplessAnalytics({ projectKey: 'cs_test_key' });

		expect(loadScripts([script], deniedConsents)).toEqual([]);
		expect(updateScripts([script], grantedMarketingConsents).loaded).toEqual(
			[]
		);
		expect(document.querySelector('script')).toBeNull();
		expect(window.capless).toBeUndefined();
		expect(window.localStorage).toHaveLength(0);
		expect(window.sessionStorage).toHaveLength(0);
	});

	it('replays calls made before c.js loads and sends them to the loader origin', () => {
		const scripts = [caplessAnalytics({ projectKey: 'cs_test_key' })];
		installHeadProbe((element) => {
			expect(element.src).toBe('https://c.capless.sh/c.js');
			expect(element.async).toBe(true);
			expect(element.dataset.key).toBe('cs_test_key');
			window.capless?.('track', 'signup', { plan: 'pro' });
			runCaplessSdk(element);
		});

		expect(loadScripts(scripts, grantedMeasurementConsents)).toEqual([
			'capless-analytics',
		]);
		flush();

		expect(window.capless?.q).toBeUndefined();
		expect(sentUrls[0]).toBe('https://c.capless.sh/e?k=cs_test_key');
		expect(sentEvents).toEqual(['custom', 'pageview']);
		expect(document.cookie).toBe('');
	});

	it('stops collection on revocation and resumes on regrant without a reload', () => {
		const scripts = [caplessAnalytics({ projectKey: 'cs_test_key' })];
		installHeadProbe((element) => runCaplessSdk(element));
		loadScripts(scripts, grantedMeasurementConsents);
		flush();
		sentEvents = [];

		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual([
			'capless-analytics',
		]);
		window.capless?.('track', 'after-revoke');
		flush();
		expect(sentEvents).toEqual([]);
		expect(window.localStorage.getItem('_cpo')).toBe('1');

		updateScripts(scripts, grantedMeasurementConsents);
		window.capless?.('track', 'after-regrant');
		flush();
		expect(sentEvents).toEqual(['custom']);
		expect(window.localStorage.getItem('_cpo')).toBe('0');
	});

	it('collects for a visitor whose earlier revocation left the opt-out flag', () => {
		// A previous page load revoked consent, so c.js stored its opt-out.
		window.localStorage.setItem('_cpo', '1');
		const scripts = [caplessAnalytics({ projectKey: 'cs_test_key' })];
		installHeadProbe((element) => runCaplessSdk(element));

		loadScripts(scripts, grantedMeasurementConsents);
		flush();

		expect(sentEvents).toEqual(['pageview']);
		expect(window.localStorage.getItem('_cpo')).toBe('0');
	});

	it('sends nothing when consent is revoked while c.js is downloading', () => {
		const scripts = [caplessAnalytics({ projectKey: 'cs_test_key' })];
		loadScripts(scripts, grantedMeasurementConsents);
		const element = document.querySelector('script');
		if (!element) {
			throw new Error('Expected the Capless loader element.');
		}

		updateScripts(scripts, deniedConsents);
		// A removed script that already started downloading still executes.
		runCaplessSdk(element);
		flush();

		expect(element.isConnected).toBe(false);
		expect(sentEvents).toEqual([]);
	});
});
