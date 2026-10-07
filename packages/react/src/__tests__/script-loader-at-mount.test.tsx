/**
 * A plain `ConsentProvider` loads the script loader from its mount effect,
 * not during its first render, and ships none of the code that decides an
 * earlier load.
 *
 * Starting the download during render is opt-in: the Next.js and TanStack
 * Start `ConsentRoot` pass `__preloadScriptLoader`, whose decision reads
 * the stream fold, stored records and GPC. Every app that renders the
 * provider ships its static module graph, so one value import of that
 * module would put those bytes into every React first load.
 */
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ConsentProvider, custom } from '../index';
import { policyFixture } from './policy-fixture';

const loads = vi.hoisted(() => ({ created: 0, evaluated: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when this module loads; counting its evaluation is the only view of that from a test.
vi.mock('@c15t/core/modules/script-loader', async (importOriginal) => {
	loads.evaluated += 1;
	const module = await importOriginal<typeof ScriptLoaderModule>();
	return {
		...module,
		createScriptLoader: (
			...args: Parameters<typeof module.createScriptLoader>
		) => {
			loads.created += 1;
			return module.createScriptLoader(...args);
		},
	};
});

// Raw source text, inlined by Vite so the scan works in browser-mode vitest.
const rawSources = import.meta.glob(
	[
		'../**/*.{ts,tsx}',
		'../../../core/src/**/*.ts',
		'!../**/__tests__/**',
		'!../**/*.test.*',
		'!../../../core/src/**/__tests__/**',
		'!../../../core/src/**/*.test.*',
	],
	{ eager: true, import: 'default', query: '?raw' }
) as Record<string, string>;

const CORE_SOURCE = '../../../core/src/';

/** `@c15t/core` subpaths whose file name differs from the subpath. */
const CORE_ENTRY_ALIASES: Record<string, string> = {
	'modules/network-hold': 'modules/network-blocker/hold.ts',
};

/** Value imports and re-exports; `import type` and `export type` erase. */
const STATIC_IMPORT =
	/^\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\s+from\s+)?['"](?<specifier>[^'"]+)['"]/gmu;

const normalize = function normalize(path: string): string {
	const parts: string[] = [];
	for (const part of path.split('/')) {
		if (part === '..' && parts.length > 0 && parts.at(-1) !== '..') {
			parts.pop();
		} else if (part !== '.') {
			parts.push(part);
		}
	}
	return parts.join('/');
};

const firstSource = function firstSource(base: string): string | undefined {
	return [
		`${base}.ts`,
		`${base}.tsx`,
		`${base}/index.ts`,
		`${base}/index.tsx`,
	].find((candidate) => candidate in rawSources);
};

/** The source file a value import resolves to, or `undefined` outside it. */
const resolveImport = function resolveImport(
	from: string,
	specifier: string
): string | undefined {
	if (specifier.startsWith('.')) {
		const file = firstSource(
			normalize(`${from.slice(0, from.lastIndexOf('/'))}/${specifier}`)
		);
		if (!file) {
			throw new Error(`Cannot resolve ${specifier} from ${from}`);
		}
		return file;
	}
	if (specifier === '@c15t/core') {
		return `${CORE_SOURCE}index.ts`;
	}
	if (specifier.startsWith('@c15t/core/')) {
		const subpath = specifier.slice('@c15t/core/'.length);
		const alias = CORE_ENTRY_ALIASES[subpath];
		const file = alias
			? `${CORE_SOURCE}${alias}`
			: firstSource(`${CORE_SOURCE}${subpath}`);
		if (!file) {
			throw new Error(`Cannot resolve ${specifier} from ${from}`);
		}
		return file;
	}
	return undefined;
};

/** Every React and core source file reachable through value imports. */
const staticGraph = function staticGraph(entries: string[]): Set<string> {
	const files = new Set<string>();
	const pending = [...entries];
	while (pending.length > 0) {
		const file = pending.pop() as string;
		if (files.has(file)) {
			continue;
		}
		files.add(file);
		for (const match of (rawSources[file] ?? '').matchAll(STATIC_IMPORT)) {
			const next = resolveImport(file, match.groups?.specifier as string);
			if (next) {
				pending.push(next);
			}
		}
	}
	return files;
};

const scripts: Script[] = [
	{
		category: 'marketing',
		id: 'pixel',
		src: 'https://example.com/pixel.js',
	},
];

const mode = custom({
	init: () => Promise.resolve({}),
	save: () => Promise.resolve({ ok: true }),
});

const never = new Promise<never>(() => {
	// Never settles.
});

/** Set once the provider has rendered down to its children. */
let held = false;

/** Suspends forever, so the tree around it never commits. */
const Hold = (): null => {
	held = true;
	throw never;
};

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	held = false;
});

describe('ConsentProvider: script loader at mount', () => {
	test('its static graph reaches the provider runtime but not the preload decision', () => {
		const graph = staticGraph(['../index.ts', '../provider.tsx']);
		expect(graph).toContain(`${CORE_SOURCE}runtime/provider-runtime.ts`);
		expect(graph).not.toContain(
			`${CORE_SOURCE}runtime/script-loader-preload.ts`
		);
	});

	// Order matters: the module evaluates once per file, so the case that
	// must not load it runs first.
	test("a returning visitor's grant does not load it before the provider mounts", async () => {
		const container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		root.render(
			<ConsentProvider
				options={{
					mode,
					persistence: false,
					prefetch: policyFixture({ marketing: true }),
					scripts,
				}}
			>
				<Hold />
			</ConsentProvider>
		);
		await vi.waitFor(() => expect(held).toBe(true));
		for (let turn = 0; turn < 10; turn += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
		}
		expect(loads.evaluated).toBe(0);
	});

	test('the mount loads it and mounts the loader', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		root.render(
			<ConsentProvider
				options={{
					mode,
					persistence: false,
					prefetch: policyFixture({ marketing: true }),
					scripts,
				}}
			>
				<div />
			</ConsentProvider>
		);
		await vi.waitFor(() => expect(loads.created).toBe(1));
		expect(loads.evaluated).toBe(1);
	});
});
