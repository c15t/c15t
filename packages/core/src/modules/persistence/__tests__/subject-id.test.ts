/**
 * @vitest-environment jsdom
 *
 * The subject ID persistence gives a browser runtime at startup, before
 * the visitor decides anything, and how it lives in `<key>-sid`.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
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

test('a first visit gets a subject ID at startup without recording a choice', () => {
	const { kernel } = boot();
	const snapshot = kernel.getSnapshot();
	const subjectId = subjectIdOf(kernel);

	expect(subjectId).toMatch(/^sub_/u);
	expect(snapshot.explicitChoice).toBeNull();
	expect(snapshot.activeUI).toBe('banner');
	expect(storedSid()).toEqual({ cookie: subjectId, local: subjectId });
	expect(hasStoredConsentRecord()).toBe(false);
});

test('a reload keeps the ID, and the ID alone still shows the banner', () => {
	const first = boot();
	const subjectId = subjectIdOf(first.kernel);
	first.handle.dispose();

	const { kernel, handle } = boot();
	expect(subjectIdOf(kernel)).toBe(subjectId);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
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
});

test('a clear keeps the ID through a reload', async () => {
	const first = boot();
	const subjectId = subjectIdOf(first.kernel);
	await first.kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);

	first.handle.clear();
	expect(first.kernel.getSnapshot().explicitChoice).toBeNull();
	expect(subjectIdOf(first.kernel)).toBe(subjectId);
	first.handle.dispose();

	const { kernel } = boot();
	expect(subjectIdOf(kernel)).toBe(subjectId);
	expect(kernel.getSnapshot().activeUI).toBe('banner');
});

test.each([
	['cookie', () => expire(SID_KEY)],
	['localStorage', () => localStorage.removeItem(SID_KEY)],
] as const)(
	'a lost %s copy of the ID comes back at startup and on focus',
	(_, lose) => {
		const first = boot();
		const subjectId = subjectIdOf(first.kernel);
		first.handle.dispose();

		lose();
		const { kernel } = boot();
		expect(subjectIdOf(kernel)).toBe(subjectId);
		expect(storedSid()).toEqual({ cookie: subjectId, local: subjectId });

		lose();
		window.dispatchEvent(new Event('focus'));
		expect(storedSid()).toEqual({ cookie: subjectId, local: subjectId });
	}
);

test('removing the ID starts a new one', () => {
	const { kernel } = boot();
	const subjectId = subjectIdOf(kernel);

	kernel.set.subjectId(null);

	const next = subjectIdOf(kernel);
	expect(next).toMatch(/^sub_/u);
	expect(next).not.toBe(subjectId);
	expect(storedSid()).toEqual({ cookie: next, local: next });
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
		expect(storedSid()).toEqual({ cookie: replaced, local: replaced });
	}
);

test('an ID that is not a generated one survives a clear and a reload', () => {
	const first = boot();
	first.kernel.set.subjectId('canonical id/1');
	first.handle.clear();
	first.handle.dispose();

	expect(subjectIdOf(boot().kernel)).toBe('canonical id/1');
});

test('an ID with surrounding spaces is read back exactly as stored', () => {
	const first = boot();
	first.kernel.set.subjectId(' sub_padded ');
	first.handle.dispose();

	expect(subjectIdOf(boot().kernel)).toBe(' sub_padded ');
});

test.each([
	['longer than 256 characters', `sub_${'a'.repeat(300)}`],
	['with a control character', 'sub_line\nbreak'],
	['with a lone surrogate', 'sub_\uD800'],
])('an ID the app names %s survives a reload', (_, subjectId) => {
	const first = boot();
	first.kernel.set.subjectId(subjectId);
	first.handle.dispose();

	expect(subjectIdOf(boot().kernel)).toBe(subjectId);
});

test('a refused cookie write does not bring the old ID back', () => {
	const first = boot();
	const old = subjectIdOf(first.kernel);
	const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
	// The browser drops the new `-sid` cookie, as it would one over its size
	// limit, and still applies deletions.
	Object.defineProperty(document, 'cookie', {
		configurable: true,
		get: () => cookie?.get?.call(document),
		set: (value: string) => {
			if (value.startsWith(`${SID_KEY}=sub_`)) {
				return;
			}
			cookie?.set?.call(document, value);
		},
	});
	try {
		first.kernel.set.subjectId('sub_next');
		first.handle.dispose();
	} finally {
		Reflect.deleteProperty(document, 'cookie');
	}

	expect(old).not.toBe('sub_next');
	expect(storedSid()).toEqual({ cookie: null, local: 'sub_next' });
	expect(subjectIdOf(boot().kernel)).toBe('sub_next');
});

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
	expect(storedSid()).toEqual({ cookie: 'sub_next', local: 'sub_next' });
});

// The same stale consent cookie, carried through a server render: the
// server reads the cookies alone and must not store the old ID again.
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

		// The records win on the server, so its render still names the old
		// ID, but it never replaces the subject cookie the request holds.
		const subject = resolveRequestSubject({
			now: NOW,
			request: { cookie: document.cookie, url: 'https://example.com/' },
		});
		expect(subject?.subjectId).toBe(old);
		expect(subject?.setCookie).toBeNull();
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: NOW,
			request: { cookie: subject?.cookie, headers: new Headers() },
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
		expect(storedSid()).toEqual({
			cookie: dropped === 'all' ? old : 'sub_next',
			local: 'sub_next',
		});
		expect(subjectIdOf(boot().kernel)).toBe('sub_next');
	}
);

test('an unused ID follows the one another tab stored and names the one it replaced', () => {
	const { kernel } = boot();
	const subjectId = subjectIdOf(kernel);
	const resolved = vi.fn();
	kernel.events.on('subject:resolved', resolved);

	localStorage.setItem(SID_KEY, 'sub_other_tab');
	document.cookie = `${SID_KEY}=sub_other_tab; path=/`;
	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));

	expect(subjectIdOf(kernel)).toBe('sub_other_tab');
	expect(resolved).toHaveBeenCalledWith(
		expect.objectContaining({
			previousSubjectId: subjectId,
			type: 'subject:resolved',
		})
	);
});

test('an ID the app names does not follow another tab', () => {
	const { kernel } = boot();
	kernel.set.subjectId('sub_app');

	localStorage.setItem(SID_KEY, 'sub_other_tab');
	document.cookie = `${SID_KEY}=sub_other_tab; path=/`;
	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));

	expect(subjectIdOf(kernel)).toBe('sub_app');
});

test('an ID a save used does not follow another tab', async () => {
	const { kernel } = boot();
	const subjectId = subjectIdOf(kernel);
	await kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);

	localStorage.setItem(SID_KEY, 'sub_other_tab');
	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));

	expect(subjectIdOf(kernel)).toBe(subjectId);
});

test('a runtime that keeps its subject neither creates nor stores one', () => {
	const kernel = createConsentKernel({ now: NOW });
	disposers.push(createPersistence({ keepSubject: true, kernel }).dispose);

	expect(kernel.getSnapshot().subject).toBeNull();
	expect(storedSid()).toEqual({ cookie: null, local: null });
});

test('a runtime that keeps its subject does not take the stored ID', () => {
	localStorage.setItem(SID_KEY, 'sub_stored');
	document.cookie = `${SID_KEY}=sub_stored; path=/`;
	const kernel = createConsentKernel({ now: NOW });
	disposers.push(createPersistence({ keepSubject: true, kernel }).dispose);

	expect(kernel.getSnapshot().subject).toBeNull();
});

/** Boots a second tab that raced the first: it read no stored ID. */
const bootRacingTab = function bootRacingTab() {
	localStorage.removeItem(SID_KEY);
	expire(SID_KEY);
	return boot();
};

test('a tab whose ID is used stores it again, and an unused tab takes it', async () => {
	const first = boot();
	const used = subjectIdOf(first.kernel);
	const second = bootRacingTab();
	expect(subjectIdOf(second.kernel)).not.toBe(used);
	await first.kernel.commands.identify({ externalId: 'user-1' });

	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));

	expect(subjectIdOf(first.kernel)).toBe(used);
	expect(subjectIdOf(second.kernel)).toBe(used);
	expect(storedSid()).toEqual({ cookie: used, local: used });
});

test('a tab whose saved records carry its ID stores it over another stored ID', async () => {
	const { kernel } = boot();
	const used = subjectIdOf(kernel);
	await kernel.commands.save({ measurement: true });
	vi.advanceTimersByTime(0);
	localStorage.setItem(SID_KEY, 'sub_other_tab');
	document.cookie = `${SID_KEY}=sub_other_tab; path=/`;

	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));

	expect(subjectIdOf(kernel)).toBe(used);
	expect(storedSid()).toEqual({ cookie: used, local: used });
});

test('two tabs whose IDs are both used stop overwriting each other', async () => {
	const first = boot();
	const second = bootRacingTab();
	await first.kernel.commands.identify({ externalId: 'user-1' });
	await second.kernel.commands.identify({ externalId: 'user-1' });
	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));
	const setCookie = vi.spyOn(document, 'cookie', 'set');

	window.dispatchEvent(new StorageEvent('storage', { key: SID_KEY }));

	expect(setCookie).not.toHaveBeenCalledWith(
		expect.stringMatching(new RegExp(`^${SID_KEY}=`, 'u'))
	);
	setCookie.mockRestore();
});
