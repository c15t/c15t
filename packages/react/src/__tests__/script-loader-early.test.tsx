/**
 * A plain `ConsentProvider` starts loading the script loader during its
 * first render when the visitor's consent already lets a script run.
 *
 * The provider mounts the loader from its mount effect. Each render below
 * suspends forever, so nothing commits and no effect runs: the module
 * loads only if the provider's render asked for it.
 */
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ConsentProvider, custom } from '../index';
import { policyFixture } from './policy-fixture';

const loads = vi.hoisted(() => ({ created: 0, evaluated: 0, loaded: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when this module loads; counting its evaluation is the only view of that from a test.
vi.mock('@c15t/core/modules/script-loader', async (importOriginal) => {
	loads.evaluated += 1;
	const module = await importOriginal<typeof ScriptLoaderModule>();
	loads.loaded += 1;
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

const renderUncommitted = (
	prefetch: ReturnType<typeof policyFixture>
): void => {
	const container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	root.render(
		<ConsentProvider options={{ mode, persistence: false, prefetch, scripts }}>
			<Hold />
		</ConsentProvider>
	);
};

// Order matters: the module evaluates once per file, so the case that must
// not load it runs first.
describe('ConsentProvider: script loader before mount', () => {
	test('a first visit does not load it before the provider mounts', async () => {
		renderUncommitted(policyFixture());
		await vi.waitFor(() => expect(held).toBe(true));
		for (let turn = 0; turn < 10; turn += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
		}
		expect(loads.evaluated).toBe(0);
	});

	test("a returning visitor's grant loads it during render", async () => {
		renderUncommitted(policyFixture({ marketing: true }));
		// Wait for the whole load, so it does not outlive the test.
		await vi.waitFor(() => expect(loads.loaded).toBe(1));
		expect(loads.evaluated).toBe(1);
		// Nothing committed, so the provider has not mounted the loader.
		expect(loads.created).toBe(0);
	});
});
