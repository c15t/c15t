/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	matchedResolution,
	noticeRule,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { readStoredRecords } from '../hydrate';
import { createPersistence } from '../index';
import {
	clearStoredConsentRecords,
	readStoredConsentRecord,
	writeStoredConsentEnvelope,
} from '../record-storage';

const disposers: (() => void)[] = [];
const resolution = matchedResolution(
	noticeRule({ privacySignals: { gpc: { denyCategories: ['measurement'] } } })
);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	clearStoredConsentRecords();
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
		expect(kernel.getSnapshot().optOutDirectives).toEqual(
			before.optOutDirectives
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
	clearStoredConsentRecords();

	expect(handle.hydrate()).toBe(false);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().subject).toBeNull();
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

test('hydrates readable choices without clearing unreadable notice and privacy records', async () => {
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
		if (key === 'c15t-notice' || key === 'c15t-privacy') {
			throw new DOMException('Record blocked', 'SecurityError');
		}
		return key === 'c15t' ? storedChoice : null;
	});

	const stored = readStoredRecords(undefined, NOW);
	expect(stored.records).not.toHaveProperty('noticeDismissal');
	expect(stored.records).not.toHaveProperty('optOutDirectives');
	expect(handle.hydrate()).toBe(true);
	expect(kernel.getSnapshot().explicitChoice).toEqual(before.explicitChoice);
	expect(kernel.getSnapshot().noticeDismissal).toEqual(before.noticeDismissal);
	expect(kernel.getSnapshot().optOutDirectives).toEqual(
		before.optOutDirectives
	);
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
		expect(cookie).toContain('c15t-privacy=');
		localStorage.clear();
		restrictStorage(restriction);

		const restored = createKernel();
		const reader = persist(restored);
		expect(restored.getSnapshot().explicitChoice).toEqual(saved.explicitChoice);
		expect(restored.getSnapshot().noticeDismissal).toEqual(
			saved.noticeDismissal
		);
		expect(restored.getSnapshot().optOutDirectives).toEqual(
			saved.optOutDirectives
		);
		expect(restored.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(document.cookie).toBe(cookie);

		reader.clear();
		expect(document.cookie).toBe('');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		expect(restored.getSnapshot().noticeDismissal).toBeNull();
		expect(restored.getSnapshot().optOutDirectives).toEqual([]);
	}
);

test.each(['getter', 'methods', 'missing'] as const)(
	'persists choices, notices and privacy directives when localStorage becomes unavailable through %s',
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
		expect(document.cookie).toContain('c15t-privacy=');
		const restored = createKernel();
		persist(restored);
		expect(restored.getSnapshot().explicitChoice).toEqual(
			kernel.getSnapshot().explicitChoice
		);
		expect(restored.getSnapshot().noticeDismissal).toEqual(
			kernel.getSnapshot().noticeDismissal
		);
		expect(restored.getSnapshot().optOutDirectives).toEqual(
			kernel.getSnapshot().optOutDirectives
		);
	}
);
