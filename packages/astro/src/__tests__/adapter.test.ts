import { describe, expect, it, vi } from 'vitest';

import {
	loadDialogAdapter,
	registerDialogAdapter,
	registerDialogSurface,
	requireDialogSurface,
} from '../ui/adapter';
import type { ConsentDialogAdapter } from '../ui/adapter';

describe('dialog adapter registry', () => {
	it('ships svelte as the built-in adapter', async () => {
		const adapter = await loadDialogAdapter('svelte');
		expect(adapter.name).toBe('svelte');
	});

	it('lets another framework replace it', async () => {
		const custom = { mount: vi.fn(), name: 'svelte' } as ConsentDialogAdapter;
		registerDialogAdapter('svelte', () => Promise.resolve(custom));
		expect(await loadDialogAdapter('svelte')).toBe(custom);
	});

	it('runs a registered loader at most once', async () => {
		const custom = { mount: vi.fn(), name: 'svelte' } as ConsentDialogAdapter;
		const load = vi.fn(() => Promise.resolve(custom));
		registerDialogAdapter('svelte', load);

		const [first, second] = await Promise.all([
			loadDialogAdapter('svelte'),
			loadDialogAdapter('svelte'),
		]);
		await loadDialogAdapter('svelte');

		expect(load).toHaveBeenCalledOnce();
		expect(first).toBe(custom);
		expect(second).toBe(custom);
	});

	it('runs the replacement loader after a re-registration', async () => {
		const first = { mount: vi.fn(), name: 'svelte' } as ConsentDialogAdapter;
		const second = { mount: vi.fn(), name: 'svelte' } as ConsentDialogAdapter;
		registerDialogAdapter('svelte', () => Promise.resolve(first));
		expect(await loadDialogAdapter('svelte')).toBe(first);

		registerDialogAdapter('svelte', () => Promise.resolve(second));
		expect(await loadDialogAdapter('svelte')).toBe(second);
	});

	it('retries a loader that failed', async () => {
		const adapter = { mount: vi.fn(), name: 'svelte' } as ConsentDialogAdapter;
		const load = vi
			.fn()
			.mockRejectedValueOnce(new Error('chunk load failed'))
			.mockResolvedValue(adapter);
		registerDialogAdapter('svelte', load as never);

		await expect(loadDialogAdapter('svelte')).rejects.toThrowError(
			/chunk load failed/u
		);
		expect(await loadDialogAdapter('svelte')).toBe(adapter);
	});

	it('names the ui option in the error for an unknown adapter', async () => {
		await expect(loadDialogAdapter('react' as never)).rejects.toThrowError(
			/no dialog adapter registered for ui: "react"/u
		);
	});
});

describe('dialog surface registry', () => {
	it('tells you which component registers the island', () => {
		// A page with only <ConsentDialogTrigger> and no <ConsentDialog />.
		expect(() => requireDialogSurface('vue' as never)).toThrowError(
			/Render <ConsentDialog \/>/u
		);
	});

	it('returns the registered loader', () => {
		const load = vi.fn(() => Promise.resolve({ default: {} }));
		registerDialogSurface('svelte', load);
		expect(requireDialogSurface('svelte')).toBe(load);
	});
});
