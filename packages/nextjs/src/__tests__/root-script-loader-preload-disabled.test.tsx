/**
 * A provider with `enabled: false` grants every category and ignores the
 * stored choice and any external consent source, so a returning visitor who
 * refused still needs the loader.
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

const loads = vi.hoisted(() => ({ evaluated: 0, loaded: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when this module loads; counting its evaluation is the only view of that from a test.
vi.mock('@c15t/core/modules/script-loader', async (importOriginal) => {
	loads.evaluated += 1;
	const module = await importOriginal<typeof ScriptLoaderModule>();
	loads.loaded += 1;
	return module;
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

test('a disabled root loads it during render despite a stored refusal and a consent source', async () => {
	const container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	root.render(
		<ConsentRoot
			options={{
				consentSource: {
					getPermissions: () => null,
					openPreferences: () => undefined,
					subscribe: () => () => undefined,
				},
				enabled: false,
			}}
			persistence={false}
			scripts={scripts}
			state={Promise.resolve(policyFixture({ marketing: false }))}
		>
			<Hold />
		</ConsentRoot>
	);
	// Wait for the whole load, so it does not outlive the test.
	await vi.waitFor(() => expect(loads.loaded).toBe(1));
	expect(loads.evaluated).toBe(1);
});
