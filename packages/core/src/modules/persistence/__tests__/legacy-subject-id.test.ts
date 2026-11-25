/*
 * @vitest-environment jsdom
 * @vitest-environment-options {"url":"https://a.app.example.com/pricing"}
 *
 * c15t 3.2 stored the subject ID in `<key>-sid` before any choice, under
 * whichever cookie scope its server adapter or browser runtime used. Startup
 * and `clear()` remove every copy, whatever the current configuration. A
 * visitor whose stored records carry no ID keeps the one 3.2 gave them.
 */
import { afterEach, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	matchedResolution,
	noticeRule,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import type { StorageConfig } from '../../../libs/cookie';
import type { KernelTransport } from '../../../types';
import { createPersistence } from '../index';
import { mountPersistence, queuedWrites } from '../mount';
import { readStoredConsentRecord } from '../record-storage';
import { createWriterLoader } from '../writer-loader';
import {
	clearStoredConsentRecords,
	writeStoredConsentEnvelope,
} from './record-writes';

// Host-only, `defaultDomain` and root-domain scopes are three cookies here.
const SCOPES = ['', '; domain=app.example.com', '; domain=.example.com'];

/** The `<key>-sid` cookies this page sends, at any scope. */
const sidCookies = (key = 'c15t-sid'): string[] =>
	document.cookie.split('; ').filter((pair) => pair.startsWith(`${key}=`));

const plant = function plant(key = 'c15t-sid'): void {
	for (const [index, scope] of SCOPES.entries()) {
		document.cookie = `${key}=sub_copy${index}; path=/${scope}`;
	}
	localStorage.setItem(key, 'sub_local');
	expect(sidCookies(key)).toHaveLength(SCOPES.length);
};

afterEach(() => {
	for (const key of ['c15t-sid', 'custom-sid', 'c15t-epoch']) {
		for (const scope of SCOPES) {
			document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`;
		}
	}
	clearStoredConsentRecords();
	localStorage.clear();
	queuedWrites.clear();
	vi.useRealTimers();
});

const boot = (storageConfig?: StorageConfig, transport?: KernelTransport) => {
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(optInRule()),
		transport,
	});
	return { handle: createPersistence({ kernel, storageConfig }), kernel };
};

const plantRecordWithoutId = function plantRecordWithoutId(): number {
	const now = Date.now();
	writeStoredConsentEnvelope(
		{
			categories: explicitChoice(
				{ measurement: true },
				{ confirmedAt: now - 5000, now }
			).categories,
			version: 3,
		},
		{ now }
	);
	return now;
};

test.each<[string, StorageConfig | undefined, string]>([
	['the default configuration', undefined, 'c15t-sid'],
	['crossSubdomain', { crossSubdomain: true }, 'c15t-sid'],
	['a defaultDomain', { defaultDomain: 'app.example.com' }, 'c15t-sid'],
	['a storage key of its own', { storageKey: 'custom' }, 'custom-sid'],
])('startup with %s removes every scope a 3.2 copy used', (_, config, key) => {
	plant(key);
	const { handle, kernel } = boot(config);

	expect(sidCookies(key)).toEqual([]);
	expect(localStorage.getItem(key)).toBeNull();
	expect(kernel.getSnapshot().subject?.subjectId).not.toMatch(
		/^sub_(?:copy\d|local)$/u
	);
	handle.dispose();
});

test('clear() removes every scope a copy written after startup used', () => {
	const { handle } = boot({ defaultDomain: 'app.example.com' });
	plant();

	handle.clear();

	expect(sidCookies()).toEqual([]);
	expect(localStorage.getItem('c15t-sid')).toBeNull();
	handle.dispose();
});

// Records an older version wrote carry no ID. 3.2 gave such a visitor the
// ID in `c15t-sid`; dropping it would give them a new ID on every load
// until their next save.
test('records stored without an ID take the 3.2 ID before its copy goes, and keep it', async () => {
	const now = plantRecordWithoutId();
	document.cookie = 'c15t-sid=sub_legacy; path=/';
	localStorage.setItem('c15t-sid', 'sub_legacy');
	const identify = vi.fn<NonNullable<KernelTransport['identify']>>();
	identify.mockResolvedValue();

	const first = boot(undefined, { identify });
	expect(first.kernel.getSnapshot().subject?.subjectId).toBe('sub_legacy');
	await vi.dynamicImportSettled();
	await vi.waitFor(() => {
		expect(readStoredConsentRecord(undefined, now).selected?.subject).toEqual({
			subjectId: 'sub_legacy',
		});
	});
	await first.kernel.commands.identify({ externalId: 'user-1' });
	expect(identify).toHaveBeenLastCalledWith(
		{ externalId: 'user-1' },
		'sub_legacy'
	);
	first.handle.dispose();

	const second = boot();
	expect(second.kernel.getSnapshot().subject?.subjectId).toBe('sub_legacy');
	second.handle.dispose();
});

// Without a 3.2 copy, such a visitor gets an ID in memory, as before 3.2.
// It is gone on the next load, so `identify()` does not link it.
test('records stored without an ID and no 3.2 copy get a provisional ID that identify does not link', async () => {
	plantRecordWithoutId();
	const identify = vi.fn<NonNullable<KernelTransport['identify']>>();
	identify.mockResolvedValue();

	const { handle, kernel } = boot(undefined, { identify });
	expect(kernel.getSnapshot().subject?.subjectId).toMatch(/^sub_/u);
	await kernel.commands.identify({ externalId: 'user-1' });

	expect(identify).toHaveBeenCalledWith({ externalId: 'user-1' }, null);
	handle.dispose();
});

test('a first visit links nothing before the first save', async () => {
	const identify = vi.fn<NonNullable<KernelTransport['identify']>>();
	identify.mockResolvedValue();

	const { handle, kernel } = boot(undefined, { identify });
	await kernel.commands.identify({ externalId: 'user-1' });

	expect(identify).toHaveBeenCalledWith({ externalId: 'user-1' }, null);
	handle.dispose();
});

// The script-loader preload mounts a throwaway handle that only reads. It
// must leave the 3.2 copy for the handle that adopts it.
test('a handle that keeps its subject leaves the 3.2 copy for the one that adopts it', () => {
	plantRecordWithoutId();
	document.cookie = 'c15t-sid=sub_legacy; path=/';
	const throwaway = createConsentKernel({
		initialPolicyResolution: matchedResolution(optInRule()),
	});
	createPersistence({ keepSubject: true, kernel: throwaway }).dispose();
	expect(sidCookies()).toEqual(['c15t-sid=sub_legacy']);

	const { handle, kernel } = boot();
	expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_legacy');
	handle.dispose();
});

// The copy is the adopted ID's only durable home until the rewritten
// records land. A page that unloads before the write code loads keeps it.
test('the 3.2 copy stays until the records carry its ID, through a reload before the write code lands', async () => {
	const now = plantRecordWithoutId();
	document.cookie = 'c15t-sid=sub_legacy; path=/';
	let open: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		open = resolve;
	});
	const held = createWriterLoader(async () => {
		await gate;
		return import('../writer/writer');
	});
	const mount = () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(optInRule()),
		});
		return { handle: mountPersistence({ kernel }, held), kernel };
	};

	const first = mount();
	expect(first.kernel.getSnapshot().subject?.subjectId).toBe('sub_legacy');
	await Promise.resolve();
	expect(sidCookies()).toEqual(['c15t-sid=sub_legacy']);
	expect(readStoredConsentRecord(undefined, now).selected?.subject).toBeNull();
	first.handle.dispose();
	// A new page: nothing the unloaded one queued survives it.
	queuedWrites.clear();

	const second = mount();
	expect(second.kernel.getSnapshot().subject?.subjectId).toBe('sub_legacy');
	open();
	await held.load();
	await vi.waitFor(() => {
		expect(readStoredConsentRecord(undefined, now).selected?.subject).toEqual({
			subjectId: 'sub_legacy',
		});
		expect(sidCookies()).toEqual([]);
	});
	second.handle.dispose();
});

// A remount while the adopting handle's rewrite is queued takes the queued
// subject. The copy still waits for the records.
test('a remount before the adopted ID is written keeps the 3.2 copy until the records carry it', async () => {
	const now = plantRecordWithoutId();
	document.cookie = 'c15t-sid=sub_legacy; path=/';
	let open: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		open = resolve;
	});
	const held = createWriterLoader(async () => {
		await gate;
		return import('../writer/writer');
	});
	const mount = () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(optInRule()),
		});
		return { handle: mountPersistence({ kernel }, held), kernel };
	};

	const first = mount();
	expect(first.kernel.getSnapshot().subject?.subjectId).toBe('sub_legacy');
	first.handle.dispose();
	const second = mount();
	await Promise.resolve();
	expect(sidCookies()).toEqual(['c15t-sid=sub_legacy']);

	open();
	await held.load();
	await vi.waitFor(() => {
		expect(readStoredConsentRecord(undefined, now).selected?.subject).toEqual({
			subjectId: 'sub_legacy',
		});
		expect(sidCookies()).toEqual([]);
	});
	second.handle.dispose();
});

// `dismissNotice()` sends nothing, so its ID stays provisional until the
// stored acknowledgement carries it.
test('a notice dismissal links its ID only once the acknowledgement is stored', async () => {
	let open: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		open = resolve;
	});
	const held = createWriterLoader(async () => {
		await gate;
		return import('../writer/writer');
	});
	const identify = vi.fn<NonNullable<KernelTransport['identify']>>();
	identify.mockResolvedValue();
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(noticeRule()),
		transport: { identify },
	});
	const handle = mountPersistence({ kernel }, held);
	const id = kernel.getSnapshot().subject?.subjectId;

	await kernel.commands.dismissNotice();
	await kernel.commands.identify({ externalId: 'user-1' });
	expect(identify).toHaveBeenLastCalledWith({ externalId: 'user-1' }, null);

	open();
	await held.load();
	await vi.waitFor(async () => {
		await kernel.commands.identify({ externalId: 'user-1' });
		expect(identify).toHaveBeenLastCalledWith({ externalId: 'user-1' }, id);
	});
	handle.dispose();
});

// The queued acknowledgement and its ID move to a new kernel on a remount.
// The ID is still not stored, so it stays provisional there too.
test('a notice ID handed to a new kernel before it is stored stays provisional', async () => {
	let open: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		open = resolve;
	});
	const held = createWriterLoader(async () => {
		await gate;
		return import('../writer/writer');
	});
	const identify = vi.fn<NonNullable<KernelTransport['identify']>>();
	identify.mockResolvedValue();
	const create = () =>
		createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			transport: { identify },
		});
	// The dismissal waits for the write code.
	const before = create();
	const first = mountPersistence({ kernel: before }, held);
	await before.commands.dismissNotice();
	const queuedId = before.getSnapshot().subject?.subjectId;
	first.dispose();

	const kernel = create();
	const handle = mountPersistence({ kernel }, held);
	expect(kernel.getSnapshot().subject?.subjectId).toBe(queuedId);
	await kernel.commands.identify({ externalId: 'user-1' });
	expect(identify).toHaveBeenLastCalledWith({ externalId: 'user-1' }, null);

	open();
	await held.load();
	await vi.waitFor(async () => {
		await kernel.commands.identify({ externalId: 'user-1' });
		expect(identify).toHaveBeenLastCalledWith(
			{ externalId: 'user-1' },
			queuedId
		);
	});
	handle.dispose();
});
