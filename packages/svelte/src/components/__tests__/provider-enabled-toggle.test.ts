/**
 * `enabled` is live: turning it off renders the runtime's permissive kernel
 * (every category granted, no UI), turning it on renders the visitor's
 * kernel again. Before the provider used the runtime's toggle it only
 * closed the UI, so consent-gated code stayed blocked.
 */
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import EnabledToggleFixture from '../../__tests__/fixtures/enabled-toggle-fixture.svelte';
import { offline } from '../../lib/index';

// Sequential by design: each `tick()` has to resolve before the next round
// of effects is queued.
const flush = async function flush() {
	await tick();
	await tick();
	await tick();
	await tick();
	await tick();
};

beforeEach(() => {
	window.localStorage.clear();
});

test('turning `enabled` off grants every category and hides the UI; on restores the policy', async () => {
	const mode = offline();
	const { rerender } = render(EnabledToggleFixture, { enabled: true, mode });
	await vi.waitFor(() =>
		expect(screen.getByTestId('active-ui').textContent).toBe('banner')
	);
	expect(screen.getByTestId('marketing').textContent).toBe('false');

	await rerender({ enabled: false, mode });
	await flush();
	expect(screen.getByTestId('marketing').textContent).toBe('true');
	expect(screen.getByTestId('active-ui').textContent).toBe('none');

	await rerender({ enabled: true, mode });
	await flush();
	expect(screen.getByTestId('marketing').textContent).toBe('false');
});
