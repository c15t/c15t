import { createConsentKernel } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { testRule, testResolution } from './policy-fixture';

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

const resolve = async function resolve(
	cookieHeader: string,
	options: Partial<C15tAstroOptions> = {}
) {
	return await resolveConsentContext({
		headers: new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
		options: resolveOptions({
			mode: offlineMode({ policyRules: [testRule] }),
			...options,
		}),
	});
};

beforeEach(() => {
	vi.useFakeTimers();
	clearCookies();
});

afterEach(() => vi.useRealTimers());

/** Acknowledge a banner that offered only strictly necessary. */
const saveAcknowledgement = async () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: testResolution(),
		now: Date.now(),
	});
	const persistence = createPersistence({ kernel });
	await kernel.commands.save('all');
	vi.advanceTimersByTime(0);
	persistence.dispose();
	kernel.dispose();
};

const saveReceipt = async (value: boolean) => {
	const kernel = createConsentKernel({
		// The earlier page offered the policy's categories.
		consentCategories: ['marketing', 'measurement'],
		initialPolicyResolution: testResolution(),
		now: Date.now(),
	});
	const persistence = createPersistence({ kernel });
	await kernel.commands.save(value ? 'all' : 'none');
	vi.advanceTimersByTime(0);
	persistence.dispose();
	kernel.dispose();
};

describe('cookie round-trip', () => {
	it('hides the banner for a visitor who already consented', async () => {
		await saveReceipt(true);
		expect(document.cookie).not.toBe('');

		const context = await resolve(document.cookie);
		expect(context.config.initialRecords?.choice).not.toBeNull();
		expect(context.snapshot.explicitChoice?.categories.marketing?.value).toBe(
			true
		);
		expect(context.snapshot.explicitChoice).not.toBeNull();
		expect(context.shouldShowBanner).toBe(false);
	});

	it('hides the banner after an explicit rejection', async () => {
		await saveReceipt(false);

		const context = await resolve(document.cookie);
		// A recorded decision, even a decline, is still a decision.
		expect(context.config.initialRecords?.choice).not.toBeNull();
		expect(context.snapshot.explicitChoice?.categories.marketing?.value).toBe(
			false
		);
		expect(context.shouldShowBanner).toBe(false);
	});

	it('shows the banner when there is no cookie', async () => {
		const context = await resolve('');
		expect(context.config.initialRecords?.choice).toBeNull();
		expect(context.shouldShowBanner).toBe(true);
	});

	it('ignores an unrelated cookie', async () => {
		const context = await resolve('session=abc; theme=dark');
		expect(context.shouldShowBanner).toBe(true);
	});

	it('hides the banner for a visitor who acknowledged a necessary-only banner', async () => {
		await saveAcknowledgement();

		const context = await resolve(document.cookie);
		expect(context.snapshot.evaluationPolicy.choiceScope).toEqual([]);
		expect(context.shouldShowBanner).toBe(false);
	});

	it('judges a stored visitor against the categories the page scripts declare', async () => {
		const scripts = [
			{ category: 'marketing' as const, id: 'ads', src: '/ads.js' },
		];
		await saveAcknowledgement();

		// The browser runtime asks about marketing for this page, so the server
		// must render the banner too rather than let it appear after boot.
		const acknowledged = await resolve(document.cookie, { scripts });
		expect(acknowledged.snapshot.evaluationPolicy.choiceScope).toEqual([
			'marketing',
		]);
		expect(acknowledged.shouldShowBanner).toBe(true);

		clearCookies();
		await saveReceipt(true);
		const accepted = await resolve(document.cookie, { scripts });
		expect(accepted.shouldShowBanner).toBe(false);
	});

	it('judges a stored visitor against the configured categories', async () => {
		await saveAcknowledgement();

		const context = await resolve(document.cookie, {
			consentCategories: ['necessary', 'measurement'],
		});
		expect(context.snapshot.evaluationPolicy.choiceScope).toEqual([
			'measurement',
		]);
		expect(context.shouldShowBanner).toBe(true);
	});
});
