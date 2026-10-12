/**
 * With a `consentSource`, the external source decides consent after the
 * provider mounts, so a stored grant says nothing about what runs. An
 * `alwaysLoad` script runs whatever the source says, so it still needs the
 * script loader.
 *
 * Kept apart from `root-script-loader-preload.test.tsx`: the mocked module
 * evaluates once per file, so each file can show one load.
 */
import { offline } from '@c15t/core/modes';
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import type { ExternalConsentSource } from '@c15t/core/runtime';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

/** These tests are not about the backend; an explicit offline() needs none. */
const OFFLINE_CONFIG = { mode: offline() };

const loads = vi.hoisted(() => ({ evaluated: 0, loaded: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when this module loads; counting its evaluation is the only view of that from a test.
vi.mock('@c15t/core/modules/script-loader', async (importOriginal) => {
	loads.evaluated += 1;
	const module = await importOriginal<typeof ScriptLoaderModule>();
	loads.loaded += 1;
	return module;
});

const consentSource: ExternalConsentSource = {
	getPermissions: () => null,
	openPreferences: () => undefined,
	subscribe: () => () => undefined,
};

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	src: 'https://example.com/pixel.js',
};

const never = new Promise<never>(() => {
	// Never settles.
});

/** Set once the root has rendered down to its children. */
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

const renderUncommitted = (scripts: Script[]): void => {
	const container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	root.render(
		<ConsentRoot
			config={OFFLINE_CONFIG}
			options={{ consentSource }}
			persistence={false}
			scripts={scripts}
			state={Promise.resolve(policyFixture({ marketing: true }))}
		>
			<Hold />
		</ConsentRoot>
	);
};

// Order matters: the module evaluates once per file, so the case that must
// not load it runs first.
describe('ConsentRoot with a consent source: script loader before hydration', () => {
	test('a stored grant does not load it', async () => {
		renderUncommitted([pixel]);
		await vi.waitFor(() => expect(held).toBe(true));
		for (let turn = 0; turn < 10; turn += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
		}
		expect(loads.evaluated).toBe(0);
	});

	test('an alwaysLoad script loads it during render', async () => {
		renderUncommitted([pixel, { ...pixel, alwaysLoad: true, id: 'tag' }]);
		// Wait for the whole load, so it does not outlive the test.
		await vi.waitFor(() => expect(loads.loaded).toBe(1));
		expect(loads.evaluated).toBe(1);
	});
});
