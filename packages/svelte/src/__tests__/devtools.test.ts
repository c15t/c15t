import { render } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';

import ConsentDevToolsDefault, {
	C15TDevTools,
	ConsentDevTools,
	DevTools,
} from '../lib/devtools';
import DevToolsFixture from './fixtures/devtools-fixture.svelte';

const mountedDevTools = (): NodeListOf<HTMLElement> =>
	document.querySelectorAll('[data-c15t-dev-tools]');

describe('@c15t/svelte/devtools', () => {
	test('exports compatible component names', () => {
		expect(ConsentDevToolsDefault).toBe(ConsentDevTools);
		expect(DevTools).toBe(ConsentDevTools);
		expect(C15TDevTools).toBe(ConsentDevTools);
	});

	test('requires Svelte consent provider context', () => {
		expect(() => render(ConsentDevTools)).toThrow('no v3 consent context');
	});

	test('mounts and disposes an isolated engine for each provider', async () => {
		const result = render(DevToolsFixture, { multiple: true });

		await vi.waitFor(() => {
			expect(mountedDevTools()).toHaveLength(2);
		});
		expect(document.querySelector('.c15t-dev-tools--top-left')).not.toBeNull();
		expect(
			document.querySelector('.c15t-dev-tools--bottom-right')
		).not.toBeNull();

		result.unmount();
		expect(mountedDevTools()).toHaveLength(0);
	});
});
