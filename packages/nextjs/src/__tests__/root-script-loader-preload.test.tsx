/**
 * ConsentRoot starts loading the script loader before the page hydrates
 * when the visitor's stored choice lets a configured script run.
 *
 * The provider loads the script loader from its mount effect, after the
 * whole tree has hydrated. Each render below suspends forever, so nothing
 * commits and no effect runs: the module loads only if the root's render
 * asked for it.
 */
import { offline } from '@c15t/core/modes';
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import type { Script } from '@c15t/core/modules/script-loader';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { encodeStoredConsentEnvelopeJson } from '../../../core/src/modules/persistence/writer/encode';
import { ConsentRoot } from '../root';
import type { ConsentRootProps } from '../root';
import type { ConsentState } from '../types';
import { policyFixture } from './policy-fixture';

/** These tests are not about the backend; an explicit offline() needs none. */
const OFFLINE_CONFIG = { mode: offline() };

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

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	src: 'https://example.com/pixel.js',
};

const scripts: Script[] = [pixel];

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
	localStorage.clear();
});

/** Render the root with a child that holds the commit back for good. */
const renderUncommitted = (
	state: ConsentState | Promise<ConsentState>,
	props: Pick<ConsentRootProps, 'persistence' | 'scripts' | 'vendors'> = {}
): void => {
	const container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	root.render(
		<ConsentRoot
			config={OFFLINE_CONFIG}
			persistence={false}
			scripts={scripts}
			state={state}
			{...props}
		>
			<Hold />
		</ConsentRoot>
	);
};

/**
 * Wait until the root has rendered, then give a load it might have started
 * time to evaluate.
 */
const settle = async (): Promise<void> => {
	await vi.waitFor(() => expect(held).toBe(true));
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

	// A permissive policy allows a category nothing on the page asks about.
	// The scripts ask about marketing, so the stored denial decides.
	test('a permissive policy keeps a stored denial for a script category', async () => {
		renderUncommitted(
			policyFixture({ marketing: false }, { scopeMode: 'permissive' })
		);
		await settle();
		expect(loads.evaluated).toBe(0);
	});

	// The state declares no vendors. The page does, in code or on the script.
	test.each([
		[
			'declared in code',
			{
				vendors: [
					{
						category: 'marketing',
						id: 'pixel-co',
						name: 'Pixel Co',
						privacyPolicyUrl: 'https://example.com/privacy',
					},
				],
			},
		],
		['named only by the script', {}],
	] as const)(
		'a vendor turned off and %s does not load it',
		async (_, props) => {
			const state = policyFixture({ marketing: true });
			renderUncommitted(
				{
					...state,
					initialRecords: {
						...state.initialRecords,
						vendorChoice: {
							confirmedAt: state.now,
							denied: ['pixel-co'],
							version: 1,
						},
					},
				},
				{
					scripts: [{ ...pixel, vendor: 'pixel-co' }],
					...props,
				}
			);
			await settle();
			expect(loads.evaluated).toBe(0);
		}
	);

	// The cookie the server read holds a grant, but a later denial reached
	// only localStorage: the browser dropped that cookie write. The provider
	// applies the newer denial before it mounts the loader.
	test.each([
		['resolved', (state: ConsentState) => state],
		['streamed', (state: ConsentState) => Promise.resolve(state)],
	] as const)(
		'a newer denial in localStorage over a %s grant does not load it',
		async (_, deliver) => {
			const fixture = policyFixture({ marketing: true });
			const grant = fixture.initialRecords?.choice?.categories.marketing;
			if (!grant) {
				throw new Error('The fixture records a marketing decision.');
			}
			const granted: ConsentState = {
				...fixture,
				initialRecords: {
					choice: {
						categories: {
							marketing: { ...grant, confirmedAt: fixture.now - 60_000 },
						},
						version: 3,
					},
				},
			};
			localStorage.setItem(
				'c15t',
				encodeStoredConsentEnvelopeJson({
					categories: {
						marketing: {
							...grant,
							confirmedAt: fixture.now - 1000,
							value: false,
						},
					},
					version: 3,
				})
			);
			renderUncommitted(deliver(granted), { persistence: true });
			await settle();
			expect(loads.evaluated).toBe(0);
		}
	);

	test('a stored grant that GPC denies does not load it', async () => {
		renderUncommitted({
			...policyFixture(
				{ marketing: true },
				{ privacySignals: { gpc: { denyCategories: ['marketing'] } } }
			),
			initialPrivacySignals: { gpc: true },
		});
		await settle();
		expect(loads.evaluated).toBe(0);
	});

	test("a stored grant that the browser's GPC denies does not load it", async () => {
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		try {
			renderUncommitted(
				policyFixture(
					{ marketing: true },
					{ privacySignals: { gpc: { denyCategories: ['marketing'] } } }
				)
			);
			await settle();
			expect(loads.evaluated).toBe(0);
		} finally {
			Reflect.deleteProperty(navigator, 'globalPrivacyControl');
		}
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
				config={OFFLINE_CONFIG}
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
