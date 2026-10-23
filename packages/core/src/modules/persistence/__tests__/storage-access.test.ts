/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	matchedResolution,
	noticeRule,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { readRequestConsent } from '../../../server/request-consent';
import { resolveRequestSubject } from '../../../server/request-subject';
import type { HydrationRecords } from '../../../types';
import { readStoredRecords } from '../hydrate';
import { createPersistence } from '../index';
import { readStoredConsentRecord } from '../record-storage';
import {
	clearStoredConsentRecords,
	writeStoredConsentEnvelope,
} from './record-writes';

const disposers: (() => void)[] = [];
const resolution = matchedResolution(
	noticeRule({ privacySignals: { gpc: { denyCategories: ['measurement'] } } })
);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	clearStoredConsentRecords();
	// A clear keeps its epoch and the subject ID; start every test without.
	for (const key of ['c15t-epoch', 'c15t-sid']) {
		document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	}
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	clearStoredConsentRecords();
	vi.useRealTimers();
});

const createKernel = () => {
	const kernel = createConsentKernel({ initialPolicyResolution: resolution });
	disposers.push(() => kernel.dispose());
	return kernel;
};

const persist = (kernel: ReturnType<typeof createKernel>) => {
	const handle = createPersistence({ kernel });
	disposers.push(() => handle.dispose());
	return handle;
};

const restrictStorage = (restriction: 'getter' | 'methods' | 'missing') => {
	if (restriction === 'methods') {
		for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
			vi.spyOn(localStorage, method).mockImplementation(() => {
				throw new DOMException('Storage access blocked', 'SecurityError');
			});
		}
		return;
	}
	vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
		if (restriction === 'missing') {
			return undefined as unknown as Storage;
		}
		throw new DOMException('Storage access blocked', 'SecurityError');
	});
};

test.each(['getter', 'methods', 'missing'] as const)(
	'keeps in-memory records when cookie reads fail and localStorage is unavailable through %s',
	async (restriction) => {
		const kernel = createKernel();
		const handle = persist(kernel);
		restrictStorage(restriction);
		vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
			throw new DOMException('Cookies blocked', 'SecurityError');
		});
		vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
			throw new DOMException('Cookies blocked', 'SecurityError');
		});
		await kernel.commands.save({ measurement: false });
		await kernel.commands.dismissNotice();
		kernel.set.privacySignals({ gpc: true });
		const before = kernel.getSnapshot();

		expect(handle.hydrate()).toBe(false);
		expect(kernel.getSnapshot().explicitChoice).toEqual(before.explicitChoice);
		expect(kernel.getSnapshot().subject).toEqual(before.subject);
		expect(kernel.getSnapshot().noticeDismissal).toEqual(
			before.noticeDismissal
		);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
	}
);

test('distinguishes unreadable records from readable empty storage', async () => {
	const kernel = createKernel();
	const handle = persist(kernel);
	await kernel.commands.save({ measurement: false });
	await kernel.commands.dismissNotice();
	vi.advanceTimersByTime(0);
	const subjectId = kernel.getSnapshot().subject?.subjectId;
	clearStoredConsentRecords();

	expect(handle.hydrate()).toBe(false);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	// The subject ID is not a record: clearing records keeps it.
	expect(kernel.getSnapshot().subject).toEqual({ subjectId });
	expect(kernel.getSnapshot().noticeDismissal).toBeNull();
});

test('preserves IAB metadata on the next save after unreadable hydration', async () => {
	const iab = { customVendorConsents: { acme: false } };
	writeStoredConsentEnvelope(
		{
			categories: explicitChoice({ measurement: false }).categories,
			iab,
			version: 3,
		},
		{ now: NOW }
	);
	const kernel = createKernel();
	const handle = persist(kernel);
	restrictStorage('getter');
	vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
		throw new DOMException('Cookies blocked', 'SecurityError');
	});

	expect(handle.hydrate()).toBe(false);
	vi.restoreAllMocks();
	await kernel.commands.save({ measurement: false });
	vi.advanceTimersByTime(0);
	expect(readStoredConsentRecord(undefined, NOW).selected?.iab).toEqual(iab);
});

test('hydrates readable choices without clearing an unreadable notice record', async () => {
	const kernel = createKernel();
	const handle = persist(kernel);
	await kernel.commands.save({ measurement: false });
	await kernel.commands.dismissNotice();
	kernel.set.privacySignals({ gpc: true });
	vi.advanceTimersByTime(0);
	const before = kernel.getSnapshot();
	const storedChoice = localStorage.getItem('c15t');
	expect(storedChoice).not.toBeNull();
	vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
		throw new DOMException('Cookies blocked', 'SecurityError');
	});
	vi.spyOn(localStorage, 'getItem').mockImplementation((key) => {
		if (key === 'c15t-notice') {
			throw new DOMException('Record blocked', 'SecurityError');
		}
		return key === 'c15t' ? storedChoice : null;
	});

	const stored = readStoredRecords(undefined, NOW);
	expect(stored.records).not.toHaveProperty('noticeDismissal');
	expect(handle.hydrate()).toBe(true);
	expect(kernel.getSnapshot().explicitChoice).toEqual(before.explicitChoice);
	expect(kernel.getSnapshot().noticeDismissal).toEqual(before.noticeDismissal);
});

test.each(['getter', 'methods', 'missing'] as const)(
	'hydrates and clears cookie records when localStorage fails through %s',
	async (restriction) => {
		const source = createKernel();
		const writer = persist(source);
		await source.commands.save({ measurement: false });
		await source.commands.dismissNotice();
		source.set.privacySignals({ gpc: true });
		writer.dispose();
		const saved = source.getSnapshot();
		const { cookie } = document;
		expect(cookie).toContain('c15t=');
		expect(cookie).toContain('c15t-notice=');
		localStorage.clear();
		restrictStorage(restriction);

		const restored = createKernel();
		const reader = persist(restored);
		expect(restored.getSnapshot().explicitChoice).toEqual(saved.explicitChoice);
		expect(restored.getSnapshot().noticeDismissal).toEqual(
			saved.noticeDismissal
		);
		expect(restored.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(document.cookie).toBe(cookie);

		reader.clear();
		// The subject ID and the clear epoch are the only things left.
		expect(document.cookie).toMatch(/^c15t-sid=sub_\w+; c15t-epoch=\d+$/u);
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		expect(restored.getSnapshot().noticeDismissal).toBeNull();
	}
);

test.each(['getter', 'methods', 'missing'] as const)(
	'persists choices and notices when localStorage becomes unavailable through %s',
	async (restriction) => {
		const kernel = createKernel();
		const writer = persist(kernel);
		restrictStorage(restriction);
		await kernel.commands.save({ measurement: false });
		await kernel.commands.dismissNotice();
		kernel.set.privacySignals({ gpc: true });
		// Flush the deferred writes without advancing the receipt expiry timer.
		expect(() => vi.advanceTimersByTime(0)).not.toThrow();
		writer.dispose();
		expect(document.cookie).toContain('c15t=');
		expect(document.cookie).toContain('c15t-notice=');
		const restored = createKernel();
		persist(restored);
		expect(restored.getSnapshot().explicitChoice).toEqual(
			kernel.getSnapshot().explicitChoice
		);
		expect(restored.getSnapshot().noticeDismissal).toEqual(
			kernel.getSnapshot().noticeDismissal
		);
	}
);

// A page that cannot read its cookies keeps persisting to localStorage.
// The subject checks that read the whole Cookie header degrade the same
// way the per-cookie readers do, at startup and on focus.
test('a server-seeded start reads the subject from localStorage when cookies cannot be read', () => {
	const kernel = createKernel();
	const handle = persist(kernel);
	kernel.set.subjectId('sub_local');
	void kernel.commands.save({ measurement: false });
	vi.advanceTimersByTime(0);
	handle.dispose();
	for (const key of ['c15t-sid']) {
		document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		localStorage.removeItem(key);
	}
	vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
		throw new DOMException('Cookies blocked', 'SecurityError');
	});
	const seeded = createConsentKernel({
		initialPolicyResolution: resolution,
		initialRecords: { subject: { subjectId: 'sub_server' } },
	});
	disposers.push(() => seeded.dispose());
	const seededHandle = createPersistence({
		kernel: seeded,
		skipHydration: true,
	});
	disposers.push(() => seededHandle.dispose());
	expect(seeded.getSnapshot().subject).toEqual({ subjectId: 'sub_local' });
	expect(
		seeded.getSnapshot().explicitChoice?.categories.measurement?.value
	).toBe(false);
});

test('focus keeps a used subject ID when cookies cannot be read', async () => {
	const kernel = createKernel();
	persist(kernel);
	await kernel.commands.save({ measurement: false });
	vi.advanceTimersByTime(0);
	const own = kernel.getSnapshot().subject?.subjectId;
	localStorage.setItem('c15t-sid', 'sub_other_tab');
	vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
		throw new DOMException('Cookies blocked', 'SecurityError');
	});
	const errors: unknown[] = [];
	const onError = (event: ErrorEvent) => {
		errors.push(event.error);
		event.preventDefault();
	};
	window.addEventListener('error', onError);
	window.dispatchEvent(new Event('focus'));
	window.removeEventListener('error', onError);
	expect(errors).toEqual([]);
	expect(kernel.getSnapshot().subject?.subjectId).toBe(own);
	expect(localStorage.getItem('c15t-sid')).toBe(own);
});

// A visitor on a site with only necessary categories who linked an account
// is known by the acknowledgement alone. A load that cannot read cookies
// takes that subject whole from localStorage, as one that can does.
test.each([
	['can be read', 'hydrating'],
	['cannot be read', 'hydrating'],
	['cannot be read', 'server-seeded'],
] as const)(
	'a necessary-only visitor keeps the linked account when cookies %s, %s',
	async (cookies, start) => {
		const sent: unknown[] = [];
		const createVisitor = (initialRecords?: HydrationRecords) => {
			const kernel = createConsentKernel({
				consentCategories: ['necessary'],
				initialRecords,
				transport: {
					save: (payload: { subject?: unknown }) => {
						sent.push(payload.subject);
						return Promise.resolve({ ok: true });
					},
				},
			});
			disposers.push(() => kernel.dispose());
			return kernel;
		};
		const first = createVisitor();
		const firstHandle = createPersistence({ kernel: first });
		await first.commands.identify({
			externalId: 'account-a',
			identityProvider: 'app',
		});
		const saving = first.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const saved = first.getSnapshot();
		expect(saved.subject?.externalId).toBe('account-a');
		expect(saved.explicitChoice).toBeNull();
		firstHandle.dispose();
		sent.length = 0;

		let initialRecords: HydrationRecords | undefined;
		if (start === 'server-seeded') {
			const subject = resolveRequestSubject({
				now: Date.now(),
				request: { cookie: document.cookie, url: 'https://example.com/' },
			});
			({ initialRecords } = readRequestConsent({
				adapter: '@c15t/test',
				now: Date.now(),
				request: { cookie: subject?.cookie, headers: new Headers() },
			}).state);
		}
		if (cookies === 'cannot be read') {
			vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
				throw new DOMException('Cookies blocked', 'SecurityError');
			});
		}
		const restored = createVisitor(initialRecords);
		const handle = createPersistence({
			kernel: restored,
			skipHydration: start === 'server-seeded',
		});
		disposers.push(() => handle.dispose());
		const snapshot = restored.getSnapshot();
		expect(snapshot.subject).toEqual(saved.subject);
		expect(snapshot.noticeDismissal).toEqual(saved.noticeDismissal);
		expect(snapshot.promptRequirement.kind).toBe('none');
		expect(snapshot.explicitChoice).toBeNull();

		const next = restored.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await next;
		expect(sent).toEqual([saved.subject]);
	}
);

// A tab whose choice record cannot be read takes its subject from the vendor
// or notice record that carries it, a copy of storage like any other. When
// another tab renames that ID, the tab follows, as a reload would.
const vendorList = {
	declared: [
		{
			category: 'marketing' as const,
			id: 'meta-pixel',
			name: 'Meta Pixel',
			presentable: true,
			privacyPolicyUrl: 'https://example.com/privacy',
			source: 'config' as const,
		},
	],
	listVersion: null,
};

const settleAll = async (pending?: Promise<unknown>) => {
	await vi.advanceTimersByTimeAsync(0);
	await pending;
	await vi.dynamicImportSettled();
	await vi.advanceTimersByTimeAsync(0);
};

test.each([
	['a notice acknowledgement', 'can be read'],
	['a notice acknowledgement', 'cannot be read'],
	['a vendor decision', 'can be read'],
	['a vendor decision', 'cannot be read'],
] as const)(
	'a tab follows another tab renaming the ID %s carries when cookies %s',
	async (carrier, cookies) => {
		const sent: unknown[] = [];
		const createVisitor = () => {
			const kernel = createConsentKernel(
				carrier === 'a vendor decision'
					? {
							initialPolicyResolution: resolution,
							initialVendors: vendorList,
							transport: {
								save: (payload: { subjectId?: string }) => {
									sent.push(payload.subjectId);
									return Promise.resolve({ ok: true });
								},
							},
						}
					: {
							consentCategories: ['necessary'],
							transport: {
								save: (payload: { subjectId?: string }) => {
									sent.push(payload.subjectId);
									return Promise.resolve({ ok: true });
								},
							},
						}
			);
			disposers.push(() => kernel.dispose());
			return kernel;
		};
		const first = createVisitor();
		const firstHandle = createPersistence({ kernel: first });
		await settleAll(
			carrier === 'a vendor decision'
				? first.commands.save({}, { vendors: { 'meta-pixel': false } })
				: first.commands.save('none')
		);
		const saved = first.getSnapshot();
		firstHandle.dispose();
		sent.length = 0;
		if (cookies === 'cannot be read') {
			vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
				throw new DOMException('Cookies blocked', 'SecurityError');
			});
		}

		const tab = createVisitor();
		disposers.push(persist(tab).dispose);
		expect(tab.getSnapshot().subject).toEqual(saved.subject);
		const other = createVisitor();
		const otherHandle = createPersistence({ kernel: other });
		other.set.subjectId('sub_next');
		await settleAll();
		otherHandle.dispose();
		for (const key of ['c15t-notice', 'c15t-vendors', 'c15t-sid']) {
			window.dispatchEvent(new StorageEvent('storage', { key }));
		}
		window.dispatchEvent(new Event('focus'));
		await settleAll();

		const after = tab.getSnapshot();
		expect(after.subject?.subjectId).toBe('sub_next');
		expect(after.noticeDismissal).toEqual(saved.noticeDismissal);
		expect(after.vendorChoice).toEqual(saved.vendorChoice);
		expect(after.explicitChoice).toBeNull();
		const reloaded = createVisitor();
		createPersistence({ kernel: reloaded }).dispose();
		expect(reloaded.getSnapshot().subject?.subjectId).toBe('sub_next');

		await settleAll(tab.commands.save('none'));
		expect(sent).toEqual(['sub_next']);
	}
);

// An ID a save response named came from the server and yields only to a
// strictly newer record, whether cookies can be read or not.
test.each(['can be read', 'cannot be read'] as const)(
	'a tab keeps an ID the server resolved over a rename at the same time when cookies %s',
	async (cookies) => {
		const first = createConsentKernel({ consentCategories: ['necessary'] });
		disposers.push(() => first.dispose());
		const firstHandle = createPersistence({ kernel: first });
		await settleAll(first.commands.save('none'));
		firstHandle.dispose();
		if (cookies === 'cannot be read') {
			vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
				throw new DOMException('Cookies blocked', 'SecurityError');
			});
		}

		const tab = createConsentKernel({
			consentCategories: ['necessary'],
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'sub_server' }),
			},
		});
		disposers.push(() => tab.dispose());
		disposers.push(persist(tab).dispose);
		await settleAll(tab.commands.save('none'));
		expect(tab.getSnapshot().subject?.subjectId).toBe('sub_server');
		const acknowledged = tab.getSnapshot().noticeDismissal;

		const other = createConsentKernel({ consentCategories: ['necessary'] });
		disposers.push(() => other.dispose());
		const otherHandle = createPersistence({ kernel: other });
		other.set.subjectId('sub_next');
		await settleAll();
		otherHandle.dispose();
		window.dispatchEvent(new StorageEvent('storage', { key: 'c15t-notice' }));
		window.dispatchEvent(new Event('focus'));
		await settleAll();
		expect(tab.getSnapshot().subject?.subjectId).toBe('sub_server');
		expect(tab.getSnapshot().noticeDismissal).toEqual(acknowledged);
	}
);
