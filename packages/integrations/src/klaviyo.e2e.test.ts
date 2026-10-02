/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { klaviyo } from './vendors/email-and-sms/klaviyo';

const LOADER_SRC = 'https://static.klaviyo.com/onsite/js/AbC123/klaviyo.js';

const bothGranted = {
	...deniedConsents,
	marketing: true,
	measurement: true,
};

const getLoaders = function getLoaders(): HTMLScriptElement[] {
	return [...document.querySelectorAll<HTMLScriptElement>('script')].filter(
		(element) => element.src === LOADER_SRC
	);
};

describe('Klaviyo loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.klaviyo;
		delete window._klOnsite;
		// oxlint-disable-next-line unicorn/no-document-cookie -- Resets the opt-out cookie between tests.
		document.cookie = '__kla_off=; path=/; max-age=0';
	});

	it('loads once, only after both marketing and measurement are granted', () => {
		const scripts = [klaviyo({ publicApiKey: 'AbC123' })];

		loadScripts(scripts, deniedConsents);
		expect(getLoaders()).toHaveLength(0);
		updateScripts(scripts, grantedMarketingConsents);
		expect(getLoaders()).toHaveLength(0);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(getLoaders()).toHaveLength(0);
		expect(window.klaviyo).toBeUndefined();

		const result = updateScripts(scripts, bothGranted);
		expect(result.loaded).toEqual(['klaviyo']);
		const [loader] = getLoaders();
		expect(loader?.async).toBe(true);
		expect(getLoaders()).toHaveLength(1);

		updateScripts(scripts, { ...bothGranted, functionality: true });
		expect(getLoaders()).toHaveLength(1);
	});

	it('removes the loader on revocation without claiming runtime cleanup', () => {
		const scripts = [klaviyo({ publicApiKey: 'AbC123' })];
		loadScripts(scripts, bothGranted);
		const stub = window.klaviyo;
		expect(getLoaders()).toHaveLength(1);

		const result = updateScripts(scripts, grantedMarketingConsents);

		// Only the loader element goes. Code Klaviyo.js already ran stays until
		// c15t reloads the page, so the helper leaves the onsite object alone.
		expect(result.unloaded).toEqual(['klaviyo']);
		expect(getLoaders()).toHaveLength(0);
		expect(window.klaviyo).toBe(stub);
	});

	it('stays unloaded while the klaviyo vendor is switched off', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [klaviyo({ publicApiKey: 'AbC123' })],
		});
		try {
			expect(kernel.getSnapshot().vendors?.declared).toEqual([
				expect.objectContaining({
					category: { and: ['marketing', 'measurement'] },
					id: 'klaviyo',
				}),
			]);

			await kernel.commands.save(
				{ marketing: true, measurement: true },
				{ vendors: { klaviyo: false } }
			);
			expect(getLoaders()).toHaveLength(0);

			await kernel.commands.save(
				{ marketing: true, measurement: true },
				{ vendors: { klaviyo: true } }
			);
			expect(getLoaders()).toHaveLength(1);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('enforces a custom consent condition', () => {
		const scripts = [
			klaviyo({
				category: { or: ['marketing', 'functionality'] },
				publicApiKey: 'AbC123',
			}),
		];

		loadScripts(scripts, grantedMeasurementConsents);
		expect(getLoaders()).toHaveLength(0);
		updateScripts(scripts, { ...deniedConsents, functionality: true });
		expect(getLoaders()).toHaveLength(1);
	});

	it('seeds the onsite object before the loader and queues no calls', () => {
		let queuedAtAppend: unknown[] | undefined;
		installHeadProbe((element, win) => {
			if (element.src === LOADER_SRC) {
				queuedAtAppend = [...((win as Window)._klOnsite ?? [])];
			}
		});

		loadScripts([klaviyo({ publicApiKey: 'AbC123' })], bothGranted);

		expect(queuedAtAppend).toEqual([]);
		expect(typeof window.klaviyo?.track).toBe('function');
	});

	it('sets the opt-out cookie before inserting the forms-only loader', () => {
		let cookieAtAppend: string | undefined;
		installHeadProbe((element) => {
			if (element.src === LOADER_SRC) {
				// oxlint-disable-next-line unicorn/no-document-cookie -- Reads the cookie Klaviyo.js sees on start.
				cookieAtAppend = document.cookie;
			}
		});
		const scripts = [klaviyo({ mode: 'forms-only', publicApiKey: 'AbC123' })];

		loadScripts(scripts, grantedMeasurementConsents);
		expect(getLoaders()).toHaveLength(0);
		// oxlint-disable-next-line unicorn/no-document-cookie -- No opt-out cookie before the helper runs.
		expect(document.cookie).not.toContain('__kla_off');

		updateScripts(scripts, grantedMarketingConsents);
		expect(getLoaders()).toHaveLength(1);
		expect(cookieAtAppend).toContain('__kla_off=true');
	});

	it('does not set the opt-out cookie in full mode', () => {
		loadScripts([klaviyo({ publicApiKey: 'AbC123' })], bothGranted);

		expect(getLoaders()).toHaveLength(1);
		// oxlint-disable-next-line unicorn/no-document-cookie -- Full mode leaves Klaviyo tracking on.
		expect(document.cookie).not.toContain('__kla_off');
	});
});
