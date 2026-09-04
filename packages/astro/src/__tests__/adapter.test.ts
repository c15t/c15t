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
