/**
 * ConsentRoot starts loading the script loader before the page hydrates
 * when the visitor's stored choice lets a configured script run.
 *
 * The provider loads the script loader from its mount effect, after the
 * whole tree has hydrated. Each render below suspends forever, so nothing
 * commits and no effect runs: the module loads only if the root's render
 * asked for it.
 */
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ConsentRoot } from '../root';
import type { ConsentState } from '../types';
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

const scripts: Script[] = [
	{
		category: 'marketing',
		id: 'pixel',
		src: 'https://example.com/pixel.js',
	},
];

const never = new Promise<never>(() => {
	// Never settles.
});

/** Suspends forever, so the tree around it never commits. */
const Hold = (): null => {
	throw never;
};

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
});

/** Render the root with a child that holds the commit back for good. */
const renderUncommitted = (
	state: ConsentState | Promise<ConsentState>
): void => {
	const container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	root.render(
		<ConsentRoot
			persistence={false}
			scripts={scripts}
			state={state}
		>
			<Hold />
		</ConsentRoot>
	);
};

/** Give a load the root might have started time to evaluate. */
const settle = async (): Promise<void> => {
	for (let turn = 0; turn < 10; turn += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
	}
};

// Order matters: the module evaluates once per file, so the cases that
// must not load it run first.
describe('ConsentRoot: script loader before hydration', () => {
	test('a first visit does not load it before the page commits', async () => {
		renderUncommitted(policyFixture());
		await settle();
		expect(loads.evaluated).toBe(0);
	});

	test('a stored choice that denies every script does not load it', async () => {
		renderUncommitted(
			Promise.resolve(policyFixture({ marketing: false, measurement: true }))
		);
		await settle();
		expect(loads.evaluated).toBe(0);
	});

	test('a stored choice that grants a script loads it during render', async () => {
		let resolveState: (state: ConsentState) => void = () => undefined;
		renderUncommitted(
			new Promise<ConsentState>((resolve) => {
				resolveState = resolve;
			})
		);
		resolveState(policyFixture({ marketing: true }));
		await vi.waitFor(() => expect(loads.evaluated).toBe(1));
		// Nothing committed, so the provider has not mounted the loader.
		expect(loads.created).toBe(0);
	});

	test('the provider mounts the module the root loaded', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		root.render(
			<ConsentRoot
				persistence={false}
				scripts={scripts}
				state={policyFixture({ marketing: true })}
			>
				<div />
			</ConsentRoot>
		);
		// One mount from the module the root's import already loaded.
		await vi.waitFor(() => expect(loads.created).toBe(1));
	});
});
