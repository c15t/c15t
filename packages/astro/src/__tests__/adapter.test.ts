import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	loadDialogAdapter,
	registerDialogAdapter,
	registerDialogSurface,
	requireDialogSurface,
} from '../ui/adapter';
import type { ConsentDialogAdapter } from '../ui/adapter';

describe('dialog adapter registry', () => {
	it('starts empty so no build resolves a framework it did not pick', async () => {
		await expect(loadDialogAdapter('svelte')).rejects.toThrowError(
			/no dialog adapter registered for ui: "svelte"/u
		);
	});

	it.each(['svelte', 'react', 'vue'] as const)(
		'accepts the %s adapter the integration registers',
		async (name) => {
			const adapter = { mount: vi.fn(), name } as ConsentDialogAdapter;
			registerDialogAdapter(name, () => Promise.resolve(adapter));
			expect(await loadDialogAdapter(name)).toBe(adapter);
		}
	);

	it('names the ui option in the error for an unknown adapter', async () => {
		await expect(loadDialogAdapter('solid' as never)).rejects.toThrowError(
			/no dialog adapter registered for ui: "solid"/u
		);
	});
});

describe('dialog surface registry', () => {
	it('points at the integration when nothing registered a surface', () => {
		expect(() => requireDialogSurface('solid' as never)).toThrowError(
			/c15t\(\) is missing from astro.config/u
		);
	});

	it('returns the registered loader', () => {
		const load = vi.fn(() => Promise.resolve({ default: {} }));
		registerDialogSurface('react', load);
		expect(requireDialogSurface('react')).toBe(load);
	});
});

describe('the shipped adapters', () => {
	beforeEach(() => {
		registerDialogSurface('svelte', () => Promise.resolve({ default: {} }));
		registerDialogSurface('react', () => Promise.resolve({ default: {} }));
		registerDialogSurface('vue', () => Promise.resolve({ default: {} }));
	});

	it.each([
		['svelte', () => import('../ui/svelte'), 'svelteDialogAdapter'],
		['react', () => import('../ui/react'), 'reactDialogAdapter'],
		['vue', () => import('../ui/vue'), 'vueDialogAdapter'],
	] as const)('names itself %s', async (name, load, exportName) => {
		const module = (await load()) as Record<string, ConsentDialogAdapter>;
		expect(module[exportName]?.name).toBe(name);
	});
});
