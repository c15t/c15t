import { policyRulePresets, resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offline as offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';

interface PingData {
	applicableSections: number[];
	cmpStatus: string;
}

type GPPWindow = Window & {
	__gpp?: (command: string, callback: (data: unknown) => void) => void;
	__c15tAstro?: unknown;
	__c15tAstroConfig?: unknown;
};

const gppWindow = window as GPPWindow;

const RULE = {
	...policyRulePresets.californiaOptOut(),
	match: { isDefault: true },
};

/** What the server inlines for a visitor in California. */
const CALIFORNIA_CONFIG = {
	initialLocation: { countryCode: 'US', regionCode: 'CA' },
	initialPolicyResolution: resolvePolicyRules({
		countryCode: 'US',
		regionCode: 'CA',
		rules: [RULE],
	}),
	initialTranslations: { language: 'en', translations: {} },
};

const ping = function ping(): PingData | undefined {
	let data: PingData | undefined;
	gppWindow.__gpp?.('ping', (result) => {
		data = result as PingData;
	});
	return data;
};

/**
 * Waits as long as a booted runtime would need to mount GPP: the module
 * import, which this caches, and the microtasks after it.
 */
const settle = async function settle(): Promise<void> {
	await import('@c15t/iab/gpp');
	// oxlint-disable-next-line promise/avoid-new -- One macrotask boundary.
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
};

let client: AstroConsentClient | null = null;

const start = function start(
	options: Partial<C15tAstroOptions>
): AstroConsentClient {
	gppWindow.__c15tAstroConfig = CALIFORNIA_CONFIG;
	client = boot(
		resolveOptions({
			consentCategories: ['necessary', 'marketing'],
			mode: offlineMode({ policyRules: [RULE] }),
			...options,
		})
	);
	return client;
};

beforeEach(() => {
	localStorage.clear();
	document.body.innerHTML = '';
	gppWindow.__c15tAstro = undefined;
	gppWindow.__c15tAstroConfig = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
	delete gppWindow.__gpp;
});

describe('the gpp option', () => {
	it('installs __gpp after boot and removes it on dispose', async () => {
		const booted = start({ gpp: true });

		await vi.waitFor(() =>
			expect(ping()).toMatchObject({
				applicableSections: [8],
				cmpStatus: 'loaded',
			})
		);

		booted.dispose();
		client = null;
		expect(gppWindow.__gpp).toBeUndefined();
	});

	it('hands its options object to the GPP CMP', async () => {
		start({ gpp: { usApproach: 'national' } });

		// The national approach reports `usnat` (7) instead of `usca` (8).
		await vi.waitFor(() =>
			expect(ping()).toMatchObject({ applicableSections: [7] })
		);
	});

	it('leaves __gpp alone when gpp is omitted or false', async () => {
		start({});
		await settle();
		expect(gppWindow.__gpp).toBeUndefined();

		client?.dispose();
		start({ gpp: false });
		await settle();
		expect(gppWindow.__gpp).toBeUndefined();
	});
});
