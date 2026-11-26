/**
 * @vitest-environment jsdom
 *
 * The subject ID persistence gives a browser runtime at startup, before
 * the visitor decides anything. It lives in memory until a save records
 * it; the `<key>-sid` copy c15t 3.2 stored is removed.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	noticeRule,
	NOW,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { hasStoredConsentRecord } from '../../../libs/journey';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { readRequestConsent } from '../../../server/request-consent';
import { resolveRequestSubject } from '../../../server/request-subject';
import type { ConsentKernel } from '../../../types';
import { createPersistence } from '../index';
import { readStoredConsentRecord } from '../record-storage';
import { clearStoredConsentRecords } from './record-writes';

const SID_KEY = `${STORAGE_KEY_V2}-sid`;
const disposers: (() => void)[] = [];

const expire = function expire(name: string): void {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	clearStoredConsentRecords();
	expire(`${STORAGE_KEY_V2}-epoch`);
	expire(SID_KEY);
});

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	clearStoredConsentRecords();
	expire(`${STORAGE_KEY_V2}-epoch`);
	expire(SID_KEY);
	vi.useRealTimers();
});

const boot = function boot(): {
	kernel: ConsentKernel;
	handle: ReturnType<typeof createPersistence>;
} {
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(optInRule()),
		now: NOW,
	});
	const handle = createPersistence({ kernel });
	disposers.push(() => handle.dispose());
	return { handle, kernel };
};

const subjectIdOf = function subjectIdOf(kernel: ConsentKernel) {
	return kernel.getSnapshot().subject?.subjectId;
};

const storedSid = function storedSid() {
	const cookie = document.cookie
		.split('; ')
		.find((pair) => pair.startsWith(`${SID_KEY}=`));
	return {
		cookie: cookie
			? decodeURIComponent(cookie.slice(SID_KEY.length + 1))
			: null,
		local: localStorage.getItem(SID_KEY),
	};
};

/** Every cookie and localStorage key on the page. */
const storedKeys = function storedKeys() {
	return {
		cookies: document.cookie
			.split('; ')
			.filter(Boolean)
			.map((pair) => pair.split('=')[0]),
		local: Object.keys(localStorage),
	};
};

test('a first visit gets a subject ID at startup and stores nothing', () => {
	const { kernel } = boot();
	const snapshot = kernel.getSnapshot();

	expect(subjectIdOf(kernel)).toMatch(/^sub_/u);
	expect(snapshot.explicitChoice).toBeNull();
	expect(snapshot.activeUI).toBe('banner');
	expect(storedSid()).toEqual({ cookie: null, local: null });
	expect(storedKeys()).toEqual({ cookies: [], local: [] });
	expect(hasStoredConsentRecord()).toBe(false);
});

test('a reload before any save starts with a new ID', () => {
	const first = boot();
	const subjectId = subjectIdOf(first.kernel);
	first.handle.dispose();

	const { kernel, handle } = boot();
	expect(subjectIdOf(kernel)).toMatch(/^sub_/u);
	expect(subjectIdOf(kernel)).not.toBe(subjectId);
	expect(kernel.getSnapshot().activeUI).toBe('banner');
	expect(handle.hydrate()).toBe(false);
});

test('a save keeps the startup ID and records it', async () => {
	const { kernel } = boot();
	const subjectId = subjectIdOf(kernel);

	await kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);

	expect(subjectIdOf(kernel)).toBe(subjectId);
	expect(readStoredConsentRecord(undefined, NOW).selected?.subject).toEqual({
		subjectId,
	});
	expect(hasStoredConsentRecord()).toBe(true);
	expect(storedSid()).toEqual({ cookie: null, local: null });
	expect(subjectIdOf(boot().kernel)).toBe(subjectId);
});

test.each([
	['cookie and localStorage', true, true],
	['cookie', true, false],
	['localStorage', false, true],
] as const)(
	'startup removes a %s copy c15t 3.2 stored and does not take its ID',
	(_, inCookie, inLocal) => {
		if (inCookie) {
			document.cookie = `${SID_KEY}=sub_legacy; path=/`;
		}
		if (inLocal) {
			localStorage.setItem(SID_KEY, 'sub_legacy');
		}

		const { kernel } = boot();

		expect(subjectIdOf(kernel)).toMatch(/^sub_/u);
		expect(subjectIdOf(kernel)).not.toBe('sub_legacy');
		expect(storedSid()).toEqual({ cookie: null, local: null });
	}
);

test('startup leaves storage alone when no c15t 3.2 copy exists', () => {
	const setCookie = vi.spyOn(document, 'cookie', 'set');
	const setItem = vi.spyOn(Storage.prototype, 'setItem');
	const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
	try {
		boot();
		expect(setCookie).not.toHaveBeenCalled();
		expect(setItem).not.toHaveBeenCalled();
		expect(removeItem).not.toHaveBeenCalled();
	} finally {
		setCookie.mockRestore();
		setItem.mockRestore();
		removeItem.mockRestore();
	}
});

test('a clear keeps the ID in memory, removes a c15t 3.2 copy, and a reload starts over', async () => {
	const first = boot();
	const subjectId = subjectIdOf(first.kernel);
	await first.kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);
	document.cookie = `${SID_KEY}=sub_legacy; path=/`;
	localStorage.setItem(SID_KEY, 'sub_legacy');

	first.handle.clear();
	expect(first.kernel.getSnapshot().explicitChoice).toBeNull();
	expect(subjectIdOf(first.kernel)).toBe(subjectId);
	expect(storedSid()).toEqual({ cookie: null, local: null });
	first.handle.dispose();

	const { kernel } = boot();
	expect(subjectIdOf(kernel)).not.toBe(subjectId);
	expect(kernel.getSnapshot().activeUI).toBe('banner');
});

test('removing the ID starts a new one and stores nothing', () => {
	const { kernel } = boot();
	const subjectId = subjectIdOf(kernel);

	kernel.set.subjectId(null);

	const next = subjectIdOf(kernel);
	expect(next).toMatch(/^sub_/u);
	expect(next).not.toBe(subjectId);
	expect(storedKeys()).toEqual({ cookies: [], local: [] });
});

test.each([
	['a new one', null],
	['one the app names', 'sub_app'],
] as const)(
	'replacing a saved ID with %s survives a reload',
	async (_, next) => {
		const first = boot();
		const saved = subjectIdOf(first.kernel);
		await first.kernel.commands.save({ measurement: true });
		vi.advanceTimersByTime(0);

		first.kernel.set.subjectId(next);
		const replaced = subjectIdOf(first.kernel);
		expect(replaced).not.toBe(saved);
		vi.advanceTimersByTime(0);
		first.handle.dispose();

		const { kernel } = boot();
		expect(subjectIdOf(kernel)).toBe(replaced);
		expect(kernel.getSnapshot().explicitChoice).not.toBeNull();
		expect(storedSid()).toEqual({ cookie: null, local: null });
	}
);

test('a seed from a stale consent cookie keeps the newer stored ID', async () => {
	const first = boot();
	await first.kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);
	const old = subjectIdOf(first.kernel) as string;
	const choice = first.kernel.getSnapshot().explicitChoice;
	const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
	// The browser drops the rewritten consent cookie, so a server render
	// still reads the old ID from it.
	Object.defineProperty(document, 'cookie', {
		configurable: true,
		get: () => cookie?.get?.call(document),
		set: (value: string) => {
			if (value.startsWith(`${STORAGE_KEY_V2}=`)) {
				return;
			}
			cookie?.set?.call(document, value);
		},
	});
	try {
		first.kernel.set.subjectId('sub_next');
		vi.advanceTimersByTime(0);
		first.handle.dispose();
	} finally {
		Reflect.deleteProperty(document, 'cookie');
	}

	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(optInRule()),
		initialRecords: { choice, subject: { subjectId: old } },
		now: NOW,
	});
	disposers.push(createPersistence({ kernel, skipHydration: true }).dispose);

	expect(subjectIdOf(kernel)).toBe('sub_next');
});

// A seed that names another ID than the stored records and did not come
// from the cookies, such as a backend's, knows something storage does not.
// Its ID stands, linked account included. A seed read from the cookies
// alone yields to storage (the test above).
test('a seed from a backend that names another ID keeps it over the stored records', async () => {
	const first = boot();
	await first.kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);
	const stored = subjectIdOf(first.kernel);
	const choice = first.kernel.getSnapshot().explicitChoice;
	first.handle.dispose();

	const seed = {
		externalId: 'account-a',
		identityProvider: 'app',
		subjectId: 'sub_backend',
	};
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(optInRule()),
		initialRecords: { choice, subject: seed },
		now: NOW,
	});
	disposers.push(createPersistence({ kernel, skipHydration: true }).dispose);

	expect(stored).not.toBe('sub_backend');
	expect(kernel.getSnapshot().subject).toEqual(seed);
});

// The same stale consent cookie, carried through a server render: the
// server reads the cookies alone and its render names the old ID, but the
// browser starts with the newer one localStorage holds.
test.each(['consent', 'all'] as const)(
	'a server render after a dropped %s cookie rewrite does not bring the old ID back',
	async (dropped) => {
		const first = boot();
		await first.kernel.commands.save({ measurement: true });
		vi.advanceTimersByTime(0);
		const old = subjectIdOf(first.kernel) as string;
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		const drop = vi
			.spyOn(document, 'cookie', 'set')
			.mockImplementation((value: string) => {
				if (dropped === 'consent' && !value.startsWith(`${STORAGE_KEY_V2}=`)) {
					setter?.call(document, value);
				}
			});
		try {
			first.kernel.set.subjectId('sub_next');
			vi.advanceTimersByTime(0);
			first.handle.dispose();
		} finally {
			drop.mockRestore();
		}

		expect(
			resolveRequestSubject({
				now: NOW,
				request: { cookie: document.cookie, url: 'https://example.com/' },
			})
		).toEqual({ cookie: document.cookie, setCookie: null, subjectId: old });
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: NOW,
			request: { cookie: document.cookie, headers: new Headers() },
		});
		expect(state.initialRecords?.subject?.subjectId).toBe(old);

		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(optInRule()),
			initialRecords: state.initialRecords,
			now: NOW,
		});
		disposers.push(createPersistence({ kernel, skipHydration: true }).dispose);
		expect(subjectIdOf(kernel)).toBe('sub_next');
		expect(
			kernel.getSnapshot().explicitChoice?.categories.measurement?.value
		).toBe(true);
		expect(storedSid()).toEqual({ cookie: null, local: null });
		expect(subjectIdOf(boot().kernel)).toBe('sub_next');
	}
);

test.each([
	['', false],
	[', after identify() held it back', true],
] as const)(
	'an unused ID follows the one another tab saves and names the one it replaced%s',
	async (_, identified) => {
		const { kernel } = boot();
		const subjectId = subjectIdOf(kernel);
		const resolved = vi.fn();
		kernel.events.on('subject:resolved', resolved);
		if (identified) {
			// A generated ID is not linked before a save, so it stays unused.
			await kernel.commands.identify({ externalId: 'user-1' });
		}
		const other = boot();
		const saved = subjectIdOf(other.kernel);
		expect(saved).not.toBe(subjectId);

		await other.kernel.commands.save({ measurement: true });
		await vi.advanceTimersByTimeAsync(0);
		window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_V2 }));
		await vi.dynamicImportSettled();
		await vi.advanceTimersByTimeAsync(0);

		expect(subjectIdOf(kernel)).toBe(saved);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.measurement?.value
		).toBe(true);
		expect(resolved).toHaveBeenCalledWith(
			expect.objectContaining({
				previousSubjectId: subjectId,
				type: 'subject:resolved',
			})
		);
	}
);

test('a runtime that keeps its subject neither creates nor stores one', () => {
	const kernel = createConsentKernel({ now: NOW });
	disposers.push(createPersistence({ keepSubject: true, kernel }).dispose);

	expect(kernel.getSnapshot().subject).toBeNull();
	expect(storedSid()).toEqual({ cookie: null, local: null });
});

test('a runtime that keeps its subject neither takes nor removes a c15t 3.2 copy', () => {
	localStorage.setItem(SID_KEY, 'sub_stored');
	document.cookie = `${SID_KEY}=sub_stored; path=/`;
	const kernel = createConsentKernel({ now: NOW });
	disposers.push(createPersistence({ keepSubject: true, kernel }).dispose);

	// It only reads, like the script-loader preload's handle. The handle
	// that owns the subject removes the copy.
	expect(kernel.getSnapshot().subject).toBeNull();
	expect(storedSid()).toEqual({ cookie: 'sub_stored', local: 'sub_stored' });
});

// An ID or linked account with no URI encoding has no cookie copy: each
// record's cookie is skipped like a write the cookie refused, and
// localStorage keeps the whole record.
test.each(
	(
		['a necessary-only save', 'a choice', 'a vendor-only save'] as const
	).flatMap((action) =>
		(
			[
				['an ID', { subjectId: 'sub_\uD800' }],
				[
					'a linked account',
					{
						externalId: 'acct_\uDC00',
						identityProvider: 'app',
						subjectId: 'sub_plain',
					},
				],
			] as const
		).map(([label, subject]) => [action, label, subject] as const)
	)
)(
	'%s with %s that has no URI encoding is stored and reloads whole',
	async (action, _, subject) => {
		const options = {
			'a choice': {
				consentCategories: ['necessary', 'marketing'],
				initialPolicyResolution: matchedResolution(optInRule()),
			},
			'a necessary-only save': { consentCategories: ['necessary'] },
			'a vendor-only save': {
				initialPolicyResolution: matchedResolution(noticeRule()),
				initialVendors: {
					declared: [
						{
							category: 'marketing',
							id: 'meta-pixel',
							name: 'Meta Pixel',
							presentable: true,
							privacyPolicyUrl: 'https://example.com/privacy',
							source: 'config',
						},
					],
					listVersion: null,
				},
			},
		}[action] as Parameters<typeof createConsentKernel>[0];
		const sent: unknown[] = [];
		const create = () =>
			createConsentKernel({
				...options,
				transport: {
					save: (payload: { subject?: unknown }) => {
						sent.push(payload.subject);
						return Promise.resolve({ ok: true });
					},
				},
			});
		const kernel = create();
		const handle = createPersistence({ kernel });
		kernel.set.subjectId(subject.subjectId);
		if ('externalId' in subject) {
			await kernel.commands.identify({
				externalId: subject.externalId,
				identityProvider: subject.identityProvider,
			});
		}
		await vi.advanceTimersByTimeAsync(0);
		const decide = {
			'a choice': () => kernel.commands.save({ marketing: false }),
			'a necessary-only save': () => kernel.commands.save('none'),
			'a vendor-only save': () =>
				kernel.commands.save({}, { vendors: { 'meta-pixel': false } }),
		}[action];
		const saving = decide();
		await vi.advanceTimersByTimeAsync(0);
		await expect(saving).resolves.toMatchObject({ ok: true });
		await vi.dynamicImportSettled();
		await vi.advanceTimersByTimeAsync(0);
		expect(sent).toEqual([subject]);
		const saved = kernel.getSnapshot();
		handle.dispose();
		kernel.dispose();

		const restored = create();
		createPersistence({ kernel: restored }).dispose();
		const snapshot = restored.getSnapshot();
		expect(snapshot.subject).toEqual(subject);
		expect(snapshot.explicitChoice).toEqual(saved.explicitChoice);
		expect(snapshot.vendorChoice).toEqual(saved.vendorChoice);
		expect(snapshot.noticeDismissal).toEqual(saved.noticeDismissal);
		restored.dispose();
	}
);
