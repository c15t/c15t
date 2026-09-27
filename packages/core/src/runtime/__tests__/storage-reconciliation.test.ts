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
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { clearStoredConsentRecords } from '../../modules/persistence/record-storage';
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
