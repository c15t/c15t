/**
 * @vitest-environment jsdom
 *
 * The save outbox through the kernel: sending a recorded choice, trimming
 * what newer state superseded, queueing, replay, subject reassignment,
 * online retry and clearing.
 *
 * Every kernel here keeps its queue in an in-memory outbox store. Two tabs
 * are two kernels sharing one store; another tab holding the store is a
 * store wrapper that waits. The browser store has its own suite.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { ConsentSaveRejectedError, isConsentSaveRejection } from '../../index';
import { buildDecisionAssertion } from '../../transports/decision-inputs';
import { createHostedTransport } from '../../transports/hosted';
import type {
	KernelConfig,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../../types';
import { createKernel } from '../index';
import type { InternalKernel } from '../internals';
import {
	createBrowserOutboxStore,
	createMemoryOutboxStore,
} from '../save-outbox';
import type { SaveOutboxStore } from '../save-outbox';

interface QueuedEntry {
	payload: SavePayload;
	queuedAt: number;
	attempts: number;
}

let store: SaveOutboxStore;

beforeEach(() => {
	store = createMemoryOutboxStore();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

/** A kernel whose outbox keeps its queue in `outboxStore`. */
const kernelOn = function kernelOn(
	config: KernelConfig,
	outboxStore: SaveOutboxStore = store
): InternalKernel {
	return createKernel(config, { outboxStore });
};

const queued = function queued(): Promise<QueuedEntry[]> {
	return store.transact((tx) => (tx.read('saves') ?? []) as QueuedEntry[]);
};

const editQueue = function editQueue(
	edit: (entries: QueuedEntry[]) => unknown[]
): Promise<void> {
	return store.transact((tx) => {
		tx.write('saves', edit((tx.read('saves') ?? []) as QueuedEntry[]));
	});
};

/** The clear every adapter runs: records nulled, then announced. */
const clearRecords = function clearRecords(kernel: InternalKernel): void {
	kernel.hydrate({
		choice: null,
		noticeDismissal: null,
		subject: null,
		vendorChoice: null,
	});
	kernel.events.emit({ type: 'records:cleared' });
};

const refused = (code: string) =>
	new ConsentSaveRejectedError({
		code,
		message: `/subjects responded 409 (${code})`,
		status: 409,
	});

/** A save the backend accepts, echoing the subject it was sent under. */
const accepted = ({ subjectId }: { subjectId: string }) =>
	Promise.resolve({ ok: true, subjectId });

describe('save outbox: queue and replay', () => {
	test('successful init starts replay without waiting for it', async () => {
		const lifecycle: string[] = [];
		let resolveReplay: (
			value: SaveResult | PromiseLike<SaveResult>
		) => void = () => {};
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockImplementationOnce(
				() =>
					new Promise<SaveResult>((resolve) => {
						lifecycle.push('replay started');
						resolveReplay = resolve;
					})
			);
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', (event) => {
			replayed.push({ ok: event.ok, subjectId: event.subjectId });
		});
		kernel.events.on('command:init:completed', () => {
			lifecycle.push('init completed');
		});

		const saveResult = await kernel.commands.save('all');
		expect(saveResult.ok).toBe(false);
		const stored = await queued();
		expect(stored).toHaveLength(1);
		expect(stored[0]?.payload.subjectId).toBe(
			kernel.getSnapshot().subject?.subjectId
		);

		const initResult = await kernel.commands.init();
		expect(initResult.ok).toBe(true);
		// The replay reads the store first, so it starts after init resolved.
		await vi.waitFor(() => {
			expect(saveSpy).toHaveBeenCalledTimes(2);
		});
		expect(replayed).toEqual([]);
		expect(lifecycle).toEqual(['init completed', 'replay started']);

		resolveReplay({ ok: true });
		await vi.waitFor(() => {
			expect(replayed).toEqual([
				{ ok: true, subjectId: kernel.getSnapshot().subject?.subjectId },
			]);
		});
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('init replays queued saves when the transport has no init', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({ transport: { save: saveSpy } });

		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);

		await kernel.commands.init();
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});
		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('a successful save discards the queued save for its subject', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_fixed' } },
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: boolean[] = [];
		kernel.events.on('save:replayed', ({ ok }) => {
			replayed.push(ok);
		});

		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);

		await kernel.commands.save('none');
		expect(await queued()).toEqual([]);

		// The stale 'all' must never reach the backend after 'none' did.
		await kernel.commands.init();
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(replayed).toEqual([]);
		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('queued saves replay with the original givenAt', async () => {
		vi.useFakeTimers({ now: 1_700_000_000_000 });
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		const pendingSave = kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(0);
		await pendingSave;
		expect((await queued())[0]?.payload.givenAt).toBe(1_700_000_000_000);

		vi.setSystemTime(1_700_000_060_000);
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(saveSpy).toHaveBeenCalledTimes(2);
		});
		expect(saveSpy.mock.calls[1]?.[0]).toMatchObject({
			givenAt: 1_700_000_000_000,
		});
		kernel.dispose();
	});

	test('queued saves replay with the original timeToDecisionMs', async () => {
		vi.useFakeTimers({ now: 1_700_000_000_000 });
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			initialPolicyResolution: matchedResolution(optInRule()),
			transport: { save: saveSpy },
		});

		// Init marks the kernel live, so the visible banner is an impression.
		await kernel.commands.init();
		expect(kernel.getSnapshot().surfaceShownAt.banner).toBe(1_700_000_000_000);

		vi.setSystemTime(1_700_000_003_000);
		const pendingSave = kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(0);
		await pendingSave;
		expect(await queued()).toEqual([
			expect.objectContaining({
				payload: expect.objectContaining({ timeToDecisionMs: 3000 }),
			}),
		]);

		vi.setSystemTime(1_700_000_060_000);
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(saveSpy).toHaveBeenCalledTimes(2);
		});
		expect(saveSpy.mock.calls[1]?.[0]).toMatchObject({
			givenAt: 1_700_000_003_000,
			timeToDecisionMs: 3000,
			uiSource: 'banner',
		});
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('queued no-match saves retain the action inputs after init changes location', async () => {
		const saveSpy = vi
			.fn<NonNullable<KernelTransport['save']>>()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			initialLocation: { countryCode: 'US', regionCode: null },
			initialOverrides: { region: 'CA' },
			initialPolicyResolution: { policy: null, status: 'no-match' },
			transport: {
				init: () =>
					Promise.resolve({
						location: { countryCode: 'DE', regionCode: 'BE' },
					}),
				save: saveSpy,
			},
		});
		try {
			expect((await kernel.commands.save('none')).ok).toBe(false);
			await kernel.commands.init();
			await vi.waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(2));
			const replay = saveSpy.mock.calls[1]?.[0];
			if (!replay) {
				throw new Error('Expected queued save replay');
			}
			expect(
				buildDecisionAssertion(replay, {
					country: 'DE',
					fingerprint: 'new-policy',
					language: 'de',
					policyId: 'new-policy',
					region: 'BE',
				})
			).toEqual({
				country: 'US',
				fingerprint: undefined,
				gpc: false,
				language: 'en',
				policyId: null,
				region: null,
			});
			expect(await queued()).toEqual([]);
		} finally {
			kernel.dispose();
		}
	});

	test('replay skips an entry another tab already replayed', async () => {
		// Transactions, in order: enqueue, the replay's "anything queued?"
		// read, its listing, the per-entry check. Another tab drains the
		// queue right before the per-entry check.
		let transactions = 0;
		const racing: SaveOutboxStore = {
			clear: store.clear,
			transact: (run) =>
				store.transact((tx) => {
					transactions += 1;
					if (transactions === 4) {
						tx.write('saves', []);
					}
					return run(tx);
				}),
		};
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy } },
			racing
		);
		const replayed: boolean[] = [];
		kernel.events.on('save:replayed', ({ ok }) => {
			replayed.push(ok);
		});

		await kernel.commands.save('all');
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(transactions).toBeGreaterThanOrEqual(5);
		});

		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect(replayed).toEqual([]);
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('drops malformed queue entries before replay', async () => {
		const validPayload = {
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
			model: 'opt-out',
			overrides: {},
			policySnapshotToken: 'snap-1',
			subject: { subjectId: 'sub_valid' },
			subjectId: 'sub_valid',
			tcString: null,
			uiSource: 'dialog',
			user: {
				externalId: 'user-1',
				externalIdType: 'email',
				identityProvider: 'auth0',
				properties: { plan: 'pro', seats: 3, trial: false },
			},
		};
		const entry = (payload: unknown, extra: Record<string, unknown> = {}) => ({
			attempts: 0,
			payload,
			queuedAt: Date.now(),
			...extra,
		});
		await editQueue(() => [
			entry(validPayload),
			'not an entry',
			entry(null),
			entry({ ...validPayload, model: 'weird', subjectId: 'sub_model' }),
			entry({ ...validPayload, subjectId: 'sub_ui', uiSource: 'popup' }),
			entry({ ...validPayload, consentAction: 'x', subjectId: 'sub_action' }),
			entry({
				...validPayload,
				consents: { a: 1 },
				subjectId: 'sub_consents',
			}),
			entry({ ...validPayload, overrides: [], subjectId: 'sub_overrides' }),
			entry({ ...validPayload, subjectId: 'sub_user', user: { id: 1 } }),
			entry({
				...validPayload,
				subjectId: 'sub_user_type',
				user: { externalId: 'u', externalIdType: 7 },
			}),
			entry({
				...validPayload,
				subjectId: 'sub_user_props',
				user: { externalId: 'u', properties: { nested: {} } },
			}),
			entry({ ...validPayload, givenAt: 'yesterday', subjectId: 'sub_given' }),
			entry({
				...validPayload,
				policySnapshotToken: 1,
				subjectId: 'sub_token',
			}),
			entry({ ...validPayload, subjectId: 'sub_tc', tcString: 5 }),
			entry({ ...validPayload, subjectId: 42 }),
			entry({ ...validPayload, subjectId: 'sub_queued' }, { queuedAt: -1 }),
			entry({ ...validPayload, subjectId: 'sub_attempts' }, { attempts: 1.5 }),
		]);
		const saveSpy = vi.fn().mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		await kernel.commands.init();
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});

		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect(saveSpy).toHaveBeenCalledWith(validPayload);
		kernel.dispose();
	});

	test('replays every queued subject and records each result separately', async () => {
		const failingSave = vi.fn().mockRejectedValue(new Error('save offline'));
		const tabA = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_a' } },
			transport: { save: failingSave },
		});
		const tabB = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_b' } },
			transport: { save: failingSave },
		});
		await tabA.commands.save('all');
		await tabB.commands.save('none');
		tabA.dispose();
		tabB.dispose();

		// A fresh kernel replays the shared queue: sub_a succeeds, sub_b fails
		// and must survive the bookkeeping for sub_a's success.
		const replaySave = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_b'
				? Promise.reject(new Error('still offline'))
				: Promise.resolve({ ok: true })
		);
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: replaySave },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, subjectId }) => {
			replayed.push({ ok, subjectId });
		});

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(2);
		});

		expect(replayed).toEqual([
			{ ok: true, subjectId: 'sub_a' },
			{ ok: false, subjectId: 'sub_b' },
		]);
		const remaining = await queued();
		expect(remaining).toHaveLength(1);
		expect(remaining[0]).toMatchObject({
			attempts: 1,
			payload: { subjectId: 'sub_b' },
		});
		kernel.dispose();
	});

	test('failed replay stays queued', async () => {
		const saveSpy = vi.fn().mockRejectedValue(new Error('save offline'));
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', (event) => {
			replayed.push({ ok: event.ok, subjectId: event.subjectId });
		});

		await kernel.commands.save('all');
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});

		expect(saveSpy).toHaveBeenCalledTimes(2);
		expect(replayed).toEqual([
			{ ok: false, subjectId: kernel.getSnapshot().subject?.subjectId },
		]);
		expect(await queued()).toHaveLength(1);
		kernel.dispose();
	});

	test('queued saves dedupe by subjectId and keep the newest payload', async () => {
		const kernel = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_fixed' } },
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		await kernel.commands.save('all');
		await editQueue((entries) =>
			entries.map((entry) => ({ ...entry, attempts: 5 }))
		);
		await kernel.commands.save('none');

		const stored = await queued();
		expect(stored).toHaveLength(1);
		expect(stored[0]).toMatchObject({
			attempts: 0,
			payload: {
				consentAction: 'necessary',
				consents: { marketing: false },
				subjectId: 'sub_fixed',
			},
		});
		kernel.dispose();
	});

	test('drops pending saves older than seven days before replay', async () => {
		const saveSpy = vi.fn().mockRejectedValue(new Error('save offline'));
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		await kernel.commands.save('all');
		await editQueue((entries) =>
			entries.map((entry) => ({
				...entry,
				queuedAt: Date.now() - 7 * 24 * 60 * 60 * 1000 - 1,
			}))
		);

		await kernel.commands.init();
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});
		expect(saveSpy).toHaveBeenCalledTimes(1);
		kernel.dispose();
	});

	test('increments failed replay attempts and drops the entry at ten', async () => {
		const saveSpy = vi.fn().mockRejectedValue(new Error('save offline'));
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: boolean[] = [];
		kernel.events.on('save:replayed', (event) => {
			replayed.push(event.ok);
		});

		await kernel.commands.save('all');
		await editQueue((entries) =>
			entries.map((entry) => ({ ...entry, attempts: 8 }))
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});
		expect((await queued())[0]?.attempts).toBe(9);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(2);
		});
		expect(replayed).toEqual([false, false]);
		expect(saveSpy).toHaveBeenCalledTimes(3);
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});
});

describe('save outbox: online retry', () => {
	test('online event replays a failed save', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({ transport: { save: saveSpy } });

		await kernel.commands.save('all');
		window.dispatchEvent(new Event('online'));
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});

		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('a replayed save sends the consent model as model', async () => {
		const bodies: Record<string, unknown>[] = [];
		const fetchSpy = vi.fn<typeof globalThis.fetch>((_url, init) => {
			bodies.push(JSON.parse(String(init?.body)));
			return bodies.length === 1
				? Promise.reject(new TypeError('Failed to fetch'))
				: Promise.resolve(Response.json({ ok: true, subjectId: 'sub_fixed' }));
		});
		const kernel = kernelOn({
			initialPolicyResolution: matchedResolution(optInRule()),
			initialRecords: { subject: { subjectId: 'sub_fixed' } },
			transport: createHostedTransport({
				backendURL: 'https://backend.test',
				fetch: fetchSpy,
			}),
		});

		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);
		window.dispatchEvent(new Event('online'));
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		for (const body of bodies) {
			expect(body).toMatchObject({ model: 'opt-in' });
			expect(body).not.toHaveProperty('jurisdictionModel');
		}
		kernel.dispose();
	});

	test('overlapping replays share one run', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({ transport: { save: saveSpy } });

		await kernel.commands.save('all');
		window.dispatchEvent(new Event('online'));
		window.dispatchEvent(new Event('online'));
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('dispose stops listening for online', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({ transport: { save: saveSpy } });

		await kernel.commands.save('all');
		kernel.dispose();
		window.dispatchEvent(new Event('online'));
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect(await queued()).toHaveLength(1);
	});
});

describe('save outbox: refusals', () => {
	test('a save the backend refuses for good is not queued', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValue(refused('POLICY_SNAPSHOT_INVALID'));
		const kernel = kernelOn({ transport: { save: saveSpy } });
		const errors: unknown[] = [];
		kernel.events.on('command:error', ({ error }) => {
			errors.push(error);
		});

		await expect(kernel.commands.save('all')).resolves.toMatchObject({
			ok: false,
		});

		expect(await queued()).toEqual([]);
		expect(errors).toHaveLength(1);
		expect(isConsentSaveRejection(errors[0])).toBe(true);
		// The choice is still recorded in the browser.
		expect(kernel.getSnapshot().explicitChoice).not.toBeNull();
		kernel.dispose();
	});

	test('a save refused for good drops the queued saves it replaced', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(refused('POLICY_SNAPSHOT_EXPIRED'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		// An offline grant is queued, then the visitor rejects everything and
		// the backend refuses that newer choice for good.
		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);
		await kernel.commands.save('none');

		expect(await queued()).toEqual([]);
		// The stale grant never replays on the next load.
		await kernel.commands.init();
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('a replay refused for good leaves the queue instead of retrying', async () => {
		vi.useFakeTimers({ now: 1_800_000_000_000, toFake: ['Date'] });
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(refused('STALE_POLICY'));
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; rejected?: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, rejected }) => {
			replayed.push({ ok, rejected });
		});

		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);

		// Back online two hours later; the backend refuses the replay.
		vi.setSystemTime(1_800_000_000_000 + 2 * 60 * 60 * 1000);
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toEqual([{ ok: false, rejected: 'STALE_POLICY' }]);
		});
		expect(await queued()).toEqual([]);

		// Nothing is left to replay on the next load.
		await kernel.commands.init();
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(saveSpy).toHaveBeenCalledTimes(2);
		kernel.dispose();
	});

	test('a replay that fails for another reason stays queued', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(new Error('/subjects responded 503'));
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; rejected?: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, rejected }) => {
			replayed.push({ ok, rejected });
		});

		await kernel.commands.save('all');
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toEqual([{ ok: false, rejected: undefined }]);
		});
		const stored = await queued();
		expect(stored).toHaveLength(1);
		expect(stored[0]?.attempts).toBe(1);
		kernel.dispose();
	});
});

describe('save outbox: subject reassignment', () => {
	test('a subject id another tenant owns is replaced and the choice sent again', async () => {
		// On a shared database, `subject.id` is unique across tenants. A
		// visitor whose id another tenant holds is refused on every save; a
		// new id is the only way their choice is ever recorded.
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(refused('SUBJECT_CONFLICT'))
			.mockImplementation(accepted);
		const kernel = kernelOn({ transport: { save: saveSpy } });
		const errors: unknown[] = [];
		kernel.events.on('command:error', ({ error }) => {
			errors.push(error);
		});
		const resolved: (string | undefined)[] = [];
		kernel.events.on('subject:resolved', ({ snapshot }) => {
			resolved.push(snapshot.subject?.subjectId);
		});

		const result = await kernel.commands.save('all');

		expect(saveSpy).toHaveBeenCalledTimes(2);
		const refusedId = saveSpy.mock.calls[0]?.[0].subjectId as string;
		const retried = saveSpy.mock.calls[1]?.[0];
		expect(retried.subjectId).not.toBe(refusedId);
		expect(retried.subjectId).toMatch(/^sub_/u);
		expect(retried.subject.subjectId).toBe(retried.subjectId);
		// The same act, only under the new id.
		expect({ ...retried, subject: null, subjectId: null }).toEqual({
			...saveSpy.mock.calls[0]?.[0],
			subject: null,
			subjectId: null,
		});
		expect(result).toMatchObject({ ok: true, subjectId: retried.subjectId });
		expect(kernel.getSnapshot().subject?.subjectId).toBe(retried.subjectId);
		// Persistence writes the new id on `subject:resolved`.
		expect(resolved).toEqual([retried.subjectId]);
		expect(errors).toEqual([]);
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('a backend that refuses every subject id costs one resend, not a loop', async () => {
		const saveSpy = vi.fn().mockRejectedValue(refused('SUBJECT_CONFLICT'));
		const kernel = kernelOn({ transport: { save: saveSpy } });
		const errors: unknown[] = [];
		kernel.events.on('command:error', ({ error }) => {
			errors.push(error);
		});

		await expect(kernel.commands.save('all')).resolves.toMatchObject({
			ok: false,
		});

		expect(saveSpy).toHaveBeenCalledTimes(2);
		expect(errors).toHaveLength(1);
		// Refused for good, so nothing is queued to replay.
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('a queued save refused for its subject id replays under a new one', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(refused('SUBJECT_CONFLICT'))
			.mockImplementation(accepted);
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; rejected?: string; subjectId: string }[] =
			[];
		kernel.events.on('save:replayed', ({ ok, rejected, subjectId }) => {
			replayed.push({ ok, rejected, subjectId });
		});

		await kernel.commands.save('all');
		const queuedId = kernel.getSnapshot().subject?.subjectId;
		expect(queuedId).toBeDefined();

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});

		const newId = kernel.getSnapshot().subject?.subjectId;
		expect(newId).not.toBe(queuedId);
		expect(replayed).toEqual([{ ok: true, subjectId: newId }]);
		expect(saveSpy).toHaveBeenCalledTimes(3);
		expect(saveSpy.mock.calls[2]?.[0]).toMatchObject({
			subject: { subjectId: newId },
			subjectId: newId,
		});
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('a queued save for a subject the visitor no longer has is dropped, not moved', async () => {
		// Moving it would record the old subject's choice under whoever holds
		// the snapshot now.
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValue(refused('SUBJECT_CONFLICT'));
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; rejected?: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, rejected }) => {
			replayed.push({ ok, rejected });
		});

		await kernel.commands.save('all');
		kernel.set.subjectId('sub_someone_else');
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});

		expect(replayed).toEqual([{ ok: false, rejected: 'SUBJECT_CONFLICT' }]);
		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_someone_else');
		expect(saveSpy).toHaveBeenCalledTimes(2);
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('queued saves under a replaced subject id move with it', async () => {
		// An earlier choice still waiting to replay would otherwise be sent
		// under the refused id and dropped.
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(refused('SUBJECT_CONFLICT'))
			.mockImplementation(accepted);
		const kernel = kernelOn({ transport: { save: saveSpy } });

		// Disjoint categories, so the second act does not supersede the first
		// and the queued one is still owed a replay.
		await kernel.commands.save({ marketing: true });
		const queuedId = kernel.getSnapshot().subject?.subjectId;
		await kernel.commands.save({ measurement: false });
		const newId = kernel.getSnapshot().subject?.subjectId;
		expect(newId).not.toBe(queuedId);

		const stored = await queued();
		expect(stored).toHaveLength(1);
		expect(stored[0]?.payload).toMatchObject({
			confirmed: { categories: { marketing: true } },
			subject: { subjectId: newId },
			subjectId: newId,
		});
		kernel.dispose();
	});

	test('every queued save for a reassigned subject replays in the same run', async () => {
		// The queue moves all of them at once. Skipping the rest until the next
		// page load would leave an online visitor's choices unrecorded.
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValueOnce(refused('SUBJECT_CONFLICT'))
			.mockImplementation(accepted);
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, subjectId }) => {
			replayed.push({ ok, subjectId });
		});

		await kernel.commands.save({ marketing: true });
		await kernel.commands.save({ measurement: false });
		const queuedId = kernel.getSnapshot().subject?.subjectId;
		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(2);
		});

		const newId = kernel.getSnapshot().subject?.subjectId;
		expect(newId).not.toBe(queuedId);
		expect(replayed).toEqual([
			{ ok: true, subjectId: newId },
			{ ok: true, subjectId: newId },
		]);
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});

	test('a canonical subject id returned by the resend is adopted', async () => {
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(refused('SUBJECT_CONFLICT'))
			.mockResolvedValue({ ok: true, subjectId: 'sub_canonical' });
		const kernel = kernelOn({ transport: { save: saveSpy } });

		const result = await kernel.commands.save('all');

		expect(result).toMatchObject({ ok: true, subjectId: 'sub_canonical' });
		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_canonical');
		kernel.dispose();
	});

	test('a visitor set back to the refused id moves to the same new one', async () => {
		// Returning null here would drop a choice the kernel knows how to save.
		const saveSpy = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_taken'
				? Promise.reject(refused('SUBJECT_CONFLICT'))
				: accepted({ subjectId })
		);
		const kernel = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_taken' } },
			transport: { save: saveSpy },
		});

		await expect(
			kernel.commands.save({ marketing: true })
		).resolves.toMatchObject({ ok: true });
		const newId = kernel.getSnapshot().subject?.subjectId;
		expect(newId).not.toBe('sub_taken');

		kernel.set.subjectId('sub_taken');
		await expect(
			kernel.commands.save({ measurement: false })
		).resolves.toMatchObject({ ok: true, subjectId: newId });
		expect(kernel.getSnapshot().subject?.subjectId).toBe(newId);
		kernel.dispose();
	});

	test('a visitor refused again after a reset gets a new id, not the old replacement', async () => {
		// Reusing the pre-reset replacement would tie the visitor's new history
		// to the subject they reset away from.
		const saveSpy = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_taken'
				? Promise.reject(refused('SUBJECT_CONFLICT'))
				: accepted({ subjectId })
		);
		const kernel = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_taken' } },
			transport: { save: saveSpy },
		});

		await kernel.commands.save({ marketing: true });
		const firstReplacement = kernel.getSnapshot().subject?.subjectId;

		clearRecords(kernel);
		kernel.set.subjectId('sub_taken');
		await expect(
			kernel.commands.save({ measurement: false })
		).resolves.toMatchObject({ ok: true });

		const secondReplacement = kernel.getSnapshot().subject?.subjectId;
		expect(secondReplacement).not.toBe('sub_taken');
		expect(secondReplacement).not.toBe(firstReplacement);
		kernel.dispose();
	});

	test('a save queued under an id another tab already replaced follows it after a reload', async () => {
		// Tab A moves the visitor off `sub_s1`. Tab B, still on it, queues a
		// save while offline, then reloads onto the new subject. The replay is
		// refused for `sub_s1`; dropping it would lose a choice the recorded
		// reassignment says belongs to the current subject.
		const conflictUnlessMoved = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_s1'
				? Promise.reject(refused('SUBJECT_CONFLICT'))
				: accepted({ subjectId })
		);
		const tabA = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_s1' } },
			transport: { save: conflictUnlessMoved },
		});
		await tabA.commands.save({ marketing: true });
		const movedTo = tabA.getSnapshot().subject?.subjectId as string;
		tabA.dispose();

		const tabB = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_s1' } },
			transport: { save: vi.fn().mockRejectedValue(new Error('offline')) },
		});
		await tabB.commands.save({ measurement: false });
		tabB.dispose();
		expect(await queued()).toMatchObject([
			{ payload: { subjectId: 'sub_s1' } },
		]);

		const reloaded = kernelOn({
			initialRecords: { subject: { subjectId: movedTo } },
			transport: {
				init: vi.fn().mockResolvedValue({}),
				save: conflictUnlessMoved,
			},
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		reloaded.events.on('save:replayed', ({ ok, subjectId }) => {
			replayed.push({ ok, subjectId });
		});
		await reloaded.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});

		expect(replayed).toEqual([{ ok: true, subjectId: movedTo }]);
		expect(reloaded.getSnapshot().subject?.subjectId).toBe(movedTo);
		expect(await queued()).toEqual([]);
		reloaded.dispose();
	});

	test('a visitor switched while the claim waits for the store keeps their queued saves', async () => {
		// The claim runs in a store transaction, and waiting for it can take
		// long enough for the subject to change. Moving the queue then would
		// hand the previous subject's saves to a replacement nobody holds.
		let openGate: () => void = () => {};
		let gate: Promise<void> = Promise.resolve();
		const gated: SaveOutboxStore = {
			clear: store.clear,
			async transact(run) {
				await gate;
				return store.transact(run);
			},
		};
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockRejectedValue(refused('SUBJECT_CONFLICT'));
		const kernel = kernelOn(
			{
				initialRecords: { subject: { subjectId: 'sub_from' } },
				transport: { save: saveSpy },
			},
			gated
		);

		await kernel.commands.save({ marketing: true });
		gate = new Promise((resolve) => {
			openGate = resolve;
		});
		const refusedSave = kernel.commands.save({ measurement: false });
		await vi.waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(2));
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		kernel.set.subjectId('sub_other');
		openGate();
		await refusedSave;

		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_other');
		expect(await store.transact((tx) => tx.read('reassignments'))).toBe(
			undefined
		);
		expect((await queued()).map((entry) => entry.payload.subjectId)).toEqual([
			'sub_from',
		]);
		kernel.dispose();
	});

	test('a reassignment outlives its age limit while a save for the old id still waits', async () => {
		// Recorded on day 0; a stale tab queues a save under the old id on day
		// 6, and that save may wait until day 13. Expiring the record on day 7
		// would leave the replay nothing to follow, and the save would drop.
		const DAY = 24 * 60 * 60 * 1000;
		const start = 1_800_000_000_000;
		vi.useFakeTimers({ now: start, toFake: ['Date'] });
		const conflictUnlessMoved = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_old'
				? Promise.reject(refused('SUBJECT_CONFLICT'))
				: accepted({ subjectId })
		);
		const first = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_old' } },
			transport: { save: conflictUnlessMoved },
		});
		await first.commands.save({ marketing: true });
		const movedTo = first.getSnapshot().subject?.subjectId as string;
		first.dispose();

		vi.setSystemTime(start + 6 * DAY);
		const staleTab = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_old' } },
			transport: { save: vi.fn().mockRejectedValue(new Error('offline')) },
		});
		await staleTab.commands.save({ measurement: false });
		staleTab.dispose();

		vi.setSystemTime(start + 8 * DAY);
		const reloaded = kernelOn({
			initialRecords: { subject: { subjectId: movedTo } },
			transport: {
				init: vi.fn().mockResolvedValue({}),
				save: conflictUnlessMoved,
			},
		});
		const replayed: { ok: boolean; subjectId: string }[] = [];
		reloaded.events.on('save:replayed', ({ ok, subjectId }) => {
			replayed.push({ ok, subjectId });
		});
		await reloaded.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toHaveLength(1);
		});

		expect(replayed).toEqual([{ ok: true, subjectId: movedTo }]);
		reloaded.dispose();
	});

	test("the same visitor's choice changing while a replay's claim waits does not drop the save", async () => {
		// A server merge or another tab's save advances the records generation
		// without moving the subject. A queued save does not belong to a
		// generation, so only a subject change should stop its claim.
		let conflictSeen = false;
		let openGate: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			openGate = resolve;
		});
		let claimWaiting = false;
		// Holds the first transaction after the refusal: the claim.
		const gated: SaveOutboxStore = {
			clear: store.clear,
			async transact(run) {
				if (conflictSeen && !claimWaiting) {
					claimWaiting = true;
					await gate;
				}
				return store.transact(run);
			},
		};
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockImplementation(({ subjectId }: { subjectId: string }) => {
				if (subjectId !== 'sub_from') {
					return accepted({ subjectId });
				}
				conflictSeen = true;
				return Promise.reject(refused('SUBJECT_CONFLICT'));
			});
		const kernel = kernelOn(
			{
				initialRecords: { subject: { subjectId: 'sub_from' } },
				transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
			},
			gated
		);
		const replayed: { ok: boolean; subjectId: string }[] = [];
		kernel.events.on('save:replayed', ({ ok, subjectId }) => {
			replayed.push({ ok, subjectId });
		});

		await kernel.commands.save({ measurement: false });
		await kernel.commands.init();
		await vi.waitFor(() => expect(claimWaiting).toBe(true));

		kernel.hydrate(
			choiceRecords(
				{ marketing: true, measurement: false },
				{ now: Date.now(), subjectId: 'sub_from' }
			)
		);
		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_from');
		openGate();

		await vi.waitFor(() => expect(replayed).toHaveLength(1));
		const newId = kernel.getSnapshot().subject?.subjectId;
		expect(newId).not.toBe('sub_from');
		expect(replayed).toEqual([{ ok: true, subjectId: newId }]);
		kernel.dispose();
	});

	test('two tabs refused for the same subject move to one new id', async () => {
		// Each tab picking its own id would leave one of them persisting a
		// subject the backend holds no consent for.
		const saveSpy = vi.fn(({ subjectId }: { subjectId: string }) =>
			subjectId === 'sub_shared_tab'
				? Promise.reject(refused('SUBJECT_CONFLICT'))
				: accepted({ subjectId })
		);
		const tabA = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_shared_tab' } },
			transport: { save: saveSpy },
		});
		const tabB = kernelOn({
			initialRecords: { subject: { subjectId: 'sub_shared_tab' } },
			transport: { save: saveSpy },
		});

		await Promise.all([
			tabA.commands.save({ marketing: true }),
			tabB.commands.save({ measurement: false }),
		]);

		const idA = tabA.getSnapshot().subject?.subjectId;
		expect(idA).not.toBe('sub_shared_tab');
		expect(tabB.getSnapshot().subject?.subjectId).toBe(idA);
		const sentUnderNewId = saveSpy.mock.calls
			.map(([payload]) => payload.subjectId)
			.filter((id) => id !== 'sub_shared_tab');
		expect(new Set(sentUnderNewId)).toEqual(new Set([idA]));
		tabA.dispose();
		tabB.dispose();
	});
});

describe('save outbox: queue module loading', () => {
	test('a failed save is kept when the queue module cannot load', async () => {
		// The queue code loads on demand. When the network that failed the
		// save also fails that load, the save is appended as is and the next
		// replay normalizes and sends it.
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const offline = createKernel(
			{ transport: { save } },
			{
				loadOutboxQueue: () =>
					Promise.reject(new Error('chunk failed to load')),
				outboxStore: store,
			}
		);
		await offline.commands.save('all');
		expect(await queued()).toMatchObject([
			{ attempts: 0, payload: save.mock.calls[0]?.[0] },
		]);
		offline.dispose();

		const online = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save },
		});
		await online.commands.init();
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});
		expect(save).toHaveBeenCalledTimes(2);
		expect(save.mock.calls[1]?.[0]).toEqual(save.mock.calls[0]?.[0]);
		online.dispose();
	});

	test('a successful save with nothing queued never loads the queue module', async () => {
		const loadOutboxQueue = vi.fn(() => import('../save-outbox/queue'));
		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createKernel(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			{ loadOutboxQueue, outboxStore: store }
		);
		await kernel.commands.init();
		await expect(kernel.commands.save('all')).resolves.toMatchObject({
			ok: true,
		});
		expect(loadOutboxQueue).not.toHaveBeenCalled();
		kernel.dispose();
	});
});

describe('save outbox: clearing records', () => {
	test('clearing records without persistence drops the queued saves', async () => {
		// Persistence used to be the only path that emptied the queue, so a
		// runtime without it replayed the cleared subject's choice into the
		// new history.
		const saveSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error('save offline'))
			.mockResolvedValue({ ok: true });
		const kernel = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save: saveSpy },
		});

		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);

		clearRecords(kernel);
		await kernel.commands.init();
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(await queued()).toEqual([]);
		expect(saveSpy).toHaveBeenCalledTimes(1);
		kernel.dispose();
	});

	test('a failed save waiting for the store when records are cleared is not queued', async () => {
		// Another tab holds the store while this save fails; the visitor
		// clears their records meanwhile. Queueing the save afterwards would
		// bring the cleared choice back on the next replay.
		let waiting = false;
		let release: () => void = () => {};
		// Holds the first transaction, the failed save's enqueue; later ones
		// (the clear) go straight through.
		const gated: SaveOutboxStore = {
			clear: store.clear,
			async transact(run) {
				if (!waiting) {
					waiting = true;
					await new Promise<void>((resolve) => {
						release = resolve;
					});
				}
				return store.transact(run);
			},
		};
		const saveSpy = vi.fn().mockResolvedValue({ ok: false });
		const kernel = kernelOn({ transport: { save: saveSpy } }, gated);

		const pending = kernel.commands.save('all');
		await vi.waitFor(() => expect(waiting).toBe(true));
		clearRecords(kernel);
		release();
		await pending;

		expect(await queued()).toEqual([]);
		kernel.dispose();
	});
});

describe('save outbox: independent partial saves', () => {
	test('disjoint confirmations made in one turn both reach transport', async () => {
		const send = vi.fn().mockResolvedValue({ ok: true });
		const kernel = kernelOn({ transport: { save: send } });
		const first = kernel.commands.save({ marketing: true });
		const second = kernel.commands.save({ measurement: false });
		await Promise.all([first, second]);
		expect(
			send.mock.calls.map(([payload]) => payload.confirmed.categories)
		).toEqual([{ marketing: true }, { measurement: false }]);
		kernel.dispose();
	});

	test.each(['same-subject', 'canonical-subject'])(
		'failed disjoint confirmation replays its original payload after %s acknowledgement',
		async (mapping) => {
			let finish: (result: SaveResult) => void = () => {};
			const send = vi
				.fn()
				.mockImplementationOnce(
					() =>
						new Promise<SaveResult>((resolve) => {
							finish = resolve;
						})
				)
				.mockResolvedValue(
					mapping === 'canonical-subject'
						? { ok: true, subjectId: 'canonical' }
						: { ok: true }
				);
			const kernel = kernelOn({ transport: { save: send } });
			const first = kernel.commands.save({ marketing: true });
			await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
			await kernel.commands.save({ measurement: false });
			finish({ ok: false });
			await first;
			await kernel.commands.init();
			await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3));
			expect(send.mock.calls[2]?.[0]).toEqual(send.mock.calls[0]?.[0]);
			expect(
				kernel.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(true);
			expect(
				kernel.getSnapshot().explicitChoice?.categories.measurement?.value
			).toBe(false);
			kernel.dispose();
		}
	);

	test('an older disjoint response cannot replace the latest canonical subject', async () => {
		let finish: (result: SaveResult) => void = () => {};
		const send = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<SaveResult>((resolve) => {
						finish = resolve;
					})
			)
			.mockResolvedValue({ ok: true, subjectId: 'latest' });
		const kernel = kernelOn({ transport: { save: send } });
		const first = kernel.commands.save({ marketing: true });
		await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
		await kernel.commands.save({ measurement: false });
		finish({ ok: true, subjectId: 'older' });
		await first;
		expect(kernel.getSnapshot().subject?.subjectId).toBe('latest');
		kernel.dispose();
	});

	test('an explicit subject switch cancels a pending retry even after switching back', async () => {
		let finish: (result: SaveResult) => void = () => {};
		const send = vi.fn().mockImplementationOnce(
			() =>
				new Promise<SaveResult>((resolve) => {
					finish = resolve;
				})
		);
		const kernel = kernelOn({
			initialRecords: { subject: { subjectId: 'original' } },
			transport: { save: send },
		});
		const pending = kernel.commands.save({ marketing: true });
		await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
		kernel.set.subjectId('other');
		kernel.set.subjectId('original');
		finish({ ok: false });
		await pending;
		expect(await queued()).toEqual([]);
		kernel.dispose();
	});
});

describe('save outbox: partially superseded confirmations', () => {
	test.each([
		'deferred',
		'in-flight',
		'queued-success',
		'queued-failure',
	] as const)(
		'preserves measurement without replaying superseded marketing: %s',
		async (phase) => {
			let finish: (result: SaveResult) => void = () => {};
			const send = vi.fn().mockResolvedValue({ ok: true });
			if (phase === 'in-flight') {
				send.mockImplementationOnce(
					() =>
						new Promise<SaveResult>((resolve) => {
							finish = resolve;
						})
				);
			}
			if (phase.startsWith('queued')) {
				send.mockResolvedValueOnce({ ok: false });
			}
			if (phase === 'queued-failure') {
				send.mockResolvedValueOnce({ ok: false });
			}
			const kernel = kernelOn({ transport: { save: send } });
			const first = kernel.commands.save({
				marketing: true,
				measurement: true,
			});
			const original =
				kernel.getSnapshot().explicitChoice?.categories.measurement;
			/* oxlint-disable vitest/no-conditional-expect -- The in-flight fixture waits for its first request before changing consent. */
			if (phase === 'in-flight') {
				await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
			}
			/* oxlint-enable vitest/no-conditional-expect */
			if (phase.startsWith('queued')) {
				await first;
			}
			await kernel.commands.save({ marketing: false });
			if (phase === 'in-flight') {
				finish({ ok: false });
			}
			await first;
			/* oxlint-disable vitest/no-conditional-expect -- Only non-deferred fixtures initialize and send queued requests. */
			if (phase !== 'deferred') {
				await kernel.commands.init();
				await vi.waitFor(() =>
					expect(send.mock.calls.length).toBeGreaterThanOrEqual(3)
				);
			}
			/* oxlint-enable vitest/no-conditional-expect */
			const surviving =
				phase === 'deferred'
					? send.mock.calls[0]?.[0]
					: send.mock.calls[2]?.[0];
			expect(surviving.confirmed.categories).toEqual({ measurement: true });
			expect(surviving.choice.categories).toEqual({ measurement: original });
			expect(surviving.givenAt).toBe(original?.confirmedAt);
			expect(surviving.confirmed.actionAt).toBe(original?.confirmedAt);
			expect(surviving.consents.marketing).toBe(false);
			expect(
				kernel.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(false);
			expect(kernel.getSnapshot().explicitChoice?.categories.measurement).toBe(
				original
			);
			kernel.dispose();
		}
	);
});

describe('save outbox: development warnings', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	const silencedWarn = () =>
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);

	test('a save the transport threw on warns that it was queued', async () => {
		const warn = silencedWarn();
		const offline = new Error('save offline');
		const kernel = kernelOn({
			transport: { save: vi.fn().mockRejectedValue(offline) },
		});

		await kernel.commands.save('all');

		expect(await queued()).toHaveLength(1);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('queued'),
			offline
		);
		kernel.dispose();
	});

	test('a save the transport answered as failed warns that it was queued', async () => {
		const warn = silencedWarn();
		const kernel = kernelOn({
			transport: { save: vi.fn().mockResolvedValue({ ok: false }) },
		});

		await kernel.commands.save('all');

		expect(await queued()).toHaveLength(1);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('queued'));
		kernel.dispose();
	});

	test('a save the backend refuses for good warns that it will not be resent', async () => {
		const warn = silencedWarn();
		const refusal = refused('POLICY_SNAPSHOT_INVALID');
		const kernel = kernelOn({
			transport: { save: vi.fn().mockRejectedValue(refusal) },
		});

		await kernel.commands.save('all');

		expect(await queued()).toEqual([]);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('will not be resent'),
			refusal
		);
		kernel.dispose();
	});

	test('a successful save does not warn', async () => {
		const warn = silencedWarn();
		const kernel = kernelOn({ transport: { save: accepted } });

		await kernel.commands.save('all');

		expect(warn).not.toHaveBeenCalled();
		kernel.dispose();
	});

	test.each([
		['threw', () => Promise.reject(new Error('save offline'))],
		['answered as failed', () => Promise.resolve({ ok: false })],
	])(
		'a save the transport %s does not warn when records are cleared before it is queued',
		async (_label, save) => {
			const warn = silencedWarn();
			// Another tab holds the store while the save fails, and the visitor
			// clears their records meanwhile, so the enqueue writes nothing.
			let waiting = false;
			let release: () => void = () => {};
			const gated: SaveOutboxStore = {
				clear: store.clear,
				async transact(run) {
					if (!waiting) {
						waiting = true;
						await new Promise<void>((resolve) => {
							release = resolve;
						});
					}
					return store.transact(run);
				},
			};
			const kernel = kernelOn({ transport: { save } }, gated);

			const pending = kernel.commands.save('all');
			await vi.waitFor(() => expect(waiting).toBe(true));
			clearRecords(kernel);
			release();
			await pending;

			expect(await queued()).toEqual([]);
			expect(warn).not.toHaveBeenCalled();
			kernel.dispose();
		}
	);

	test.each([
		['threw', () => Promise.reject(new Error('save offline'))],
		['answered as failed', () => Promise.resolve({ ok: false })],
	])(
		'a save the transport %s warns that it was not queued when storage is full',
		async (_label, save) => {
			const warn = silencedWarn();
			const full = createBrowserOutboxStore({
				localStorage: () =>
					({
						getItem: () => null,
						removeItem: () => undefined,
						setItem: () => {
							throw new DOMException('full', 'QuotaExceededError');
						},
					}) as unknown as Storage,
				locks: () => null,
			});
			const kernel = kernelOn({ transport: { save } }, full);

			await kernel.commands.save('all');

			expect(warn).toHaveBeenCalledOnce();
			expect(warn.mock.calls[0]?.[0]).toContain('storage refused to queue it');
			kernel.dispose();
		}
	);

	test('a failed save does not warn in production', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = silencedWarn();
		const kernel = kernelOn({
			transport: {
				save: vi.fn().mockRejectedValue(new Error('save offline')),
			},
		});

		await kernel.commands.save('all');

		expect(await queued()).toHaveLength(1);
		expect(warn).not.toHaveBeenCalled();
		kernel.dispose();
	});
});

describe('save outbox: replay failures and dropped saves', () => {
	const offline = new Error('save offline');

	/** A kernel whose first save failed, and what it reports from then on. */
	const withQueuedSave = async function withQueuedSave(
		save: KernelTransport['save'] = vi.fn().mockRejectedValue(offline),
		outboxStore: SaveOutboxStore = store
	) {
		const kernel = kernelOn(
			{ transport: { init: vi.fn().mockResolvedValue({}), save } },
			outboxStore
		);
		await kernel.commands.save('all');
		expect(await queued()).toHaveLength(1);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const errors: unknown[] = [];
		const replayed: boolean[] = [];
		kernel.events.on('command:error', ({ error }) => {
			errors.push(error);
		});
		kernel.events.on('save:replayed', ({ ok }) => {
			replayed.push(ok);
		});
		return { errors, kernel, replayed, warn };
	};

	test('a replay that fails again warns once and keeps the save out of onError', async () => {
		const { errors, kernel, replayed, warn } = await withQueuedSave();

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toEqual([false]);
		});

		expect(await queued()).toHaveLength(1);
		expect(errors).toEqual([]);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Resending a queued consent save failed'),
			offline
		);
		kernel.dispose();
	});

	test('a save that runs out of attempts is reported once', async () => {
		const { errors, kernel, replayed, warn } = await withQueuedSave();
		await editQueue((entries) =>
			entries.map((entry) => ({ ...entry, attempts: 9 }))
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toEqual([false]);
		});

		expect(await queued()).toEqual([]);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toBeInstanceOf(Error);
		expect((errors[0] as Error).message).toContain('10 failed attempts');
		expect((errors[0] as Error).cause).toBe(offline);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('dropped and will not be resent'),
			errors[0]
		);
		kernel.dispose();
	});

	test('a replay the backend refuses for good is reported', async () => {
		const refusal = refused('POLICY_SNAPSHOT_EXPIRED');
		const { errors, kernel, replayed } = await withQueuedSave(
			vi.fn().mockRejectedValueOnce(offline).mockRejectedValue(refusal)
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(replayed).toEqual([false]);
		});

		expect(await queued()).toEqual([]);
		expect(errors).toEqual([refusal]);
		kernel.dispose();
	});

	test('saves older than seven days are reported once when dropped', async () => {
		const { errors, kernel, warn } = await withQueuedSave();
		await editQueue((entries) =>
			entries.map((entry) => ({
				...entry,
				queuedAt: Date.now() - 7 * 24 * 60 * 60 * 1000 - 1,
			}))
		);

		await kernel.commands.init();
		await vi.waitFor(() => {
			expect(errors).toHaveLength(1);
		});
		expect((errors[0] as Error).message).toContain('more than 7 days');
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('dropped and will not be resent'),
			errors[0]
		);

		// Later reads find nothing left to drop.
		await kernel.commands.init();
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(await queued()).toEqual([]);
		expect(errors).toHaveLength(1);
		kernel.dispose();
	});

	test.each([
		['runs out of attempts', { attempts: 9 }],
		['waited more than seven days', { queuedAt: 0 }],
	])(
		'a save that %s is reported only once storage takes the removal',
		async (_label, edit) => {
			// Storage that refuses writes keeps the entry, so it is not dropped
			// yet, and reporting it would report it again on the next replay.
			let refuse = false;
			let refusedWrites = 0;
			const refusing: SaveOutboxStore = {
				clear: store.clear,
				transact: (run) =>
					store.transact((tx) =>
						run({
							read: tx.read,
							write: (slot, value) => {
								if (refuse) {
									refusedWrites += 1;
									return false;
								}
								return tx.write(slot, value);
							},
						})
					),
			};
			const { errors, kernel } = await withQueuedSave(
				vi.fn().mockRejectedValue(offline),
				refusing
			);
			await editQueue((entries) =>
				entries.map((entry) => ({ ...entry, ...edit }))
			);

			refuse = true;
			await kernel.commands.init();
			await vi.waitFor(() => {
				expect(refusedWrites).toBeGreaterThan(0);
			});
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(errors).toEqual([]);
			expect(await queued()).toHaveLength(1);

			refuse = false;
			await kernel.commands.init();
			await vi.waitFor(async () => {
				expect(await queued()).toEqual([]);
			});
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(errors).toHaveLength(1);
			kernel.dispose();
		}
	);

	test('two tabs replaying the same last attempt report it once', async () => {
		const save = vi.fn().mockRejectedValue(offline);
		const first = await withQueuedSave(save);
		const second = kernelOn({
			transport: { init: vi.fn().mockResolvedValue({}), save },
		});
		const secondErrors: unknown[] = [];
		second.events.on('command:error', ({ error }) => {
			secondErrors.push(error);
		});
		await editQueue((entries) =>
			entries.map((entry) => ({ ...entry, attempts: 9 }))
		);

		await Promise.all([first.kernel.commands.init(), second.commands.init()]);
		await vi.waitFor(async () => {
			expect(await queued()).toEqual([]);
		});
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect([...first.errors, ...secondErrors]).toHaveLength(1);
		first.kernel.dispose();
		second.dispose();
	});
});
