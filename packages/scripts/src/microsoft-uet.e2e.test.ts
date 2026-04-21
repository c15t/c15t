/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMarketingConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
} from './e2e-test-utils';
import { microsoftUet } from './microsoft-uet';

describe('microsoftUet contract', () => {
	registerVendorContractCleanup();

	it('boots with constructor handoff and a consent-default push', () => {
		const constructorArgs: Record<string, unknown>[] = [];
		const pushCalls: unknown[][] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('bat.js')) {
				return;
			}

			win.UET = function UET(
				this: { push: (...args: unknown[]) => void },
				options
			) {
				constructorArgs.push(options);
				this.push = (...args: unknown[]) => {
					pushCalls.push(args);
				};
				return this;
			} as TestWindow['UET'];

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...microsoftUet({ id: 'UET-CONTRACT' }),
					id: 'microsoft-uet-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(constructorArgs).toHaveLength(1);
		expect(constructorArgs[0]).toMatchObject({
			ti: 'UET-CONTRACT',
			enableAutoSpaTracking: true,
			q: [],
		});
		expect(pushCalls).toEqual([
			['pageLoad'],
			['consent', 'default', { ad_storage: 'granted' }],
		]);
	});
});
