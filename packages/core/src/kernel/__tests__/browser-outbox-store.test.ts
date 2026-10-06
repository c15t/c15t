/**
 * The browser outbox store: localStorage under a Web Lock, in the format
 * earlier releases wrote, so saves a visitor queued before an upgrade
 * still replay. Storage and locks are injected; the last test runs the
 * default store against the test window's localStorage.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ConsentSaveRejectedError, createConsentKernel } from '../../index';
import type { KernelConfig } from '../../types';
import { clearKernelRecords } from '../clear-records';
import { createKernel } from '../index';
import { createBrowserOutboxStore } from '../save-outbox';
import type { BrowserOutboxEnvironment } from '../save-outbox/store';

// The stored format is part of the interface: spelled out, not imported.
const SAVES_KEY = 'c15t-v3-pending-consent-saves:v1';
const REASSIGNMENTS_KEY = 'c15t-v3-subject-reassignments:v1';

afterEach(() => {
	vi.restoreAllMocks();
});

const memoryStorage = function memoryStorage(): Storage {
	const values = new Map<string, string>();
	return {
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		get length() {
			return values.size;
		},
		removeItem: (key) => {
			values.delete(key);
		},
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
};

/** A lock manager that grants one request at a time, in order. */
const serialLocks = function serialLocks() {
	const names: string[] = [];
	let chain: Promise<unknown> = Promise.resolve();
	const locks = {
		request(name: string, run: () => unknown) {
			names.push(name);
			const granted = chain.then(run);
			chain = granted.catch(() => undefined);
			return granted;
		},
	} as unknown as LockManager;
	return { locks, names };
};

const kernelOn = function kernelOn(
	config: KernelConfig,
	environment: BrowserOutboxEnvironment
) {
	return createKernel(config, {
		outboxStore: createBrowserOutboxStore(environment),
	});
};

const offline = () => vi.fn().mockRejectedValue(new Error('save offline'));

/** A queued save as an earlier release wrote it. */
const legacyEntry = {
	attempts: 2,
	payload: {
		choice: {
			categories: {
				marketing: {
					basis: { fingerprint: 'fp', kind: 'choice-v1' },
					confirmedAt: 1_700_000_000_000,
					value: true,
				},
			},
			version: 3,
		},
		confirmed: {
			actionAt: 1_700_000_000_000,
			categories: { marketing: true },
		},
		consentAction: 'custom',
		consents: { marketing: true, necessary: true },
		givenAt: 1_700_000_000_000,
		model: 'opt-in',
		overrides: {},
		policySnapshotToken: null,
		subject: { subjectId: 'sub_legacy' },
		subjectId: 'sub_legacy',
		tcString: null,
		uiSource: 'banner',
		user: null,
	},
	queuedAt: Date.now() - 60_000,
};

describe('browser outbox store', () => {
	test('queues a failed save as a JSON list under the saves key', async () => {
		const storage = memoryStorage();
		const { locks, names } = serialLocks();
		const kernel = kernelOn(
			{ transport: { save: offline() } },
			{ localStorage: () => storage, locks: () => locks }
		);

		await kernel.commands.save('all');

		const stored = JSON.parse(storage.getItem(SAVES_KEY) ?? 'null');
		expect(stored).toEqual([
			{
				attempts: 0,
				payload: expect.objectContaining({
					consentAction: 'all',
					subjectId: kernel.getSnapshot().subject?.subjectId,
				}),
				queuedAt: expect.any(Number),
			},
		]);
		expect(new Set(names)).toEqual(new Set([SAVES_KEY]));
		kernel.dispose();
	});

	test('records a subject reassignment under the reassignments key', async () => {
		const storage = memoryStorage();
		const save = vi
			.fn()
			.mockRejectedValueOnce(
				new ConsentSaveRejectedError({
					code: 'SUBJECT_CONFLICT',
					message: '/subjects responded 409',
					status: 409,
				})
			)
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn(
			{
				initialRecords: { subject: { subjectId: 'sub_taken' } },
				transport: { save },
			},
			{ localStorage: () => storage, locks: () => null }
		);

		await kernel.commands.save('all');

		expect(JSON.parse(storage.getItem(REASSIGNMENTS_KEY) ?? 'null')).toEqual([
			{
				at: expect.any(Number),
				from: 'sub_taken',
				to: kernel.getSnapshot().subject?.subjectId,
			},
		]);
		kernel.dispose();
	});

	test('replays a save queued by an earlier release and removes the key', async () => {
		const storage = memoryStorage();
		storage.setItem(SAVES_KEY, JSON.stringify([legacyEntry]));
		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			{ localStorage: () => storage, locks: () => serialLocks().locks }
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(storage.getItem(SAVES_KEY)).toBeNull();
		});
		expect(save).toHaveBeenCalledWith(legacyEntry.payload);
		kernel.dispose();
	});

	test.each([
		{ label: 'invalid JSON', stored: '{not json' },
		{ label: 'a non-array value', stored: '{"payload":{}}' },
	])('resets a queue holding $label', async ({ stored }) => {
		const storage = memoryStorage();
		storage.setItem(SAVES_KEY, stored);
		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			{ localStorage: () => storage, locks: () => null }
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(storage.getItem(SAVES_KEY)).toBeNull();
		});
		expect(save).not.toHaveBeenCalled();
		kernel.dispose();
	});

	test('waits for the Web Lock another tab holds', async () => {
		const storage = memoryStorage();
		const { locks } = serialLocks();
		const kernel = kernelOn(
			{
				initialRecords: { subject: { subjectId: 'sub_fixed' } },
				transport: { save: offline() },
			},
			{ localStorage: () => storage, locks: () => locks }
		);
		let releaseLock: () => void = () => {};
		void locks.request(
			SAVES_KEY,
			() =>
				new Promise<void>((resolve) => {
					releaseLock = resolve;
				})
		);
		const completed: boolean[] = [];
		kernel.events.on('command:save:completed', ({ result }) => {
			completed.push(result.ok);
		});

		const pending = kernel.commands.save('all');
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(storage.getItem(SAVES_KEY)).toBeNull();
		expect(completed).toEqual([]);

		releaseLock();
		await expect(pending).resolves.toMatchObject({ ok: false });
		expect(completed).toEqual([false]);
		expect(JSON.parse(storage.getItem(SAVES_KEY) ?? '[]')).toHaveLength(1);
		kernel.dispose();
	});

	test('a clear empties the queue before it returns, even while another tab holds the lock', async () => {
		// The page clearing the records can close before the lock is granted.
		// Its queued saves must not replay for the cleared subject on the
		// next page.
		const storage = memoryStorage();
		storage.setItem(SAVES_KEY, JSON.stringify([legacyEntry]));
		storage.setItem(
			REASSIGNMENTS_KEY,
			JSON.stringify([{ at: Date.now(), from: 'sub_old', to: 'sub_legacy' }])
		);
		const { locks } = serialLocks();
		void locks.request(
			SAVES_KEY,
			() =>
				new Promise<void>(() => {
					// Never released.
				})
		);
		const kernel = kernelOn(
			{ initialRecords: { subject: { subjectId: 'sub_legacy' } } },
			{ localStorage: () => storage, locks: () => locks }
		);

		clearKernelRecords(kernel);

		expect(storage.getItem(SAVES_KEY)).toBeNull();
		expect(storage.getItem(REASSIGNMENTS_KEY)).toBeNull();
		kernel.dispose();

		// The next page: the lock is free again, and nothing is left to replay.
		const save = vi.fn().mockResolvedValue({ ok: true });
		const next = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			{ localStorage: () => storage, locks: () => serialLocks().locks }
		);
		await next.commands.init();
		await vi.waitFor(() => {
			expect(storage.getItem(SAVES_KEY)).toBeNull();
		});
		expect(save).not.toHaveBeenCalled();
		next.dispose();
	});

	test('a clear runs again under the lock, after a transaction that read the queue before it', async () => {
		// Another tab's transaction can read the queue before the clear and
		// write it back after. The clear waits for the lock and empties it
		// again.
		const storage = memoryStorage();
		const { locks } = serialLocks();
		let releaseLock: () => void = () => {};
		void locks.request(
			SAVES_KEY,
			() =>
				new Promise<void>((resolve) => {
					releaseLock = resolve;
				})
		);
		const kernel = kernelOn(
			{ initialRecords: { subject: { subjectId: 'sub_legacy' } } },
			{ localStorage: () => storage, locks: () => locks }
		);
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		clearKernelRecords(kernel);
		storage.setItem(SAVES_KEY, JSON.stringify([legacyEntry]));
		releaseLock();

		await vi.waitFor(() => {
			expect(storage.getItem(SAVES_KEY)).toBeNull();
		});
		kernel.dispose();
	});

	test('runs unsynchronized when the lock request rejects', async () => {
		const storage = memoryStorage();
		const request = vi.fn().mockRejectedValue(new Error('lock aborted'));
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			{
				localStorage: () => storage,
				locks: () => ({ request }) as unknown as LockManager,
			}
		);

		await kernel.commands.save('all');
		expect(request).toHaveBeenCalled();
		expect(JSON.parse(storage.getItem(SAVES_KEY) ?? '[]')).toHaveLength(1);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(storage.getItem(SAVES_KEY)).toBeNull();
		});
		expect(save).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('a save still settles when storage throws', async () => {
		const storage = memoryStorage();
		const fail = () => {
			throw new Error('storage blocked');
		};
		storage.getItem = fail;
		storage.setItem = fail;
		storage.removeItem = fail;
		const kernel = kernelOn(
			{ transport: { save: offline() } },
			{ localStorage: () => storage, locks: () => null }
		);

		await expect(kernel.commands.save('all')).resolves.toMatchObject({
			ok: false,
		});
		kernel.dispose();
	});

	test('keeps the queue in memory without localStorage', async () => {
		// A host with no localStorage (a server, blocked storage) still
		// retries a failed save for as long as the kernel lives.
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			{ localStorage: () => null, locks: () => null }
		);

		await kernel.commands.save('all');
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(save).toHaveBeenCalledTimes(2);
		});
		expect(save.mock.calls[1]?.[0]).toEqual(save.mock.calls[0]?.[0]);
		kernel.dispose();
	});

	test('the default store reads window.localStorage', async () => {
		window.localStorage.setItem(SAVES_KEY, JSON.stringify([legacyEntry]));
		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			transport: { init: vi.fn().mockResolvedValue({}), save },
		});
		try {
			await kernel.commands.init();
			await vi.waitFor(() => {
				expect(window.localStorage.getItem(SAVES_KEY)).toBeNull();
			});
			expect(save).toHaveBeenCalledWith(legacyEntry.payload);
		} finally {
			kernel.dispose();
			window.localStorage.removeItem(SAVES_KEY);
		}
	});
});
