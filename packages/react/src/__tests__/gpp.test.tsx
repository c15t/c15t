/**
 * `ConsentGPP` from `@c15t/react/gpp`: it mounts `window.__gpp` on the
 * provider's kernel and removes it on unmount.
 */
import { createConsentRuntime } from '@c15t/core/runtime';
import type { GPPPingData } from '@c15t/iab/gpp';
import { policyRulePresets } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentGPP } from '../gpp';
import { offline } from '../index';
import { ConsentProvider } from '../provider';

const mode = offline({
	policyRules: [
		{ ...policyRulePresets.californiaOptOut(), match: { isDefault: true } },
	],
});
const overrides = { country: 'US', region: 'CA' };

const ping = (): GPPPingData | undefined => {
	let data: GPPPingData | undefined;
	window.__gpp?.('ping', (result) => {
		data = result as GPPPingData;
	});
	return data;
};

afterEach(() => {
	delete window.__gpp;
	vi.restoreAllMocks();
});

test('mounts __gpp on the provider kernel and unmount removes it', async () => {
	const screen = await render(
		<ConsentProvider options={{ mode, overrides, persistence: false }}>
			<ConsentGPP
				optOutCategories={['marketing']}
				usFallback="none"
			/>
		</ConsentProvider>
	);

	await vi.waitFor(() =>
		expect(ping()).toMatchObject({
			applicableSections: [8],
			cmpStatus: 'loaded',
			signalStatus: 'ready',
			supportedAPIs: expect.not.arrayContaining(['7:usnat']),
		})
	);

	await screen.unmount();
	expect(window.__gpp).toBeUndefined();
});

test('mounts on a borrowed runtime too', async () => {
	const runtime = createConsentRuntime({ mode, overrides, persistence: false });
	runtime.start();
	const screen = await render(
		<ConsentProvider runtime={runtime}>
			<ConsentGPP />
		</ConsentProvider>
	);

	await vi.waitFor(() =>
		expect(ping()).toMatchObject({
			applicableSections: [8],
			supportedAPIs: expect.arrayContaining(['7:usnat', '8:usca']),
		})
	);
	await screen.unmount();
	runtime.dispose();
});

test('logs a mount failure and leaves the app rendered', async () => {
	const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
	// createGPP rejects a CMP ID that is neither 1 nor a registered ID.
	const screen = await render(
		<ConsentProvider options={{ mode, overrides, persistence: false }}>
			<ConsentGPP cmpId={-1} />
			<span>app</span>
		</ConsentProvider>
	);

	await expect.element(screen.getByText('app')).toBeVisible();
	expect(error).toHaveBeenCalledWith(
		'c15t: GPP was not installed.',
		expect.objectContaining({ message: expect.stringContaining('cmpId') })
	);
	expect(window.__gpp).toBeUndefined();
	await screen.unmount();
});
