/**
 * Tests for c15t/v3/modules/persistence.
 *
 * Covers:
 * - Hydration from cookie / localStorage
 * - Writing on consent mutation (debounced batch)
 * - Does not write until hasConsented=true
 * - skipHydration option
 * - clear() removes stored consent
 * - dispose stops further writes
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { deleteConsentFromStorage } from '../../../../libs/cookie';
import { createConsentKernel } from '../../../index';
import { createPersistence } from '../index';

// localStorage + document.cookie are stubbed by packages/core/vitest.setup.ts
// Let's just flush between tests.

beforeEach(() => {
	// Clear localStorage AND use the v2 cookie lib's own delete to scrub
	// anything the tests or prior runs wrote.
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	vi.useRealTimers();
});

async function flushDebounce(): Promise<void> {
	// Persistence uses Promise.resolve().then(...) as its debounce.
	await Promise.resolve();
	await Promise.resolve();
}

describe('persistence: hydration', () => {
	test('does nothing when nothing is stored', () => {
		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		expect(kernel.getSnapshot().hasConsented).toBe(false);
		handle.dispose();
	});

	test('hydrates stored consents into the kernel', async () => {
		// Seed storage first, then create kernel + persistence.
		const pre = createConsentKernel();
		const seed = createPersistence({ kernel: pre });
		// Simulate a user interaction that flips consents + hasConsented.
		pre.set.consent({ marketing: true, measurement: true });
		await pre.commands.save('all');
		await flushDebounce();
		seed.dispose();

		// Fresh kernel, expect hydration.
		const kernel = createConsentKernel();
		createPersistence({ kernel });
		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(kernel.getSnapshot().subjectId).toMatch(/^sub_/);
	});

	test('hydration does not call transport.save', async () => {
		const pre = createConsentKernel();
		const seed = createPersistence({ kernel: pre });
		await pre.commands.save({ marketing: true });
		await flushDebounce();
		seed.dispose();

		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save } });
		createPersistence({ kernel });

		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(save).not.toHaveBeenCalled();
	});

	test('skipHydration skips the read', async () => {
		const pre = createConsentKernel();
		const seed = createPersistence({ kernel: pre });
		pre.set.consent({ marketing: true });
		await pre.commands.save('all');
		await flushDebounce();
		seed.dispose();

		const kernel = createConsentKernel();
		createPersistence({ kernel, skipHydration: true });
		expect(kernel.getSnapshot().consents.marketing).toBe(false);
		expect(kernel.getSnapshot().hasConsented).toBe(false);
	});
});

describe('persistence: write path', () => {
	test('does NOT write until hasConsented flips true', async () => {
		const kernel = createConsentKernel();
		createPersistence({ kernel });
		kernel.set.consent({ marketing: true });
		await flushDebounce();

		// Before save, no cookie should exist.
		const read = createConsentKernel();
		createPersistence({ kernel: read });
		expect(read.getSnapshot().hasConsented).toBe(false);
	});

	test('writes after save(), new kernel hydrates the values', async () => {
		const kernel = createConsentKernel();
		createPersistence({ kernel });
		await kernel.commands.save({ marketing: true, measurement: true });
		await flushDebounce();

		const read = createConsentKernel();
		createPersistence({ kernel: read });
		expect(read.getSnapshot().consents.marketing).toBe(true);
		expect(read.getSnapshot().consents.measurement).toBe(true);
		expect(read.getSnapshot().hasConsented).toBe(true);
	});

	test('debounces rapid mutations into one write', async () => {
		const kernel = createConsentKernel();
		createPersistence({ kernel });
		await kernel.commands.save('all');

		// A burst of consent flips during the debounce window.
		kernel.set.consent({ marketing: true });
		kernel.set.consent({ marketing: false });
		kernel.set.consent({ marketing: true });
		await flushDebounce();

		// Read back — marketing should be true (final state).
		const read = createConsentKernel();
		createPersistence({ kernel: read });
		expect(read.getSnapshot().consents.marketing).toBe(true);
	});
});

describe('persistence: clear', () => {
	test('removes stored consent', async () => {
		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		await kernel.commands.save({ marketing: true });
		await flushDebounce();

		handle.clear();

		const read = createConsentKernel();
		createPersistence({ kernel: read });
		expect(read.getSnapshot().hasConsented).toBe(false);
	});
});

describe('persistence: dispose', () => {
	test('stops writing after dispose', async () => {
		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		await kernel.commands.save('all');
		await flushDebounce();

		handle.dispose();

		// Further mutations should NOT get written.
		kernel.set.consent({ marketing: false });
		await flushDebounce();

		const read = createConsentKernel();
		createPersistence({ kernel: read });
		// Last state written was save('all') → marketing=true.
		expect(read.getSnapshot().consents.marketing).toBe(true);
	});
});
