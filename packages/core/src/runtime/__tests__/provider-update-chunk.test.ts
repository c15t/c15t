/**
 * @vitest-environment jsdom
 *
 * When `update()` downloads the update module. A provider hands its mount
 * options back to `update()` (Svelte's `$effect` runs once on mount), so a
 * chunk loaded before the comparison is one more request after hydration
 * on every page.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { custom } from '../../transports/mode';
import type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
} from '../types';

const loads = { count: 0, failures: 0 };

const runtimes: ConsentProviderRuntime[] = [];

/** A started provider runtime from a fresh module graph. */
const startProvider = async function startProvider(
	options: ConsentProviderRuntimeOptions
) {
	const { createConsentProviderRuntime, defaultRuntimeModules } =
		await import('../index');
	const runtime = createConsentProviderRuntime(options, defaultRuntimeModules);
	runtimes.push(runtime);
	runtime.start();
	return runtime;
};

const transport = () =>
	custom({
		init: vi.fn().mockResolvedValue({}),
		save: vi.fn().mockResolvedValue({ ok: true }),
	});

beforeEach(() => {
	// Each test imports the runtime afresh and counts its own loads.
	vi.resetModules();
	loads.count = 0;
	loads.failures = 0;
	// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is whether `update()` loads this module at all. The factory only counts loads, fails the ones a test asks it to, and returns the real module.
	vi.doMock('../provider-update', async (importOriginal) => {
		loads.count += 1;
		if (loads.failures > 0) {
			loads.failures -= 1;
			throw new Error('chunk failed');
		}
		return await importOriginal();
	});
});

afterEach(async () => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	// A started runtime is still importing its network blocker chunk. Vitest
	// applies queued `doMock`/`doUnmock` calls from inside the next import,
	// and an import that started applying the queue before the next test's
	// `doMock` drops that mock when it finishes: the next test would load
	// the real update module. Let those imports land before queueing more.
	await vi.dynamicImportSettled();
	vi.doUnmock('../provider-update');
	delete (window as { c15t?: unknown }).c15t;
});

describe('update() and the update module', () => {
	test('the options it already has, in a new object, load nothing', async () => {
		const options: ConsentProviderRuntimeOptions = {
			mode: transport(),
			networkBlocker: {
				rules: [{ category: 'marketing', domain: 'a.test' }],
			},
			scripts: [],
			user: { externalId: 'user_1' },
			vendors: [],
		};
		const runtime = await startProvider(options);

		// What Svelte's update effect passes on mount: a copy holding the
		// same values.
		await runtime.update({ ...options });
		await runtime.update({ ...options });

		expect(loads.count).toBe(0);
	});

	test('a new value loads it once', async () => {
		const options = { mode: transport() };
		const runtime = await startProvider(options);

		await runtime.update({ ...options, user: { externalId: 'user_2' } });
		await runtime.update({ ...options, user: { externalId: 'user_3' } });

		expect(loads.count).toBe(1);
	});

	test('a load that failed is tried again by the next update', async () => {
		const options = { mode: transport() };
		const runtime = await startProvider(options);
		loads.failures = 1;

		await expect(
			runtime.update({ ...options, user: { externalId: 'user_2' } })
		).rejects.toThrow();
		// One failed chunk request does not fail every later update.
		await runtime.update({ ...options, user: { externalId: 'user_3' } });

		expect(loads.count).toBe(2);
	});
});
