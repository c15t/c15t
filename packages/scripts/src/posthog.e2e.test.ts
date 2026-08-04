/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { posthog } from './vendors/analytics/posthog';

describe('posthog contract', () => {
	registerVendorContractCleanup();

	it('boots with the loader attributes intact and denied consent mapped to opt-out', () => {
		const consentCalls: string[] = [];
		let attributes: Record<string, string | null> | undefined;
		let queuedInit: unknown;

		installHeadProbe((node, win) => {
			if (!node.src.includes('posthog.com/static/array.js')) {
				return;
			}

			attributes = {
				crossorigin: node.getAttribute('crossorigin'),
				dataApiHost: node.getAttribute('data-api-host'),
				dataUiHost: node.getAttribute('data-ui-host'),
			};

			queuedInit = win.posthog._i;

			win.posthog = {
				init: () => undefined,
				opt_in_capturing: () => {
					consentCalls.push('opt_in');
				},
				opt_out_capturing: () => {
					consentCalls.push('opt_out');
				},
				get_explicit_consent_status: () => 'pending',
				capture: () => undefined,
			};

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...posthog({ id: 'phc_contract' }),
					id: 'posthog-contract',
				},
			],
			deniedConsents
		);

		expect(attributes).toEqual({
			crossorigin: 'anonymous',
			dataApiHost: 'https://eu.i.posthog.com',
			dataUiHost: 'https://eu.posthog.com',
		});
		expect(queuedInit).toEqual([
			[
				'phc_contract',
				{
					defaults: '2026-01-30',
					cookieless_mode: 'on_reject',
					api_host: 'https://eu.i.posthog.com',
					ui_host: 'https://eu.posthog.com',
				},
				'posthog',
			],
		]);
		expect(consentCalls).toEqual(['opt_out']);
	});

	it('queues capture calls until the loader installs', () => {
		loadScripts([posthog({ id: 'phc_queue' })], grantedMeasurementConsents);

		window.posthog.capture('signup', { plan: 'pro' });

		expect(Array.from(window.posthog as unknown as unknown[])).toEqual([
			['opt_in_capturing', { captureEventName: null }],
			['capture', 'signup', { plan: 'pro' }],
		]);
	});

	it('queues opt-out ahead of capture when measurement consent is denied', () => {
		loadScripts([posthog({ id: 'phc_denied' })], deniedConsents);

		window.posthog.capture('signup');

		expect(Array.from(window.posthog as unknown as unknown[])).toEqual([
			['opt_out_capturing'],
			['capture', 'signup'],
		]);
	});

	it('leaves an installed SDK intact when bootstrap runs again', () => {
		const liveInit = () => undefined;
		const liveCapture = () => undefined;
		const installed = {
			init: liveInit,
			capture: liveCapture,
			opt_in_capturing: () => undefined,
			opt_out_capturing: () => undefined,
			get_explicit_consent_status: () => 'granted',
		};
		window.posthog = installed;

		loadScripts([posthog({ id: 'phc_regrant' })], grantedMeasurementConsents);

		expect(window.posthog).toBe(installed);
		expect(window.posthog.init).toBe(liveInit);
		expect(window.posthog.capture).toBe(liveCapture);
		expect(window.posthog.get_explicit_consent_status()).toBe('granted');
		expect(window.posthog._i).toBeUndefined();
	});

	it('bootstraps a snippet-shaped stub that array.js will install over', () => {
		let acceptedBySnippetGuard: boolean | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('posthog.com/static/array.js')) {
				return;
			}

			// The guard `array.js` applies before installing its runtime over an
			// existing global (posthog-js >= 1.410.2). A stub that fails it is
			// left in place, so every call — including `init` — becomes a no-op.
			const stub = win.posthog as Window['posthog'] | undefined;
			acceptedBySnippetGuard = !stub || Array.isArray(stub._i);
		});

		loadScripts(
			[
				{
					...posthog({ id: 'phc_snippet_guard' }),
					id: 'posthog-snippet-guard',
				},
			],
			deniedConsents
		);

		expect(acceptedBySnippetGuard).toBe(true);
	});
});
