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
import { posthog } from './posthog';

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
				init: (...args: unknown[]) => {
					initCalls.push(args);
				},
				opt_in_capturing: () => {
					consentCalls.push('opt_in');
				},
				opt_out_capturing: () => {
					consentCalls.push('opt_out');
				},
				get_explicit_consent_status: () => 'pending',
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
			dataUiHost: 'https://eu.i.posthog.com',
		});
		expect(initCalls).toEqual([['phc_contract', {}]]);
		expect(consentCalls).toEqual(['opt_out']);
	});
});
