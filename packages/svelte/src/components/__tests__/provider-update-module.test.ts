/**
 * The provider hands its options to the runtime's `update()` from an
 * `$effect`, which also runs once on mount. Core loads the comparison for
 * live options on demand; loading it on mount meant one more request after
 * hydration on every page with a provider. Its own file, because a module
 * loads once per test file.
 */
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';

import ThemeSwapFixture from '../../__tests__/fixtures/theme-swap-fixture.svelte';
import { custom } from '../../lib/index';

const updateModuleLoads = vi.hoisted(() => ({ count: 0 }));
// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is whether the provider loads this module at all. The factory only counts loads and returns the real module.
vi.mock('../../../../core/src/runtime/provider-update', async (original) => {
	updateModuleLoads.count += 1;
	return await original();
});

// Sequential by design: each `tick()` has to resolve before the next round
// of effects is queued.
const flush = async function flush() {
	await tick();
	await tick();
	await tick();
	await tick();
	await tick();
};

test('mounting loads no update module; a new user does', async () => {
	const mode = custom({
		init: vi.fn().mockResolvedValue({}),
		save: vi.fn().mockResolvedValue({ ok: true }),
	});
	const user = { externalId: 'user_1' };
	const { rerender } = render(ThemeSwapFixture, {
		mode,
		theme: { colors: { primary: '#111111' } },
		user,
	});
	await flush();

	expect(updateModuleLoads.count).toBe(0);

	await rerender({ mode, user: { externalId: 'user_2' } });
	await vi.waitFor(() => expect(updateModuleLoads.count).toBe(1));
});
