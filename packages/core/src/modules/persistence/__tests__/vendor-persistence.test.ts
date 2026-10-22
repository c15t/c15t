/**
 * @vitest-environment jsdom
 */
/**
 * Persistence module wiring for vendor denials: a recorded toggle writes
 * the sibling record, hydration reads it back, and `clear()` removes it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	noticeRule,
	NOW,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { readRequestConsent } from '../../../server/request-consent';
import { resolveRequestSubject } from '../../../server/request-subject';
import type { HydrationRecords, KernelVendorsState } from '../../../types';
import { watchRevocationReload } from '../../revocation-reload';
import { createPersistence } from '../index';
import {
	readStoredNoticeDismissal,
	readStoredVendorChoice,
	resolveStorageKeys,
} from '../record-storage';
import {
	encodeVendorChoiceCompact,
	writeStoredVendorChoice,
} from './record-writes';

const vendors: KernelVendorsState = {
	declared: [
		{
			category: 'marketing',
			id: 'meta-pixel',
			name: 'Meta Pixel',
			presentable: true,
			privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
			source: 'config',
		},
	],
	listVersion: null,
};

const clearAll = () => {
	window.localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(() => {
	clearAll();
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
	clearAll();
});

const createKernel = () =>
	createConsentKernel({
		// The runtime infers this from the declared vendor.
		consentCategories: ['marketing'],
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['marketing'] })
		),
		initialRecords: choiceRecords({ marketing: true }),
		initialVendors: vendors,
		now: NOW,
	});

describe('vendor persistence', () => {
	it('writes the denial list after a vendor-only save and hydrates it back', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
			ok: true,
			record: { confirmedAt: NOW, denied: ['meta-pixel'], version: 1 },
		});
		persistence.dispose();
		kernel.dispose();

		const fresh = createKernel();
		const rehydrated = createPersistence({ kernel: fresh, now: () => NOW });
		expect(fresh.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		rehydrated.dispose();
		fresh.dispose();
	});

	it('keeps a timestamped empty record when a bulk action clears every denial', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		await kernel.commands.save('all');
		await vi.runAllTimersAsync();
		// The time is what lets a later merge know this clear is newer than an
		// older server denial, so it is written rather than removed.
		expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
			ok: true,
			record: { confirmedAt: NOW, denied: [], version: 1 },
		});
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual([]);
		persistence.dispose();
		kernel.dispose();
	});

	it('keeps the subject a vendor-only first act created across a reload', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialVendors: vendors,
			now: NOW,
		});
		const persistence = createPersistence({ kernel, now: () => NOW });
		// No category receipt exists yet, so the consent envelope is never
		// written; the subject has to travel with the vendor record instead.
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		const { subjectId } = kernel.getSnapshot().subject ?? {};
		expect(subjectId).toBeTruthy();
		persistence.dispose();
		kernel.dispose();

		const fresh = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialVendors: vendors,
			now: NOW,
		});
		const rehydrated = createPersistence({ kernel: fresh, now: () => NOW });
		expect(fresh.getSnapshot().subject?.subjectId).toBe(subjectId);
		expect(fresh.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		rehydrated.dispose();
		fresh.dispose();
	});

	it('a category save that resolves the subject leaves a stored denial alone', async () => {
		// A denial written by another tab or an earlier session that this kernel
		// never hydrated.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialVendors: vendors,
			now: NOW,
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'sub_srv' }),
			},
		});
		const persistence = createPersistence({
			kernel,
			now: () => NOW,
			skipHydration: true,
		});
		// Fake timers are on: let the transport round trip and the write
		// schedulers run before awaiting the save.
		const saved = kernel.commands.save({ marketing: true });
		await vi.runAllTimersAsync();
		await saved;
		await vi.runAllTimersAsync();
		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_srv');
		expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
			ok: true,
			record: { denied: ['meta-pixel'] },
		});
		persistence.dispose();
		kernel.dispose();
	});

	it('reads the newer of the two projections when the cookie write was dropped', () => {
		// First act: both projections agree.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1000, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		// Second act: the browser keeps the cookie assignment but stores
		// nothing, the way an over-limit cookie fails, so only localStorage
		// carries the newer list.
		const descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		);
		const frozen = document.cookie;
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => frozen,
			set: () => {
				// Accepted and dropped.
			},
		});
		try {
			const written = writeStoredVendorChoice(
				{
					confirmedAt: NOW - 1,
					denied: ['google-ads', 'meta-pixel'],
					version: 1,
				},
				undefined,
				NOW
			);
			expect(written.ok && written.written?.cookie).toBe(false);
			expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
				ok: true,
				record: { confirmedAt: NOW - 1, denied: ['google-ads', 'meta-pixel'] },
			});
		} finally {
			if (descriptor) {
				Object.defineProperty(document, 'cookie', descriptor);
			} else {
				delete (document as { cookie?: string }).cookie;
			}
		}
	});

	it('prefers the localStorage copy when both projections carry the same time', () => {
		// The subject rewrite after `subject:resolved` keeps the decision's
		// time. When the enlarged cookie is dropped and only localStorage took
		// the rewrite, the tie must go to the copy that saw it, or the next
		// load restores the provisional subject.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		const descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		);
		const frozen = document.cookie;
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => frozen,
			set: () => {
				// Accepted and dropped.
			},
		});
		try {
			writeStoredVendorChoice(
				{
					confirmedAt: NOW - 1,
					denied: ['meta-pixel'],
					subject: { subjectId: 'sub_canonical' },
					version: 1,
				},
				undefined,
				NOW
			);
			expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
				ok: true,
				record: { subject: { subjectId: 'sub_canonical' } },
			});
		} finally {
			if (descriptor) {
				Object.defineProperty(document, 'cookie', descriptor);
			} else {
				delete (document as { cookie?: string }).cookie;
			}
		}
	});

	it('a prefetch seed still yields to a newer localStorage vendor record', () => {
		// The cookie carries the older list a server render prefetched; only
		// localStorage holds the list this browser saved last, because the
		// cookie write was dropped.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1000, denied: [], version: 1 },
			undefined,
			NOW
		);
		const descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		);
		const frozen = document.cookie;
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => frozen,
			set: () => {
				// Accepted and dropped.
			},
		});
		try {
			writeStoredVendorChoice(
				{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
				undefined,
				NOW
			);
			// Seeded from the prefetched cookie, so hydration is skipped.
			const kernel = createConsentKernel({
				initialPolicyResolution: matchedResolution(
					optInRule({ categories: ['marketing'] })
				),
				initialRecords: {
					...choiceRecords({ marketing: true }),
					vendorChoice: { confirmedAt: NOW - 1000, denied: [], version: 1 },
				},
				initialVendors: vendors,
				now: NOW,
			});
			const persistence = createPersistence({
				kernel,
				now: () => NOW,
				skipHydration: true,
			});
			expect(kernel.getSnapshot().vendorChoice).toEqual({
				confirmedAt: NOW - 1,
				denied: ['meta-pixel'],
				version: 1,
			});
			// The category records stay as the server seeded them.
			expect(
				kernel.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(true);
			persistence.dispose();
			kernel.dispose();
		} finally {
			if (descriptor) {
				Object.defineProperty(document, 'cookie', descriptor);
			} else {
				delete (document as { cookie?: string }).cookie;
			}
		}
	});

	it('clear() removes the stored record and the in-memory denials', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		persistence.clear();
		expect(readStoredVendorChoice(undefined, NOW)).toBeNull();
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		persistence.dispose();
		kernel.dispose();
	});
});

describe('vendor-only subject through a server render', () => {
	const vendorOnlyKernel = (initialRecords?: HydrationRecords) =>
		createConsentKernel({
			consentCategories: ['marketing'],
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialRecords,
			initialVendors: vendors,
			now: NOW,
		});
	const cookieValue = (name: string) => {
		const pair = document.cookie
			.split('; ')
			.find((part) => part.startsWith(`${name}=`));
		return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
	};
	const serverRender = () => {
		const subject = resolveRequestSubject({
			now: NOW,
			request: { cookie: document.cookie, url: 'https://example.com/' },
		});
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: NOW,
			request: { cookie: subject?.cookie, headers: new Headers() },
		});
		return { initialRecords: state.initialRecords, subject };
	};
	const seed = (initialRecords?: HydrationRecords) => {
		const kernel = vendorOnlyKernel(initialRecords);
		const handle = createPersistence({
			kernel,
			now: () => NOW,
			skipHydration: true,
		});
		return { handle, kernel };
	};
	const savedVisitor = async () => {
		const kernel = vendorOnlyKernel();
		const handle = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		return { handle, kernel };
	};

	it('a dropped vendor cookie rewrite does not bring the old ID back', async () => {
		const { handle, kernel } = await savedVisitor();
		const old = kernel.getSnapshot().subject?.subjectId;
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		const drop = vi
			.spyOn(document, 'cookie', 'set')
			.mockImplementation((value: string) => {
				if (!value.startsWith('c15t-vendors=')) {
					setter?.call(document, value);
				}
			});
		try {
			kernel.set.subjectId('sub_next');
			await vi.runAllTimersAsync();
		} finally {
			drop.mockRestore();
		}
		handle.dispose();
		kernel.dispose();

		const { initialRecords, subject } = serverRender();
		expect(subject?.subjectId).toBe(old);
		expect(subject?.setCookie).toBeNull();
		const seeded = seed(initialRecords);
		expect(seeded.kernel.getSnapshot().subject?.subjectId).toBe('sub_next');
		expect(seeded.kernel.getSnapshot().vendorChoice?.denied).toEqual([
			'meta-pixel',
		]);
		expect(cookieValue('c15t-sid')).toBe('sub_next');
		expect(localStorage.getItem('c15t-sid')).toBe('sub_next');
		seeded.handle.dispose();
		seeded.kernel.dispose();
	});

	// The vendor reader keeps the local subject on an equal time, as if the
	// cookie missed a rewrite. A sibling subdomain's rewrite at the same
	// time looks the same from here. A seeded start resolves it as a
	// hydrating load does, and leaves the shared subject cookie alone.
	it('a sibling vendor rewrite at the same time leaves the shared subject cookie alone, and a later vendor save republishes the local ID', async () => {
		const { handle, kernel } = await savedVisitor();
		const local = kernel.getSnapshot().subject?.subjectId;
		const record = kernel.getSnapshot().vendorChoice;
		if (!record) {
			throw new Error('Expected a vendor decision');
		}
		handle.dispose();
		kernel.dispose();
		document.cookie = `c15t-vendors=${encodeVendorChoiceCompact({ ...record, subject: { subjectId: 'sub_sibling' } })}; path=/`;
		document.cookie = 'c15t-sid=sub_sibling; path=/';

		const { initialRecords, subject } = serverRender();
		expect(subject?.subjectId).toBe('sub_sibling');
		expect(subject?.setCookie).toBeNull();
		const seeded = seed(initialRecords);
		expect(cookieValue('c15t-sid')).toBe('sub_sibling');
		const hydrating = vendorOnlyKernel();
		const hydratingHandle = createPersistence({
			kernel: hydrating,
			now: () => NOW,
		});
		expect(seeded.kernel.getSnapshot().subject?.subjectId).toBe(
			hydrating.getSnapshot().subject?.subjectId
		);
		expect(cookieValue('c15t-sid')).toBe('sub_sibling');
		// Focus and a storage event check the subject cookie again. The record
		// cookies name the sibling's ID too, so neither runtime writes its own
		// ID over it.
		window.dispatchEvent(new Event('focus'));
		window.dispatchEvent(new StorageEvent('storage', { key: 'c15t-sid' }));
		await vi.runAllTimersAsync();
		expect(cookieValue('c15t-sid')).toBe('sub_sibling');
		expect(seeded.kernel.getSnapshot().vendorChoice?.denied).toEqual([
			'meta-pixel',
		]);
		hydratingHandle.dispose();
		hydrating.dispose();

		// Accepted limit: equal receipt times keep the local copy's ID, so this
		// origin runs on it, and its next explicit vendor save stores it in the
		// shared vendor cookie. The save records no category choice and grants
		// no category.
		expect(seeded.kernel.getSnapshot().subject?.subjectId).toBe(local);
		await seeded.kernel.commands.save({}, { vendors: { 'meta-pixel': true } });
		await vi.runAllTimersAsync();
		expect(seeded.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(seeded.kernel.getSnapshot().effectivePermissions.marketing).toBe(
			false
		);
		expect(seeded.kernel.getSnapshot().vendorChoice?.denied).toEqual([]);
		expect(serverRender().subject?.subjectId).toBe(local);
		expect(cookieValue('c15t-sid')).toBe('sub_sibling');
		seeded.handle.dispose();
		seeded.kernel.dispose();
	});
});

// A save under a notice prompt acknowledges the notice, and a save that
// confirms no category records only the vendor decision. The acknowledgement
// it records is stored with that decision.
describe('a vendor-only save under a notice', () => {
	const recorded = (kernel: ReturnType<typeof createConsentKernel>) => {
		const events: string[] = [];
		for (const type of [
			'choice:recorded',
			'notice:dismissed',
			'vendors:recorded',
		] as const) {
			kernel.events.on(type, () => events.push(type));
		}
		return events;
	};
	const storedDismissedAt = () => {
		const notice = readStoredNoticeDismissal(undefined, Date.now());
		return notice?.ok ? notice.record.dismissedAt : null;
	};
	// Counts the notice record's localStorage writes from now on.
	const countNoticeWrites = () => {
		const key = resolveStorageKeys().notice;
		const setItem = vi.spyOn(window.localStorage, 'setItem');
		const values = () =>
			setItem.mock.calls
				.filter(([name]) => name === key)
				.map(([, value]) => value);
		return {
			count: () => values().length,
			// Times of the acknowledgements written.
			dismissedAts: () =>
				values().map(
					(value) => (JSON.parse(value) as { dismissedAt: number }).dismissedAt
				),
			restore: () => setItem.mockRestore(),
		};
	};
	const settle = async (saving: Promise<unknown>) => {
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		await vi.advanceTimersByTimeAsync(0);
	};

	it('stores the acknowledgement, so a reload keeps the notice dismissed', async () => {
		const initialPolicyResolution = matchedResolution(noticeRule());
		const kernel = createConsentKernel({
			initialPolicyResolution,
			initialVendors: vendors,
			transport: { save: () => Promise.resolve({ ok: true }) },
		});
		const handle = createPersistence({ kernel });
		const events = recorded(kernel);
		// Switching off a granted vendor reloads the page once saves settle.
		const reloads: (number | null)[] = [];
		const stopReload = watchRevocationReload({
			kernel,
			reload: () => reloads.push(storedDismissedAt()),
		});
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');

		vi.advanceTimersByTime(1000);
		await settle(
			kernel.commands.save({}, { vendors: { 'meta-pixel': false } })
		);
		const saved = kernel.getSnapshot();
		expect(events).toEqual(['vendors:recorded']);
		expect(saved.explicitChoice).toBeNull();
		expect(saved.vendorChoice?.denied).toEqual(['meta-pixel']);
		const actionAt = saved.vendorChoice?.confirmedAt;
		expect(saved.noticeDismissal?.dismissedAt).toBe(actionAt);
		await vi.waitFor(() => expect(reloads).toHaveLength(1));
		// The acknowledgement is stored before the reload runs.
		expect(reloads).toEqual([actionAt]);
		const notice = readStoredNoticeDismissal(undefined, Date.now());
		expect(notice?.ok && notice.record.subject?.subjectId).toBe(
			saved.subject?.subjectId
		);
		expect(document.cookie).toContain(`${resolveStorageKeys().noticeSubject}=`);
		stopReload();
		handle.dispose();
		kernel.dispose();

		const restored = createConsentKernel({
			initialPolicyResolution,
			initialVendors: vendors,
		});
		const reader = createPersistence({ kernel: restored });
		const snapshot = restored.getSnapshot();
		expect(snapshot.promptRequirement.kind).toBe('none');
		expect(snapshot.noticeDismissal).toEqual(saved.noticeDismissal);
		expect(snapshot.vendorChoice).toEqual(saved.vendorChoice);
		expect(snapshot.subject).toEqual(saved.subject);
		expect(snapshot.explicitChoice).toBeNull();
		reader.dispose();
		restored.dispose();
	});

	it('leaves an earlier acknowledgement as stored', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			initialVendors: vendors,
			transport: { save: () => Promise.resolve({ ok: true }) },
		});
		const handle = createPersistence({ kernel });
		await settle(kernel.commands.dismissNotice());
		const dismissedAt = storedDismissedAt();
		expect(dismissedAt).toBe(kernel.getSnapshot().noticeDismissal?.dismissedAt);
		vi.advanceTimersByTime(1000);
		// Only what the save writes counts.
		const events = recorded(kernel);
		const writes = countNoticeWrites();
		await settle(
			kernel.commands.save({}, { vendors: { 'meta-pixel': false } })
		);
		expect(events).toEqual(['vendors:recorded']);
		// The save records no new acknowledgement.
		expect(writes.dismissedAts().filter((at) => at !== dismissedAt)).toEqual(
			[]
		);
		expect(storedDismissedAt()).toBe(dismissedAt);
		expect(kernel.getSnapshot().noticeDismissal?.dismissedAt).toBe(dismissedAt);
		writes.restore();
		handle.dispose();
		kernel.dispose();
	});

	// Each of these saves already writes its acknowledgement through its own
	// event; the vendor decision adds no second write.
	it.each([
		{
			events: ['choice:recorded', 'vendors:recorded'],
			name: 'a notice save that also confirms a category',
			rule: noticeRule(),
			values: { marketing: true },
		},
		{
			events: ['vendors:recorded', 'notice:dismissed'],
			name: 'a choice prompt with nothing to decide',
			rule: optInRule({ categories: ['marketing'] }),
			values: {},
		},
	])('writes the acknowledgement once for $name', async (control) => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(control.rule),
			initialVendors: vendors,
			transport: { save: () => Promise.resolve({ ok: true }) },
		});
		const handle = createPersistence({ kernel });
		const events = recorded(kernel);
		const writes = countNoticeWrites();
		await settle(
			kernel.commands.save(control.values, {
				vendors: { 'meta-pixel': false },
			})
		);
		expect(events).toEqual(control.events);
		expect(writes.count()).toBe(1);
		expect(storedDismissedAt()).toBe(
			kernel.getSnapshot().noticeDismissal?.dismissedAt
		);
		writes.restore();
		handle.dispose();
		kernel.dispose();
	});

	it('stores no acknowledgement under a choice prompt with a category to decide', async () => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary', 'marketing'],
			initialPolicyResolution: matchedResolution(optInRule()),
			initialVendors: vendors,
			transport: { save: () => Promise.resolve({ ok: true }) },
		});
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toContain(
			'marketing'
		);
		const handle = createPersistence({ kernel });
		const events = recorded(kernel);
		const writes = countNoticeWrites();
		await settle(
			kernel.commands.save({}, { vendors: { 'meta-pixel': false } })
		);
		expect(events).toEqual(['vendors:recorded']);
		expect(kernel.getSnapshot().noticeDismissal).toBeNull();
		expect(writes.count()).toBe(0);
		expect(storedDismissedAt()).toBeNull();
		writes.restore();
		handle.dispose();
		kernel.dispose();
	});
});
