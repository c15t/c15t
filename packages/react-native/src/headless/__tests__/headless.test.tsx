/**
 * The headless surface: a function child called with the slice it asked for,
 * and a fallback whenever that slice says otherwise.
 */

import type { ReactNode } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import {
	buildSnapshot,
	createFakeNativeModule,
	flush,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import type { FakeNativeModule } from '../../__tests__/helpers/fake-native';
import { resetNativeStub } from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { C15tProvider } from '../../provider/c15t-provider';
import { ConsentGate } from '../consent-gate';
import { ConsentPrompt } from '../consent-prompt';
import { ConsentReady } from '../consent-ready';

/** The marketing-granted permission set. */
const MARKETING_ON = {
	experience: false,
	functionality: true,
	marketing: true,
	measurement: false,
	necessary: true,
};

/** A banner body for the prompt slot, keyed by the surface it was given. */
const Banner = (): ReactNode => <span>banner</span>;

/** A dialog body for the prompt slot. */
const Dialog = (): ReactNode => <span>dialog</span>;

let fake: FakeNativeModule;

/** Render one element under a provider over a fresh native core. */
const mount = function mount(
	children: ReactNode,
	options: Parameters<typeof createFakeNativeModule>[0] = {}
): ReturnType<typeof renderTree> {
	fake = createFakeNativeModule(options);

	return renderTree(<C15tProvider>{children}</C15tProvider>);
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('ConsentGate', () => {
	test('calls children only while the category is allowed', () => {
		const tree = mount(
			<ConsentGate category="marketing">
				{({ category }) => <span>{`vendor:${category}`}</span>}
			</ConsentGate>,
			{ snapshot: buildSnapshot({ effectivePermissions: MARKETING_ON }) }
		);

		expect(tree.text()).toBe('vendor:marketing');

		flush(() => {
			fake.pushSnapshot(buildSnapshot({ revision: 3 }));
		});

		expect(tree.text()).toBe('');

		tree.unmount();
	});

	test('renders the fallback rather than nothing when blocked', () => {
		const tree = mount(
			<ConsentGate
				category="marketing"
				fallback={
					<button
						onClick={() => undefined}
						type="button"
					>
						ask
					</button>
				}
			>
				{() => <span>vendor</span>}
			</ConsentGate>
		);

		expect(tree.text()).toBe('ask');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({ effectivePermissions: MARKETING_ON, revision: 4 })
			);
		});

		expect(tree.text()).toBe('vendor');

		tree.unmount();
	});

	test('hands the children actions wired to the native core', () => {
		const tree = mount(
			<ConsentGate category="necessary">
				{({ actions }) => (
					<button
						onClick={() => actions.acceptAll()}
						type="button"
					>
						accept
					</button>
				)}
			</ConsentGate>
		);

		const button = tree.container().querySelector('button');

		expect(button).not.toBeNull();

		flush(() => {
			button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(fake.commit).toHaveBeenCalledTimes(1);
		expect(fake.commitIntents).toEqual(['{"action":"all"}']);

		tree.unmount();
	});

	test('necessary is gated through the same path', () => {
		const tree = mount(
			<ConsentGate category="necessary">
				{() => <span>always</span>}
			</ConsentGate>
		);

		expect(tree.text()).toBe('always');

		tree.unmount();
	});
});

describe('ConsentReady', () => {
	test('holds children back until the core has finished starting up', () => {
		const tree = mount(
			<ConsentReady>
				{({ status }) => <span>{`ready:${String(status.activeUI)}`}</span>}
			</ConsentReady>,
			{ snapshot: buildSnapshot({ ready: false }) }
		);

		expect(tree.text()).toBe('');

		flush(() => {
			fake.pushSnapshot(buildSnapshot({ ready: true, revision: 6 }));
		});

		expect(tree.text()).toBe('ready:banner');

		tree.unmount();
	});

	test('holds children back while the policy is still pending', () => {
		const tree = mount(
			<ConsentReady fallback={<span>waiting</span>}>
				{() => <span>content</span>}
			</ConsentReady>,
			{ snapshot: buildSnapshot({ policyPending: true }) }
		);

		expect(tree.text()).toBe('waiting');

		flush(() => {
			fake.pushSnapshot(buildSnapshot({ policyPending: false, revision: 7 }));
		});

		expect(tree.text()).toBe('content');

		tree.unmount();
	});
});

describe('ConsentPrompt', () => {
	test('passes the resolved surface and requirement to children', () => {
		const tree = mount(
			<ConsentPrompt>
				{({ activeUI, promptRequirement }) =>
					activeUI === 'banner' ? (
						<Banner />
					) : (
						<span>{`${String(activeUI)}:${promptRequirement.kind}`}</span>
					)
				}
			</ConsentPrompt>
		);

		expect(tree.text()).toBe('banner');

		tree.unmount();
	});

	test('steps aside once nothing is owed', () => {
		const tree = mount(
			<ConsentPrompt fallback={<Dialog />}>{() => <Banner />}</ConsentPrompt>
		);

		expect(tree.text()).toBe('banner');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					activeUI: null,
					promptRequirement: { kind: 'none' },
					revision: 9,
				})
			);
		});

		expect(tree.text()).toBe('dialog');

		tree.unmount();
	});

	test('stays hidden while the policy is pending', () => {
		const tree = mount(
			<ConsentPrompt fallback={<Dialog />}>{() => <Banner />}</ConsentPrompt>,
			{ snapshot: buildSnapshot({ policyPending: true }) }
		);

		expect(tree.text()).toBe('dialog');

		tree.unmount();
	});
});
