/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import {
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { posthog } from './vendors/analytics/posthog';

describe('posthog contract', () => {
	registerVendorContractCleanup();

	it('boots with the loader attributes intact and denied consent mapped to opt-out', () => {
		const initCalls: unknown[][] = [];
		const consentCalls: string[] = [];
		let attributes: Record<string, string | null> | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('posthog.com/static/array.js')) {
				return;
			}

			attributes = {
				crossorigin: node.getAttribute('crossorigin'),
				dataApiHost: node.getAttribute('data-api-host'),
				dataUiHost: node.getAttribute('data-ui-host'),
			};

			win.posthog = {
				get_explicit_consent_status: () => 'pending',
				init: (...args: unknown[]) => {
					initCalls.push(args);
				},
				opt_in_capturing: () => {
					consentCalls.push('opt_in');
				},
				opt_out_capturing: () => {
					consentCalls.push('opt_out');
				},
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
		expect(initCalls).toEqual([
			[
				'phc_contract',
				{
					api_host: 'https://eu.i.posthog.com',
					cookieless_mode: 'on_reject',
					defaults: '2026-01-30',
					ui_host: 'https://eu.posthog.com',
				},
			],
		]);
		expect(consentCalls).toEqual(['opt_out']);
	});
});
