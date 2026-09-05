import { resolve } from 'node:path';

import type { ConsentSnapshot } from '@c15t/core';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createServer } from 'vite';

/** Compile the same component for the actual Svelte server runtime. */
export const renderSsr = async function renderSsr(
	props: Record<string, unknown>,
	fixture: string
): Promise<{
	html: string;
	prompt: ConsentSnapshot['promptRequirement'];
	now: number;
}> {
	const server = await createServer({
		configFile: false,
		plugins: [svelte()],
		root: process.cwd(),
		server: { hmr: false, middlewareMode: true },
		ssr: {
			noExternal: ['@c15t/svelte'],
			resolve: { conditions: ['node', 'svelte'] },
		},
	});
	try {
		const module = await server.ssrLoadModule(
			resolve('src/__tests__/server-entry.ts')
		);
		const globals = ['window', 'document', 'navigator'] as const;
		const descriptors = globals.map(
			(key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
		);
		try {
			for (const key of globals) {
				Object.defineProperty(globalThis, key, {
					configurable: true,
					value: undefined,
				});
			}
			return module.renderFixture(props, fixture);
		} finally {
			for (const [key, descriptor] of descriptors) {
				if (descriptor) {
					Object.defineProperty(globalThis, key, descriptor);
				} else {
					Reflect.deleteProperty(globalThis, key);
				}
			}
		}
	} finally {
		await server.close();
	}
};
