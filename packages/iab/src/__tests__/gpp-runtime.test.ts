/** @vitest-environment jsdom */
import { createConsentRuntime } from '@c15t/core/runtime';
import { offline } from '@c15t/core/transports';
import { policyRulePresets } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';

import type { GPPPingData } from '../gpp';

const ping = (): GPPPingData | undefined => {
	let data: GPPPingData | undefined;
	window.__gpp?.('ping', (result) => {
		data = result as GPPPingData;
	});
	return data;
};

afterEach(() => {
	delete window.__gpp;
});

test('the runtime gpp option mounts __gpp from @c15t/iab/gpp and removes it on dispose', async () => {
	const runtime = createConsentRuntime({
		gpp: { usFallback: 'none' },
		loadGPP: () => import('../gpp'),
		mode: offline({
			policyRules: [
				{ ...policyRulePresets.californiaOptOut(), match: { isDefault: true } },
			],
		}),
		overrides: { country: 'US', region: 'CA' },
		persistence: false,
	});
	runtime.start();

	await vi.waitFor(() =>
		expect(ping()).toMatchObject({
			applicableSections: [8],
			cmpStatus: 'loaded',
			signalStatus: 'ready',
			supportedAPIs: expect.not.arrayContaining(['7:usnat']),
		})
	);

	runtime.dispose();
	expect(window.__gpp).toBeUndefined();
});
