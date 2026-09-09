import { createConsentKernel } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
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

const resolve = async function resolve(cookieHeader: string) {
	return await resolveConsentContext({
		headers: new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
		options: resolveOptions({ mode: offlineMode({ policyRules: [testRule] }) }),
	});
};

beforeEach(() => {
	vi.useFakeTimers();
	clearCookies();
});

afterEach(() => vi.useRealTimers());

const saveReceipt = async (value: boolean) => {
	const kernel = createConsentKernel({
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
});
