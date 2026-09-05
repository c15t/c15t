/**
 * The prebuilt styles read `--c15t-*` custom properties. Kept in its own
 * file: the provider suite leaves overlapping act() work behind that
 * starves a trailing render of its effects.
 */
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentProvider, offline } from '../index';

describe('ConsentProvider theme tokens', () => {
	test('emits the default theme tokens when no theme is configured', async () => {
		const { unmount } = await render(
			<ConsentProvider options={{ mode: offline(), persistence: false }}>
				<div data-testid="themed-child" />
			</ConsentProvider>
		);
		await vi.waitFor(() => {
			expect(document.getElementById('c15t-theme')?.textContent).toContain(
				'--c15t-surface:'
			);
		});
		expect(
			getComputedStyle(document.documentElement).getPropertyValue(
				'--c15t-surface'
			)
		).not.toBe('');
		unmount();
	});

	test('a user theme replaces the defaults', async () => {
		const { unmount } = await render(
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					theme: { colors: { surface: 'rgb(1, 2, 3)' } },
				}}
			>
				<div />
			</ConsentProvider>
		);
		await vi.waitFor(() => {
			expect(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--c15t-surface'
				)
			).toContain('rgb(1, 2, 3)');
		});
		unmount();
	});
});
