/**
 * Regression: reactive effects must key on the values they use, not on the
 * whole derived `options` object.
 *
 * A parent that renders `options={{ ...base, theme }}` produces a new
 * object on every theme change. When the identify / overrides effects read
 * that object wholesale, a theme change re-ran `identify()` and fired a
 * second `kernel.commands.init()`.
 */

import type { KernelTransport } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import ThemeSwapFixture from '../../__tests__/fixtures/theme-swap-fixture.svelte';
import { custom } from '../../lib/index';

// Drain Svelte's effect queue plus the microtasks the kernel's async
// commands settle on. Sequential by design: each `tick()` has to resolve
// before the next round of effects is queued.
const flush = async function flush() {
	await tick();
	await tick();
	await tick();
	await tick();
	await tick();
};

describe('ConsentManagerProvider option identity', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('a theme change does not re-run init or identify', async () => {
		const init = vi.fn().mockResolvedValue({});
		const identify = vi.fn().mockResolvedValue({ ok: true });
		const transport: KernelTransport = {
			identify,
			init,
			save: vi.fn().mockResolvedValue({ ok: true }),
		};

		const { rerender } = render(ThemeSwapFixture, {
			mode: custom(transport),
			theme: { colors: { primary: '#111111' } },
			user: { externalId: 'user_1' },
		});

		await flush();
		expect(init).toHaveBeenCalledTimes(1);
		expect(identify).toHaveBeenCalledTimes(1);

		await rerender({
			mode: custom(transport),
			theme: { colors: { primary: '#222222' } },
			user: { externalId: 'user_1' },
		});
		await flush();

		expect(init).toHaveBeenCalledTimes(1);
		expect(identify).toHaveBeenCalledTimes(1);
	});

	test('a real user change still identifies once more', async () => {
		const identify = vi.fn().mockResolvedValue({ ok: true });
		const transport: KernelTransport = {
			identify,
			init: vi.fn().mockResolvedValue({}),
			save: vi.fn().mockResolvedValue({ ok: true }),
		};

		const { rerender } = render(ThemeSwapFixture, {
			mode: custom(transport),
			user: { externalId: 'user_1' },
		});

		await flush();
		expect(identify).toHaveBeenCalledTimes(1);

		await rerender({
			mode: custom(transport),
			user: { externalId: 'user_2' },
		});
		await flush();

		expect(identify).toHaveBeenCalledTimes(2);
		expect(identify.mock.calls[1]?.[0]).toMatchObject({
			externalId: 'user_2',
		});
	});

	test('a changed overrides value re-runs init exactly once', async () => {
		const init = vi.fn().mockResolvedValue({});
		const transport: KernelTransport = {
			init,
			save: vi.fn().mockResolvedValue({ ok: true }),
		};

		const { rerender } = render(ThemeSwapFixture, {
			mode: custom(transport),
			overrides: { country: 'DE' },
		});

		await flush();
		expect(init).toHaveBeenCalledTimes(1);
		expect(init.mock.calls[0]?.[0]).toMatchObject({
			overrides: { country: 'DE' },
		});

		await rerender({
			mode: custom(transport),
			overrides: { country: 'FR' },
		});
		await flush();

		expect(init).toHaveBeenCalledTimes(2);
		expect(init.mock.calls[1]?.[0]).toMatchObject({
			overrides: { country: 'FR' },
		});
	});
});
