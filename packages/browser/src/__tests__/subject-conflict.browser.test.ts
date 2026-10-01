/**
 * A visitor whose subject id another tenant already holds, in real Chromium
 * pages with default persistence: real cookies, localStorage and Web Locks.
 *
 * The kernel tests prove the reassignment logic with a fake storage and a
 * stubbed lock. These prove the parts only a browser can: that the new id is
 * what the next page load starts from, and that two pages replaying the same
 * queued save at the same moment agree on one id through the real lock.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, expect, it } from 'vitest';

import { TAKEN_SUBJECTS_KEY } from './fixtures/subject-conflict-page';
import type { SubjectConflictPage } from './fixtures/subject-conflict-page';

const PENDING_SAVES_KEY = 'c15t-v3-pending-consent-saves:v1';

const opened: Window[] = [];

const openPage = async (query = ''): Promise<SubjectConflictPage> => {
	const tab = window.open(`/__c15t-test__/subject-conflict${query}`, '_blank');
	if (!tab) {
		throw new Error('The browser blocked the page');
	}
	opened.push(tab);
	const read = () =>
		(tab as Window & { c15tSubjectConflict?: SubjectConflictPage })
			.c15tSubjectConflict;
	await expect.poll(read, { timeout: 10_000 }).toBeDefined();
	const page = read() as SubjectConflictPage;
	await page.ready;
	return page;
};

const subjectOf = (page: SubjectConflictPage) =>
	page.client.getSnapshot().subject?.subjectId;

/** What another tenant claiming these ids looks like to the fake backend. */
const markTaken = (...ids: string[]) => {
	localStorage.setItem(TAKEN_SUBJECTS_KEY, JSON.stringify(ids));
};

afterEach(() => {
	for (const tab of opened.splice(0)) {
		tab.close();
	}
	clearBrowserConsentStorage();
});

it('a replacement subject id is what the next page load starts from', async () => {
	const first = await openPage();
	await first.recordOnly({ marketing: true });
	const taken = subjectOf(first) as string;
	expect(taken).toBeDefined();

	markTaken(taken);
	await expect(first.recordOnly({ measurement: true })).resolves.toMatchObject({
		ok: true,
	});
	const replacement = subjectOf(first) as string;
	expect(replacement).not.toBe(taken);
	expect(first.accepted).toEqual([taken, replacement]);

	// A fresh page load reads persistence, not the old page's memory.
	const reloaded = await openPage();
	expect(subjectOf(reloaded)).toBe(replacement);
	expect(
		reloaded.client.getSnapshot().explicitChoice?.categories.measurement?.value
	).toBe(true);

	// And its next save goes out under the replacement, not the refused id.
	await expect(
		reloaded.recordOnly({ marketing: false })
	).resolves.toMatchObject({ ok: true });
	expect(reloaded.accepted).toEqual([replacement]);
});

it('two pages replaying one queued save agree on one id through the real lock', async () => {
	// Both pages replay the same queued save, both are refused, and both
	// claim a replacement under the cross-tab Web Lock. Without the lock and
	// the stored claim, each page would pick its own id and one would persist
	// a subject the backend holds nothing for.
	const first = await openPage();
	await first.recordOnly({ marketing: true });
	const taken = subjectOf(first) as string;
	first.setOffline(true);
	await first.recordOnly({ measurement: true });
	expect(localStorage.getItem(PENDING_SAVES_KEY)).not.toBeNull();
	first.setOffline(false);

	// The second page replays the queue as it starts; `?hold` keeps that
	// replay waiting until the first page is replaying the same save too.
	markTaken(taken);
	const second = await openPage('?hold');
	expect(subjectOf(second)).toBe(taken);
	await expect.poll(() => second.held()).toBe(1);
	first.hold();
	await first.client.kernel.commands.init();
	await expect.poll(() => first.held()).toBe(1);
	first.release();
	second.release();

	await expect.poll(() => subjectOf(first)).not.toBe(taken);
	const replacement = subjectOf(first) as string;
	await expect.poll(() => subjectOf(second)).toBe(replacement);
	await expect.poll(() => localStorage.getItem(PENDING_SAVES_KEY)).toBeNull();
	// The queued save reached the backend, and only ever under the shared id.
	const sent = [...first.accepted, ...second.accepted].slice(1);
	expect(sent.length).toBeGreaterThan(0);
	expect(new Set(sent)).toEqual(new Set([replacement]));

	const reloaded = await openPage();
	expect(subjectOf(reloaded)).toBe(replacement);
	expect(
		reloaded.client.getSnapshot().explicitChoice?.categories.measurement?.value
	).toBe(true);
});
