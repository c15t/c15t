/**
 * The provider hands new options to the runtime's `update()` from an
 * `$effect`. That promise rejects when the update module fails to load; the
 * provider must not leave the rejection unhandled. Its own file, because a
 * module loads once per test file.
 */
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';

import ThemeSwapFixture from '../../__tests__/fixtures/theme-swap-fixture.svelte';
import { custom } from '../../lib/index';

const updateModuleLoads = vi.hoisted(() => ({ count: 0 }));
// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is what the provider does when this chunk fails to load; nothing else can make a dynamic import reject.
vi.mock('../../../../core/src/runtime/provider-update', () => {
	updateModuleLoads.count += 1;
	throw new Error('chunk failed');
});

test('an update module that fails to load is not an unhandled rejection', async () => {
	const rejections: unknown[] = [];
	const onRejection = (reason: unknown) => {
		rejections.push(reason);
	};
	process.on('unhandledRejection', onRejection);
	try {
		const mode = custom({
			init: vi.fn().mockResolvedValue({}),
			save: vi.fn().mockResolvedValue({ ok: true }),
		});
		const { rerender } = render(ThemeSwapFixture, {
			mode,
			theme: { colors: { primary: '#111111' } },
			user: { externalId: 'user_1' },
		});
		await tick();

		await rerender({ mode, user: { externalId: 'user_2' } });
		await vi.waitFor(() => expect(updateModuleLoads.count).toBe(1));
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(rejections).toEqual([]);
	} finally {
		process.off('unhandledRejection', onRejection);
	}
});
