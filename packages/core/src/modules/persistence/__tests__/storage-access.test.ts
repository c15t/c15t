/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	noticeRule,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { createPersistence } from '../index';
import { clearStoredConsentRecords } from '../record-storage';

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
			vi.spyOn(Storage.prototype, method).mockImplementation(() => {
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
