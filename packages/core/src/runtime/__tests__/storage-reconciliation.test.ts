/**
 * @vitest-environment jsdom
 *
 * Reconciling an active runtime with records another runtime persisted.
 * Every runtime here shares one document's cookies and localStorage, the
 * way two tabs of one site share them.
 */
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	matchedResolution,
	noticeRule,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { readStoredRecordsFromCookieHeader } from '../../modules/persistence/hydrate';
import { encodeStoredConsentEnvelopeCompact } from '../../modules/persistence/record-codec';
import {
	clearStoredConsentRecords,
	clearStoredPrivacyOptOuts,
	readStoredConsentRecord,
	readStoredNoticeDismissal,
	readStoredPrivacyOptOuts,
	readStoredVendorChoice,
	writeStoredNoticeDismissal,
	writeStoredPrivacyOptOuts,
	writeStoredVendorChoice,
} from '../../modules/persistence/record-storage';
import { custom } from '../../transports/mode';
import type { KernelTransport } from '../../types';
import { createConsentRuntime } from '../index';
import type { ConsentRuntime, ConsentRuntimeOptions } from '../types';

const runtimes: ConsentRuntime[] = [];
const optIn = matchedResolution(optInRule());
const optOut = matchedResolution(optOutRule());
let resolution = optIn;

const clearCookies = function clearCookies(): void {
	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

/** Let queued storage writes run. */
const nextTask = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

const createTransport = (
	overrides: Partial<KernelTransport> = {}
): KernelTransport => ({
	init: vi.fn().mockResolvedValue({
		policyResolution: writePolicyResolutionWire(resolution),
	}),
	save: vi.fn().mockResolvedValue({ ok: true }),
	...overrides,
});

const start = (
	options: Partial<ConsentRuntimeOptions> = {},
	transport: KernelTransport = createTransport()
) => {
	const runtime = createConsentRuntime({
		consentCategories: ['necessary', 'measurement'],
		iframeBlocker: false,
		mode: custom(transport),
		prefetch: { initialPolicyResolution: resolution },
		...options,
	});
	runtimes.push(runtime);
	runtime.start();
	return runtime;
};

const measurement = (runtime: ConsentRuntime) =>
	runtime.kernel.getSnapshot().effectivePermissions.measurement;

beforeEach(() => {
	resolution = optIn;
	localStorage.clear();
	clearCookies();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	vi.restoreAllMocks();
	vi.useRealTimers();
	clearStoredConsentRecords();
	localStorage.clear();
	clearCookies();
});

test('reconciles a denial another runtime persisted and notifies subscribers', async () => {
	const writer = start();
	await writer.kernel.commands.save('all');
	await nextTask();

	const active = start();
	expect(measurement(active)).toBe(true);

	const other = start();
	await other.kernel.commands.save('none');
	await nextTask();
	expect(measurement(start())).toBe(false);

	// Neither re-evaluation nor re-initialization reads storage again.
	active.kernel.refresh();
	await active.reinit();
	expect(measurement(active)).toBe(true);

	const listener = vi.fn();
	active.kernel.subscribe(listener);
	const permissionsChanged = vi.fn();
	active.kernel.events.on('permissions:changed', permissionsChanged);

	expect(active.reconcileStorage()).toBe(true);
	expect(measurement(active)).toBe(false);
	expect(listener).toHaveBeenCalledTimes(1);
	expect(permissionsChanged).toHaveBeenCalledTimes(1);

	// Nothing changed since: no second notification.
	expect(active.reconcileStorage()).toBe(false);
	expect(listener).toHaveBeenCalledTimes(1);
});

test.each([
	['opt-in', optIn, true, false],
	['opt-out', optOut, false, true],
] as const)(
	'clearing stored records in another runtime applies the %s default',
	async (_model, policy, before, after) => {
		resolution = policy;
		const active = start();
		await active.kernel.commands.save(before ? 'all' : 'none');
		await nextTask();
		expect(measurement(active)).toBe(before);

		start().clearRecords();

		expect(active.reconcileStorage()).toBe(true);
		expect(active.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(active.kernel.getSnapshot().subject).toBeNull();
		expect(measurement(active)).toBe(after);
	}
);

test('reconciles records stored under a custom storage key', async () => {
	const storageConfig = { storageKey: 'site-consent' };
	const active = start({ storageConfig });
	await active.kernel.commands.save('all');
	await nextTask();

	// A runtime on the default key neither sees nor disturbs it.
	await start().kernel.commands.save('none');
	await nextTask();
	expect(active.reconcileStorage()).toBe(false);
	expect(measurement(active)).toBe(true);

	await start({ storageConfig }).kernel.commands.save('none');
	await nextTask();
	expect(localStorage.getItem('site-consent')).not.toBeNull();
	expect(active.reconcileStorage()).toBe(true);
	expect(measurement(active)).toBe(false);
});

test.each([
	[
		'blocked storage',
		() => {
			vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
				throw new DOMException('Storage access blocked', 'SecurityError');
			});
			vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
				throw new DOMException('Cookies blocked', 'SecurityError');
			});
		},
	],
	[
		'undecodable records',
		() => {
			document.cookie = 'c15t=not-a-record; path=/';
			localStorage.setItem('c15t', '{"version":3,"categories":7}');
			localStorage.setItem('c15t-vendors', 'garbage');
		},
	],
])('%s never turns a denial into a grant', async (_case, breakStorage) => {
	resolution = optOut;
	const active = start();
	await active.kernel.commands.save('none');
	await nextTask();
	const before = active.kernel.getSnapshot();
	expect(before.effectivePermissions.measurement).toBe(false);

	breakStorage();

	expect(active.reconcileStorage()).toBe(false);
	expect(active.kernel.getSnapshot()).toBe(before);
});

test('keeps a record held only in memory while storage is unchanged', () => {
	const active = start();
	// A receipt merged from the server lives in memory; storage never had it.
	const now = Date.now();
	active.kernel.hydrate({
		choice: explicitChoice(
			{ measurement: true },
			{
				fingerprint:
					active.kernel.getSnapshot().evaluationPolicy.choice.fingerprint,
				now,
			}
		),
		now,
	});
	expect(measurement(active)).toBe(true);

	expect(active.reconcileStorage()).toBe(false);
	expect(measurement(active)).toBe(true);
});

test("lands this runtime's queued write before reading storage", async () => {
	const active = start();
	await active.kernel.commands.save('all');
	await nextTask();

	// Recorded, but the storage write is still queued for a later task.
	void active.kernel.commands.save('none');
	expect(active.reconcileStorage()).toBe(false);
	expect(measurement(active)).toBe(false);
	expect(measurement(start())).toBe(false);
});

test('a queued older write never overwrites a newer stored denial', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const active = start();
	await active.kernel.commands.save('none');
	await nextTask();

	// This runtime grants; its write is still queued.
	void active.kernel.commands.save('all');
	expect(measurement(active)).toBe(true);

	// Another runtime denies a second later. Closing it lands its write
	// synchronously, while this runtime's write is still queued.
	vi.setSystemTime(1_800_000_001_000);
	const other = start();
	void other.kernel.commands.save('none');
	other.dispose();

	expect(active.reconcileStorage()).toBe(true);
	expect(measurement(active)).toBe(false);
	expect(measurement(start())).toBe(false);
});

test.each([
	[
		'a newer denial',
		(other: ConsentRuntime) => other.kernel.commands.save('none'),
		false,
	],
	['a cleared record', (other: ConsentRuntime) => other.clearRecords(), null],
] as const)(
	'a late subject acknowledgement does not overwrite %s',
	async (_case, act, stored) => {
		const response = Promise.withResolvers<{ ok: true; subjectId: string }>();
		const active = start(
			{},
			createTransport({ save: vi.fn(() => response.promise) })
		);
		void active.kernel.commands.save('all');
		await nextTask();
		await nextTask();

		const other = start();
		await act(other);
		await nextTask();

		// The slow save response resolves the subject and queues a rewrite.
		response.resolve({ ok: true, subjectId: 'sub_server' });
		await vi.waitFor(() => {
			expect(active.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
		});
		await nextTask();

		const fresh = start().kernel.getSnapshot();
		expect(fresh.explicitChoice?.categories.measurement?.value ?? null).toBe(
			stored
		);
	}
);

const storageEvent = (key: string | null) =>
	new StorageEvent('storage', { key });

test('reconciles on storage events for its own keys, focus and visibility', async () => {
	const storageConfig = { storageKey: 'site-consent' };
	const active = start({ storageConfig });
	await active.kernel.commands.save('all');
	await nextTask();
	const listener = vi.fn();
	active.kernel.subscribe(listener);

	const other = start({ persistence: { sync: false }, storageConfig });
	await other.kernel.commands.save('none');
	await nextTask();
	// Same-document writes raise no event; unrelated keys are ignored.
	window.dispatchEvent(storageEvent('c15t'));
	window.dispatchEvent(storageEvent('unrelated'));
	await nextTask();
	expect(measurement(active)).toBe(true);

	window.dispatchEvent(storageEvent('site-consent'));
	window.dispatchEvent(storageEvent('site-consent-vendors'));
	await nextTask();
	expect(measurement(active)).toBe(false);
	expect(listener).toHaveBeenCalledTimes(1);

	other.clearRecords();
	window.dispatchEvent(new Event('focus'));
	await nextTask();
	expect(active.kernel.getSnapshot().explicitChoice).toBeNull();

	await other.kernel.commands.save('all');
	await nextTask();
	document.dispatchEvent(new Event('visibilitychange'));
	await nextTask();
	expect(measurement(active)).toBe(true);
});

test('sync: false leaves reconciliation to explicit calls', async () => {
	const active = start({ persistence: { sync: false } });
	await active.kernel.commands.save('all');
	await nextTask();
	await start().kernel.commands.save('none');
	await nextTask();

	window.dispatchEvent(storageEvent('c15t'));
	window.dispatchEvent(new Event('focus'));
	await nextTask();
	expect(measurement(active)).toBe(true);
	expect(active.reconcileStorage()).toBe(true);
	expect(measurement(active)).toBe(false);
});

test('dispose removes the listeners and cancels a scheduled reconciliation', async () => {
	const active = start();
	await active.kernel.commands.save('all');
	await nextTask();
	await start().kernel.commands.save('none');
	await nextTask();

	window.dispatchEvent(storageEvent('c15t'));
	active.dispose();
	await nextTask();
	expect(measurement(active)).toBe(true);

	window.dispatchEvent(storageEvent('c15t'));
	window.dispatchEvent(new Event('focus'));
	await nextTask();
	expect(measurement(active)).toBe(true);
	expect(active.reconcileStorage()).toBe(false);
});

const threeCategories: Partial<ConsentRuntimeOptions> = {
	consentCategories: ['necessary', 'measurement', 'marketing'],
};

const decision = (
	runtime: ConsentRuntime,
	category: 'measurement' | 'marketing'
) => runtime.kernel.getSnapshot().explicitChoice?.categories[category]?.value;

test("a stale runtime's partial save keeps another runtime's newer category decision", async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	await start(threeCategories).kernel.commands.save('all');
	await nextTask();
	// Both runtimes read the grant for every category.
	const stale = start(threeCategories);
	const other = start(threeCategories);

	vi.setSystemTime(1_800_000_001_000);
	await other.kernel.commands.save({ measurement: false });
	await nextTask();

	// Later, the stale runtime decides marketing alone. Its envelope still
	// carries the old measurement grant.
	vi.setSystemTime(1_800_000_002_000);
	await stale.kernel.commands.save({ marketing: false });
	await nextTask();

	const fresh = start(threeCategories);
	expect(decision(fresh, 'measurement')).toBe(false);
	expect(decision(fresh, 'marketing')).toBe(false);
	expect(stale.reconcileStorage()).toBe(true);
	expect(decision(stale, 'measurement')).toBe(false);
	expect(decision(stale, 'marketing')).toBe(false);
});

test("reconciling keeps this runtime's newer queued category decision", async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	await start(threeCategories).kernel.commands.save('all');
	await nextTask();
	const active = start(threeCategories);

	// This runtime denies measurement; its write is still queued.
	vi.setSystemTime(1_800_000_001_000);
	void active.kernel.commands.save({ measurement: false });

	// Another runtime denies marketing later and lands its write first.
	vi.setSystemTime(1_800_000_002_000);
	const other = start(threeCategories);
	void other.kernel.commands.save({ marketing: false });
	other.dispose();

	expect(active.reconcileStorage()).toBe(true);
	expect(decision(active, 'measurement')).toBe(false);
	expect(decision(active, 'marketing')).toBe(false);
	const fresh = start(threeCategories);
	expect(decision(fresh, 'measurement')).toBe(false);
	expect(decision(fresh, 'marketing')).toBe(false);
});

const directive = (
	categories: ('measurement' | 'marketing')[],
	recordedAt: number
) => ({ categories, recordedAt, source: 'gpc' as const });

const directiveCategories = (runtime: ConsentRuntime) =>
	runtime.kernel
		.getSnapshot()
		.optOutDirectives.flatMap((entry) => entry.categories)
		.sort();

test('an older stored privacy list does not drop a newer directive held in memory', () => {
	const active = start();
	const now = Date.now();
	// A directive the kernel holds but storage never had, as from a server.
	active.kernel.hydrate({
		now,
		optOutDirectives: [directive(['measurement'], now)],
	});

	writeStoredPrivacyOptOuts(
		[directive(['marketing'], now - 5000)],
		undefined,
		now
	);
	active.reconcileStorage();
	expect(directiveCategories(active)).toEqual(['marketing', 'measurement']);

	// Removing the stored list still clears.
	clearStoredPrivacyOptOuts();
	expect(active.reconcileStorage()).toBe(true);
	expect(directiveCategories(active)).toEqual([]);
});

test("recording a directive keeps another runtime's stored directive", async () => {
	resolution = matchedResolution(
		optOutRule({ privacySignals: { gpc: { denyCategories: ['measurement'] } } })
	);
	const active = start();
	expect(active.kernel.getSnapshot().optOutDirectives).toEqual([]);
	const now = Date.now();
	writeStoredPrivacyOptOuts(
		[directive(['marketing'], now - 5000)],
		undefined,
		now
	);

	// The browser's privacy signal records a directive in this runtime.
	active.kernel.set.privacySignals({ gpc: true });
	expect(active.kernel.getSnapshot().optOutDirectives).toHaveLength(1);
	await nextTask();

	const stored = readStoredPrivacyOptOuts(undefined, Date.now());
	const recordedAt = stored?.ok
		? stored.record.directives.map((entry) => entry.recordedAt)
		: [];
	expect(recordedAt).toContain(now - 5000);
	expect(recordedAt).toHaveLength(2);
});

test('applies the subject a vendor record carries when the choice is unreadable', () => {
	const active = start();
	const now = Date.now();
	document.cookie = 'c15t=not-a-record; path=/';
	writeStoredVendorChoice(
		{
			confirmedAt: now - 1000,
			denied: ['meta-pixel'],
			subject: { subjectId: 'sub_vendor' },
			version: 1,
		},
		undefined,
		now
	);

	expect(active.reconcileStorage()).toBe(true);
	expect(active.kernel.getSnapshot().vendorChoice?.denied).toEqual([
		'meta-pixel',
	]);
	expect(active.kernel.getSnapshot().subject?.subjectId).toBe('sub_vendor');
});

const storedSubject = () =>
	readStoredConsentRecord(undefined, Date.now()).selected?.subject ?? null;

test('on equal decision times, the record another runtime stored wins', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	await start().kernel.commands.save('all');
	await nextTask();
	const stale = start();
	const other = start();

	// Both runtimes act in the same millisecond. The other runtime's denial
	// lands first; this runtime's grant is still queued.
	vi.setSystemTime(1_800_000_001_000);
	void stale.kernel.commands.save('all');
	void other.kernel.commands.save('none');
	other.dispose();

	stale.reconcileStorage();
	expect(measurement(stale)).toBe(false);
	expect(measurement(start())).toBe(false);
});

test("a runtime's own second action in the same millisecond still lands", async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const active = start();
	await active.kernel.commands.save('all');
	await nextTask();
	await active.kernel.commands.save('none');
	await nextTask();

	expect(measurement(start())).toBe(false);
	active.reconcileStorage();
	expect(measurement(active)).toBe(false);
});

test('on an equal dismissal time, the notice another runtime stored wins', () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	resolution = matchedResolution(noticeRule());
	const active = start();
	void active.kernel.commands.dismissNotice();

	const other = {
		dismissedAt: Date.now(),
		fingerprint: 'another-notice',
		version: 1 as const,
	};
	writeStoredNoticeDismissal(other, undefined, Date.now());

	active.reconcileStorage();
	const stored = readStoredNoticeDismissal(undefined, Date.now());
	expect(stored?.ok ? stored.record.fingerprint : null).toBe('another-notice');
	expect(active.kernel.getSnapshot().noticeDismissal?.fingerprint).toBe(
		'another-notice'
	);
});

test('on an equal vendor decision time, the vendor record another runtime stored wins', () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const vendors = [
		{
			category: 'measurement' as const,
			id: 'analytics-one',
			name: 'Analytics One',
			privacyPolicyUrl: 'https://example.com/privacy',
		},
	];
	const active = start({ vendors });
	void active.kernel.commands.save({
		measurement: true,
		vendors: { 'analytics-one': false },
	});
	expect(active.kernel.getSnapshot().vendorChoice?.denied).toEqual([
		'analytics-one',
	]);

	writeStoredVendorChoice(
		{ confirmedAt: Date.now(), denied: [], version: 1 },
		undefined,
		Date.now()
	);

	active.reconcileStorage();
	const stored = readStoredVendorChoice(undefined, Date.now());
	expect(stored?.ok ? stored.record.denied : null).toEqual([]);
	expect(active.kernel.getSnapshot().vendorChoice?.denied).toEqual([]);
});

test("a stale runtime's save keeps the subject another runtime stored", async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	// Opened before anything was stored.
	const stale = start(threeCategories);
	const other = start(threeCategories);
	await other.kernel.commands.save('all');
	await nextTask();
	const subjectId = other.kernel.getSnapshot().subject?.subjectId;
	expect(storedSubject()?.subjectId).toBe(subjectId);

	vi.setSystemTime(1_800_000_001_000);
	await stale.kernel.commands.save({ marketing: false });
	await nextTask();

	expect(storedSubject()?.subjectId).toBe(subjectId);
	stale.reconcileStorage();
	expect(stale.kernel.getSnapshot().subject?.subjectId).toBe(subjectId);
});

test('a save after identifying a different user stores that identity', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const active = start(threeCategories);
	const other = start(threeCategories);
	await other.kernel.commands.save('all');
	await nextTask();

	await active.identify({ externalId: 'user_2', identityProvider: 'test' });
	vi.setSystemTime(1_800_000_001_000);
	await active.kernel.commands.save({ marketing: false });
	await nextTask();

	expect(storedSubject()?.externalId).toBe('user_2');
	expect(storedSubject()?.subjectId).toBe(
		active.kernel.getSnapshot().subject?.subjectId
	);
});

test('a seeded choice survives storage becoming readable and empty', () => {
	const now = Date.now();
	const localStorageGetter = vi
		.spyOn(window, 'localStorage', 'get')
		.mockImplementation(() => {
			throw new DOMException('Storage access blocked', 'SecurityError');
		});
	const cookieGetter = vi
		.spyOn(document, 'cookie', 'get')
		.mockImplementation(() => {
			throw new DOMException('Cookies blocked', 'SecurityError');
		});
	const active = start({
		prefetch: {
			initialPolicyResolution: resolution,
			initialRecords: {
				choice: explicitChoice(
					{ measurement: true },
					{ fingerprint: resolution.fingerprints.choice, now }
				),
				now,
			},
		},
	});
	expect(measurement(active)).toBe(true);

	localStorageGetter.mockRestore();
	cookieGetter.mockRestore();

	// Storage was never seen holding this choice, so empty storage is no
	// evidence that it was removed.
	expect(active.reconcileStorage()).toBe(false);
	expect(measurement(active)).toBe(true);
});

test('a subject stored with a vendor record does not clear a choice held in memory', () => {
	const active = start();
	const now = Date.now();
	active.kernel.hydrate({
		choice: explicitChoice(
			{ measurement: true },
			{
				fingerprint:
					active.kernel.getSnapshot().evaluationPolicy.choice.fingerprint,
				now,
			}
		),
		now,
	});

	writeStoredVendorChoice(
		{
			confirmedAt: now - 1000,
			denied: ['meta-pixel'],
			subject: { subjectId: 'sub_vendor' },
			version: 1,
		},
		undefined,
		now
	);

	active.reconcileStorage();
	expect(measurement(active)).toBe(true);
	expect(active.kernel.getSnapshot().vendorChoice?.denied).toEqual([
		'meta-pixel',
	]);
});

test('a late subject acknowledgement does not replace a subject another runtime stored in the same millisecond', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const vendors = [
		{
			category: 'measurement' as const,
			id: 'analytics-one',
			name: 'Analytics One',
			privacyPolicyUrl: 'https://example.com/privacy',
		},
	];
	const response = Promise.withResolvers<{ ok: true; subjectId: string }>();
	const late = start(
		{ vendors },
		createTransport({ save: vi.fn(() => response.promise) })
	);
	const other = start({ vendors });
	const input = { measurement: true, vendors: { 'analytics-one': false } };

	void late.kernel.commands.save(input);
	void other.kernel.commands.save(input);
	other.dispose();
	const subjectId = other.kernel.getSnapshot().subject?.subjectId;
	await nextTask();
	await nextTask();

	response.resolve({ ok: true, subjectId: 'sub_late_server' });
	await vi.waitFor(() => {
		expect(late.kernel.getSnapshot().subject?.subjectId).toBe(
			'sub_late_server'
		);
	});
	await nextTask();

	expect(storedSubject()?.subjectId).toBe(subjectId);
	const vendorRecord = readStoredVendorChoice(undefined, Date.now());
	expect(vendorRecord?.ok ? vendorRecord.record.subject?.subjectId : null).toBe(
		subjectId
	);
});

test('a subject the server resolved at init outlives unchanged storage and is saved', async () => {
	await start().kernel.commands.save('all');
	await nextTask();
	const storedId = storedSubject()?.subjectId;
	expect(storedId).toBeTruthy();

	const active = start(
		{ prefetch: {} },
		createTransport({
			init: vi.fn().mockResolvedValue({
				policyResolution: writePolicyResolutionWire(resolution),
				subjectId: 'sub_server',
			}),
		})
	);
	await vi.waitFor(() => {
		expect(active.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
	});

	window.dispatchEvent(new Event('focus'));
	await nextTask();
	expect(active.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');

	await active.kernel.commands.save({ measurement: false });
	await nextTask();
	expect(storedSubject()?.subjectId).toBe('sub_server');
});

test('a record merged into on write is still cleared when another runtime removes it', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const vendors = [
		{
			category: 'measurement' as const,
			id: 'analytics-one',
			name: 'Analytics One',
			privacyPolicyUrl: 'https://example.com/privacy',
		},
	];
	// Opened on empty storage.
	const active = start({ vendors });

	// Another runtime stores a choice and a vendor record under its subject.
	const other = start({ vendors });
	await other.kernel.commands.save({
		measurement: false,
		vendors: { 'analytics-one': false },
	});
	await nextTask();

	// This runtime decides later; its writes merge into those records and
	// carry the stored subject.
	vi.setSystemTime(1_800_000_001_000);
	await active.kernel.commands.save({
		measurement: true,
		vendors: { 'analytics-one': false },
	});
	await nextTask();
	expect(active.kernel.getSnapshot().explicitChoice).not.toBeNull();
	expect(active.kernel.getSnapshot().vendorChoice).not.toBeNull();

	// The other runtime clears before this one reconciles.
	other.clearRecords();

	active.reconcileStorage();
	expect(active.kernel.getSnapshot().explicitChoice).toBeNull();
	expect(active.kernel.getSnapshot().vendorChoice).toBeNull();
});

test('a vendor record without a subject keeps a subject the server resolved', async () => {
	const active = start(
		{ prefetch: {} },
		createTransport({
			init: vi.fn().mockResolvedValue({
				policyResolution: writePolicyResolutionWire(resolution),
				subjectId: 'sub_server',
			}),
		})
	);
	await vi.waitFor(() => {
		expect(active.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
	});

	const now = Date.now();
	writeStoredVendorChoice(
		{ confirmedAt: now - 1000, denied: ['meta-pixel'], version: 1 },
		undefined,
		now
	);

	active.reconcileStorage();
	expect(active.kernel.getSnapshot().vendorChoice?.denied).toEqual([
		'meta-pixel',
	]);
	expect(active.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
});

test('a clear and a partial save reconciled together do not bring back cleared categories', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const active = start(threeCategories);
	await active.kernel.commands.save('all');
	await nextTask();
	const other = start(threeCategories);

	// The other runtime clears, then saves one category, before this one
	// reconciles even once.
	vi.setSystemTime(1_800_000_001_000);
	other.clearRecords();
	vi.setSystemTime(1_800_000_002_000);
	void other.kernel.commands.save({ marketing: false });
	other.dispose();

	active.reconcileStorage();
	expect(decision(active, 'marketing')).toBe(false);
	expect(decision(active, 'measurement')).toBeUndefined();
	expect(measurement(active)).toBe(false);
	expect(active.kernel.getSnapshot().subject?.subjectId).toBe(
		storedSubject()?.subjectId
	);
});

test('a runtime that missed a clear cannot write back decisions from before it', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	await start(threeCategories).kernel.commands.save('all');
	await nextTask();
	const stale = start(threeCategories);
	const other = start(threeCategories);

	// Recorded before the clear; the write is still queued.
	vi.setSystemTime(1_800_000_000_500);
	void stale.kernel.commands.save({ measurement: true });

	vi.setSystemTime(1_800_000_001_000);
	other.clearRecords();
	vi.setSystemTime(1_800_000_002_000);
	void other.kernel.commands.save({ marketing: false });
	other.dispose();

	// Lands the queued write, then reads.
	stale.reconcileStorage();
	const fresh = start(threeCategories);
	expect(decision(fresh, 'measurement')).toBeUndefined();
	expect(decision(fresh, 'marketing')).toBe(false);
	expect(decision(stale, 'measurement')).toBeUndefined();
});

test('a runtime that missed a clear keeps only what it decided after it', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	await start(threeCategories).kernel.commands.save('all');
	await nextTask();
	const stale = start(threeCategories);
	const other = start(threeCategories);

	vi.setSystemTime(1_800_000_001_000);
	other.clearRecords();
	vi.setSystemTime(1_800_000_002_000);
	await other.kernel.commands.save({ marketing: false });
	await nextTask();

	// A new decision in the runtime that has not seen the clear yet.
	vi.setSystemTime(1_800_000_003_000);
	await stale.kernel.commands.save({ marketing: true });
	await nextTask();

	const fresh = start(threeCategories);
	expect(decision(fresh, 'marketing')).toBe(true);
	// Granted before the clear and never decided again.
	expect(decision(fresh, 'measurement')).toBeUndefined();
	stale.reconcileStorage();
	expect(decision(stale, 'marketing')).toBe(true);
	expect(decision(stale, 'measurement')).toBeUndefined();
});

test('a server read voids decisions from before the clear epoch', () => {
	const now = Date.now();
	const envelope = encodeStoredConsentEnvelopeCompact({
		categories: explicitChoice(
			{ measurement: true },
			{
				confirmedAt: now - 5000,
				fingerprint: resolution.fingerprints.choice,
				now,
			}
		).categories,
		version: 3,
	});
	const header = `c15t=${envelope}; c15t-epoch=${now - 1000}`;
	expect(
		readStoredRecordsFromCookieHeader(header, undefined, now).choice
	).toBeNull();
	expect(
		readStoredRecordsFromCookieHeader(`c15t=${envelope}`, undefined, now).choice
	).not.toBeNull();
});

test.each([
	['a future clear epoch', () => `${Date.now() + 60_000}`],
	['a malformed clear epoch', () => 'not-a-time'],
])('%s voids nothing', async (_case, epoch) => {
	resolution = optOut;
	await start().kernel.commands.save('none');
	await nextTask();
	document.cookie = `c15t-epoch=${epoch()}; path=/`;
	localStorage.setItem('c15t-epoch', epoch());

	expect(measurement(start())).toBe(false);
});

test('a subject generated right after a clear still yields to one another runtime stored', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1_800_000_000_000);
	const active = start();
	await active.kernel.commands.save('all');
	await nextTask();

	// Something clears the records as the next save starts, after this
	// runtime noted its pre-clear subject.
	let cleared = false;
	active.kernel.events.on('command:save:started', () => {
		if (!cleared) {
			cleared = true;
			active.clearRecords();
		}
	});
	vi.setSystemTime(1_800_000_001_000);
	void active.kernel.commands.save('none');
	expect(active.kernel.getSnapshot().subject?.subjectId).toBeTruthy();

	// Another runtime stores a subject before this one's write lands.
	const other = start();
	void other.kernel.commands.save('all');
	const storedId = other.kernel.getSnapshot().subject?.subjectId;
	other.dispose();

	active.reconcileStorage();
	expect(storedSubject()?.subjectId).toBe(storedId);
});
