/**
 * A backend policy that uses the `iab` model, on a site without `iab`, in
 * the browser.
 *
 * The server render throws for a page it resolves; see
 * `iab-unavailable.test.ts`. A page the browser resolves itself, such as a
 * prerendered one, throws there: at boot for a config that already carries
 * the vendor list, or as an uncaught error once `/init` sends it.
 */
import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { IAB_UNAVAILABLE_ERROR_CODE } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AstroConsentClient } from '../client';
import { boot } from '../client';
import { resolveOptions } from '../integration';
import { iabInitResponse, SITE_WITHOUT_IAB } from './iab-policy-fixture';
import { testResolution } from './policy-fixture';

const globals = window as unknown as Record<string, unknown>;
let client: AstroConsentClient | null = null;
const SITE = { ...SITE_WITHOUT_IAB, scripts: undefined };

beforeEach(() => {
	document.body.innerHTML = '';
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		document.cookie = `${cookie.split('=')[0]?.trim()}=; max-age=0; path=/`;
	}
	globals.__c15tAstro = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	globals.__c15tAstroConfig = undefined;
});

describe('an `iab` policy on a site without `iab`', () => {
	it('throws at boot for a config that carries the vendor list', () => {
		globals.__c15tAstroConfig = {
			initialIab: { cmpId: 28, enabled: true, gvl: MINIMAL_GVL },
			initialPolicyResolution: testResolution({
				categories: ['marketing'],
				model: 'iab',
			}),
			initialTranslations: { language: 'en', translations: {} },
		};

		expect(() => boot(resolveOptions(SITE))).toThrow(
			expect.objectContaining({ code: IAB_UNAVAILABLE_ERROR_CODE })
		);
	});

	it.each(['inline', 'reference'] as const)(
		'throws once /init sends the vendor list by %s',
		async (gvl) => {
			const thrown: unknown[] = [];
			// The client throws from a microtask, outside the kernel's listener
			// loop; run it here to catch what would reach the console.
			vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((task) => {
				try {
					task();
				} catch (error) {
					thrown.push(error);
				}
			});
			vi.stubGlobal(
				'fetch',
				vi.fn(() => Promise.resolve(iabInitResponse(gvl)))
			);
			globals.__c15tAstroConfig = { initialPolicyPending: true };
			client = boot(resolveOptions(SITE));

			await vi.waitFor(() => {
				expect(thrown).toHaveLength(1);
			});
			expect(thrown[0]).toMatchObject({ code: IAB_UNAVAILABLE_ERROR_CODE });
		}
	);

	it('shows the banner when the backend turns IAB off with `gvl: null`', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(iabInitResponse('null')))
		);
		globals.__c15tAstroConfig = { initialPolicyPending: true };
		client = boot(resolveOptions(SITE));

		await vi.waitFor(() => {
			expect(client?.getConsent().policyPending).toBe(false);
		});
		expect(client.getConsent().model).toBe('opt-in');
		expect(client.getConsent().activeUI).toBe('banner');
	});
});
