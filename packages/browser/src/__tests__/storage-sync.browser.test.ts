/**
 * Two real Chromium pages of one origin share cookies and localStorage.
 * A choice made in one must reach the other without a reload.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, expect, it } from 'vitest';

import type { StorageSyncPage } from './fixtures/storage-sync-page';

const opened: Window[] = [];

const openPage = async (): Promise<StorageSyncPage> => {
	const tab = window.open('/__c15t-test__/storage-sync', '_blank');
	if (!tab) {
		throw new Error('The browser blocked the second page');
	}
	opened.push(tab);
	const read = () =>
		(tab as Window & { c15tStorageSync?: StorageSyncPage }).c15tStorageSync;
	await expect.poll(read, { timeout: 10_000 }).toBeDefined();
	const page = read() as StorageSyncPage;
	await page.ready;
	return page;
};

const measurement = (page: StorageSyncPage) =>
	page.client.getSnapshot().effectivePermissions.measurement;

afterEach(() => {
	for (const tab of opened.splice(0)) {
		tab.close();
	}
	clearBrowserConsentStorage();
});

it('a denial saved in one page reaches the other and notifies it', async () => {
	const first = await openPage();
	const second = await openPage();

	await first.client.acceptAll();
	await expect.poll(() => measurement(second)).toBe(true);

	const seen = first.notifications.length;
	await second.client.rejectAll();

	await expect.poll(() => measurement(first)).toBe(false);
	expect(first.notifications.slice(seen)).toContain(false);
	expect(first.notifications.at(-1)).toBe(false);
	expect(
		first.client.getSnapshot().explicitChoice?.categories.measurement?.value
	).toBe(false);
});

it('clearing records in one page returns the other to the policy default', async () => {
	const first = await openPage();
	const second = await openPage();

	await first.client.acceptAll();
	await expect.poll(() => measurement(second)).toBe(true);

	first.client.runtime.clearRecords();

	await expect.poll(() => second.client.hasConsented()).toBe(false);
	// Germany resolves to opt-in, so an undecided category is denied.
	expect(measurement(second)).toBe(false);
	expect(second.client.getSnapshot().activeUI).not.toBe('none');
	expect(second.notifications.at(-1)).toBe(false);
});

it('a clear and a partial save in one page do not bring back cleared categories in the other', async () => {
	const first = await openPage();
	const second = await openPage();

	await first.client.acceptAll();
	await expect.poll(() => measurement(second)).toBe(true);

	// One uninterrupted burst in the other page: clear, record one category,
	// land its write. The first page reconciles once, after all of it.
	second.client.runtime.clearRecords();
	void second.recordOnly({ marketing: false });
	second.client.runtime.reconcileStorage();

	const marketing = () =>
		first.client.getSnapshot().explicitChoice?.categories.marketing?.value;
	await expect.poll(marketing).toBe(false);
	// Granted before the clear and never decided again.
	expect(
		first.client.getSnapshot().explicitChoice?.categories.measurement
	).toBeUndefined();
	expect(measurement(first)).toBe(false);
});
