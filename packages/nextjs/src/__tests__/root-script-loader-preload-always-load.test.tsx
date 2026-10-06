/**
 * An `alwaysLoad` script runs whatever the visitor chose, so a returning
 * visitor who denied its category still needs the script loader.
 *
 * Kept apart from `root-script-loader-preload.test.tsx`: the mocked module
 * evaluates once per file, so each file can show one load.
 */
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

const loads = vi.hoisted(() => ({ evaluated: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when this module loads; counting its evaluation is the only view of that from a test.
vi.mock('@c15t/core/modules/script-loader', async (importOriginal) => {
	loads.evaluated += 1;
	return await importOriginal<typeof ScriptLoaderModule>();
});

const scripts: Script[] = [
	{
		alwaysLoad: true,
		category: 'marketing',
		id: 'tag',
		src: 'https://example.com/tag.js',
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

test('a stored choice that denies an alwaysLoad script still loads it during render', async () => {
	const container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	root.render(
		<ConsentRoot
			persistence={false}
			scripts={scripts}
			state={Promise.resolve(policyFixture({ marketing: false }))}
		>
			<Hold />
		</ConsentRoot>
	);
	await vi.waitFor(() => expect(loads.evaluated).toBe(1));
});
