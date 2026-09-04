import { saveConsentToStorage } from '@c15t/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';

/**
 * The returning-visitor contract, end to end.
 *
 * The browser writes the consent cookie and the server reads it back with
 * the same parser. If the two ever disagreed, every returning visitor would
 * get the banner rendered into their first HTML — the exact flicker the
 * server path exists to prevent — so this round-trips the real writer
 * rather than a hand-written cookie string.
 */

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
	localStorage.clear();
};

const resolve = async function resolve(cookieHeader: string) {
	return await resolveConsentContext({
		headers: new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
		options: resolveOptions({ mode: offlineMode() }),
	});
};

beforeEach(() => {
	clearCookies();
});

describe('cookie round-trip', () => {
	it('hides the banner for a visitor who already consented', async () => {
		saveConsentToStorage({
			consentInfo: { time: Date.now(), type: 'all' } as never,
			consents: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
		});
		expect(document.cookie).not.toBe('');

		const context = await resolve(document.cookie);
		expect(context.config.initialHasConsented).toBe(true);
		expect(context.config.initialConsents?.marketing).toBe(true);
		expect(context.snapshot.hasConsented).toBe(true);
		expect(context.shouldShowBanner).toBe(false);
	});

	it('still shows the banner when only necessary was accepted', async () => {
		saveConsentToStorage({
			consentInfo: { time: Date.now(), type: 'necessary' } as never,
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
		});

		const context = await resolve(document.cookie);
		// A recorded decision, even a decline, is still a decision.
		expect(context.config.initialHasConsented).toBe(true);
		expect(context.config.initialConsents?.marketing).toBe(false);
		expect(context.shouldShowBanner).toBe(false);
	});

	it('shows the banner when there is no cookie', async () => {
		const context = await resolve('');
		expect(context.config.initialHasConsented).toBeUndefined();
		expect(context.shouldShowBanner).toBe(true);
	});

	it('ignores an unrelated cookie', async () => {
		const context = await resolve('session=abc; theme=dark');
		expect(context.shouldShowBanner).toBe(true);
	});
});
