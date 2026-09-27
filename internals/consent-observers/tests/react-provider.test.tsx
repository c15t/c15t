// @vitest-environment jsdom
import type { ConsentKernel } from 'c15t';
import { ConsentProvider, offline, useConsent } from 'c15t/react';
import { KernelContext } from 'c15t/react/context';
import type { ConsentRuntime } from 'c15t/runtime';
import { act, Component, StrictMode, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { observeConsent } from '../src/observer';
import {
	createObservedRuntime,
	OBSERVED_RULE,
	observedPolicy,
	recordChoice,
} from '../src/policy';
import { ConsentProbe } from '../src/react';
import { countSubscriptions, mount } from './dom';
import type { Mounted } from './dom';

const mounted: Mounted[] = [];
const runtimes: ConsentRuntime[] = [];

const track = function track(root: Mounted): Mounted {
	mounted.push(root);
	return root;
};

/** A runtime restored from an earlier accept or reject. */
const restored = async function restored(
	action?: 'all' | 'none'
): Promise<ConsentRuntime> {
	const runtime = createObservedRuntime({
		choice: action ? await recordChoice(action) : null,
	});
	runtimes.push(runtime);
	return runtime;
};

/** Provider options for a provider that builds and owns its kernel. */
const ownedOptions = async function ownedOptions(action: 'all' | 'none') {
	return {
		iframeBlocker: false as const,
		mode: offline({ policyRules: [OBSERVED_RULE] }),
		persistence: false as const,
		prefetch: {
			initialPolicyResolution: observedPolicy(),
			initialRecords: { choice: await recordChoice(action) },
		},
	};
};

/** Stores the kernel its provider put in context. */
const KernelCapture = ({
	onKernel,
}: {
	onKernel: (kernel: ConsentKernel | null) => void;
}) => {
	onKernel(useContext(KernelContext));
	return null;
};

/** A consumer that attaches in an effect instead of `useSyncExternalStore`. */
const EffectObserver = () => {
	const kernel = useContext(KernelContext);
	useEffect(() => {
		if (!kernel) {
			return;
		}
		return observeConsent(kernel).detach;
	}, [kernel]);
	return null;
};

interface ErrorBoundaryProps {
	children: ReactNode;
	onError: (error: unknown) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { failed: false };
	}

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override componentDidCatch(error: unknown) {
		this.props.onError(error);
	}

	override render() {
		return this.state.failed ? null : this.props.children;
	}
}

afterEach(async () => {
	for (const root of mounted.splice(0)) {
		// oxlint-disable-next-line no-await-in-loop -- Unmount roots in order.
		await root.unmount();
	}
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
});

describe('KernelContext consumers under ConsentProvider', () => {
	test('read the current state of a runtime initialized before mount', async () => {
		const runtime = await restored();
		await runtime.kernel.commands.init();
		await runtime.kernel.commands.save('all');
		const onRender = vi.fn();

		const root = track(
			await mount(
				<ConsentProvider runtime={runtime}>
					<ConsentProbe
						name="late"
						onRender={onRender}
					/>
				</ConsentProvider>
			)
		);

		// The first render already has the grant; nothing had to be replayed.
		expect(onRender.mock.calls[0]?.[0]).toBe(runtime.kernel.getSnapshot());
		expect(root.probe('late')).toEqual({
			attached: 'yes',
			granted: 'true',
			revision: String(runtime.kernel.getSnapshot().revision),
		});
	});

	test('re-render on grants and denials', async () => {
		const runtime = await restored();
		const root = track(
			await mount(
				<ConsentProvider runtime={runtime}>
					<ConsentProbe name="live" />
				</ConsentProvider>
			)
		);
		expect(root.probe('live')?.granted).toBe('false');

		await act(async () => {
			await runtime.kernel.commands.save('all');
		});
		expect(root.probe('live')?.granted).toBe('true');

		await act(async () => {
			await runtime.kernel.commands.save('none');
		});
		expect(root.probe('live')?.granted).toBe('false');
	});
});

describe('provider replacement', () => {
	const expectFollowsSecond = async function expectFollowsSecond(input: {
		root: Mounted;
		first: ConsentRuntime;
		second: ConsentRuntime;
		firstActive: () => number;
		renders: () => number;
	}) {
		const { root, first, second } = input;
		expect(root.probe('consumer')?.granted).toBe('false');
		expect(input.firstActive()).toBe(0);

		const before = input.renders();
		await act(async () => {
			await first.kernel.commands.save('none');
			await first.kernel.commands.save('all');
		});
		expect(input.renders()).toBe(before);
		expect(root.probe('consumer')?.granted).toBe('false');

		await act(async () => {
			await second.kernel.commands.save('all');
		});
		expect(root.probe('consumer')?.granted).toBe('true');
	};

	test('a new provider element releases the old kernel and follows the new one', async () => {
		const first = await restored('all');
		const second = await restored('none');
		const firstSubscriptions = countSubscriptions(first.kernel);
		const onRender = vi.fn();
		const consumer = (
			<ConsentProbe
				name="consumer"
				onRender={onRender}
			/>
		);

		const root = track(
			await mount(
				<ConsentProvider
					key="first"
					runtime={first}
				>
					{consumer}
				</ConsentProvider>
			)
		);
		expect(root.probe('consumer')?.granted).toBe('true');
		expect(firstSubscriptions.active).toBeGreaterThan(0);

		await root.rerender(
			<ConsentProvider
				key="second"
				runtime={second}
			>
				{consumer}
			</ConsentProvider>
		);

		await expectFollowsSecond({
			first,
			firstActive: () => firstSubscriptions.active,
			renders: () => onRender.mock.calls.length,
			root,
			second,
		});
	});

	test('a provider handed another runtime releases the old kernel and follows the new one', async () => {
		const first = await restored('all');
		const second = await restored('none');
		const firstSubscriptions = countSubscriptions(first.kernel);
		const onRender = vi.fn();
		const tree = (runtime: ConsentRuntime) => (
			<ConsentProvider runtime={runtime}>
				<ConsentProbe
					name="consumer"
					onRender={onRender}
				/>
			</ConsentProvider>
		);

		const root = track(await mount(tree(first)));
		expect(root.probe('consumer')?.granted).toBe('true');
		expect(firstSubscriptions.active).toBeGreaterThan(0);

		await root.rerender(tree(second));

		await expectFollowsSecond({
			first,
			firstActive: () => firstSubscriptions.active,
			renders: () => onRender.mock.calls.length,
			root,
			second,
		});
	});
});

describe('two provider roots', () => {
	test('stay isolated while their revisions match', async () => {
		const kernels: Record<string, ConsentKernel | null> = {};
		const grantedRenders = vi.fn();
		const deniedRenders = vi.fn();

		const granted = track(
			await mount(
				<ConsentProvider options={await ownedOptions('all')}>
					<KernelCapture onKernel={(kernel) => (kernels.granted = kernel)} />
					<ConsentProbe
						name="granted"
						onRender={grantedRenders}
					/>
				</ConsentProvider>
			)
		);
		const denied = track(
			await mount(
				<ConsentProvider options={await ownedOptions('none')}>
					<KernelCapture onKernel={(kernel) => (kernels.denied = kernel)} />
					<ConsentProbe
						name="denied"
						onRender={deniedRenders}
					/>
				</ConsentProvider>
			)
		);

		expect(kernels.granted).not.toBe(kernels.denied);
		expect(granted.probe('granted')?.revision).toBe(
			denied.probe('denied')?.revision
		);
		expect(granted.probe('granted')?.granted).toBe('true');
		expect(denied.probe('denied')?.granted).toBe('false');

		// Opposite actions on each root: revisions stay equal, values swap.
		const quietRenders = deniedRenders.mock.calls.length;
		await act(async () => {
			await kernels.granted?.commands.save('none');
		});
		expect(granted.probe('granted')?.granted).toBe('false');
		expect(denied.probe('denied')?.granted).toBe('false');
		expect(deniedRenders.mock.calls.length).toBe(quietRenders);

		await act(async () => {
			await kernels.denied?.commands.save('all');
		});
		expect(granted.probe('granted')?.revision).toBe(
			denied.probe('denied')?.revision
		);
		expect(granted.probe('granted')?.granted).toBe('false');
		expect(denied.probe('denied')?.granted).toBe('true');
	});

	test('sibling providers in one tree stay isolated while their revisions match', async () => {
		const first = await restored('all');
		const second = await restored('none');
		const root = track(
			await mount(
				<>
					<ConsentProvider runtime={first}>
						<ConsentProbe name="first" />
					</ConsentProvider>
					<ConsentProvider runtime={second}>
						<ConsentProbe name="second" />
					</ConsentProvider>
				</>
			)
		);
		expect(root.probe('first')?.revision).toBe(root.probe('second')?.revision);
		expect(root.probe('first')?.granted).toBe('true');
		expect(root.probe('second')?.granted).toBe('false');

		await act(async () => {
			await second.kernel.commands.save('all');
			await first.kernel.commands.save('none');
		});

		expect(root.probe('first')?.revision).toBe(root.probe('second')?.revision);
		expect(root.probe('first')?.granted).toBe('false');
		expect(root.probe('second')?.granted).toBe('true');
	});
});

describe('StrictMode', () => {
	const tree = (runtime: ConsentRuntime) => (
		<ConsentProvider runtime={runtime}>
			<ConsentProbe name="a" />
			<ConsentProbe name="b" />
			<EffectObserver />
		</ConsentProvider>
	);

	test('mounting and unmounting leave no duplicate subscriptions', async () => {
		const plain = await restored();
		const strict = await restored();
		const plainSubscriptions = countSubscriptions(plain.kernel);
		const strictSubscriptions = countSubscriptions(strict.kernel);

		const plainRoot = await mount(tree(plain));
		const strictRoot = await mount(<StrictMode>{tree(strict)}</StrictMode>);

		// StrictMode subscribes, cleans up and subscribes again; it must end
		// with exactly the subscriptions a plain mount holds.
		expect(plainSubscriptions.active).toBeGreaterThan(0);
		expect(strictSubscriptions.total).toBeGreaterThan(plainSubscriptions.total);
		expect(strictSubscriptions.active).toBe(plainSubscriptions.active);

		await act(async () => {
			await strict.kernel.commands.save('all');
		});
		expect(strictRoot.probe('a')?.granted).toBe('true');
		expect(strictRoot.probe('b')?.granted).toBe('true');
		expect(strictSubscriptions.active).toBe(plainSubscriptions.active);

		await plainRoot.unmount();
		await strictRoot.unmount();
		expect(plainSubscriptions.active).toBe(0);
		expect(strictSubscriptions.active).toBe(0);
	});

	test('an owned provider under StrictMode still isolates and disposes its kernel', async () => {
		let kernel: ConsentKernel | null = null;
		const root = await mount(
			<StrictMode>
				<ConsentProvider options={await ownedOptions('all')}>
					<KernelCapture onKernel={(value) => (kernel = value)} />
					<ConsentProbe name="owned" />
				</ConsentProvider>
			</StrictMode>
		);
		expect(root.probe('owned')?.granted).toBe('true');
		const captured = kernel as ConsentKernel | null;
		if (!captured) {
			throw new Error('provider put no kernel in context');
		}
		const dispose = vi.spyOn(captured, 'dispose');

		await root.unmount();

		expect(dispose).toHaveBeenCalledTimes(1);
	});
});

describe('borrowed runtimes', () => {
	test('are not initialized, started or disposed by the provider', async () => {
		const runtime = await restored();
		const init = vi.spyOn(runtime.kernel.commands, 'init');
		const dispose = vi.spyOn(runtime.kernel, 'dispose');
		const external = observeConsent(runtime.kernel);

		const root = await mount(
			<ConsentProvider runtime={runtime}>
				<ConsentProbe name="borrowed" />
			</ConsentProvider>
		);
		await root.unmount();

		expect(init).not.toHaveBeenCalled();
		expect(dispose).not.toHaveBeenCalled();
		expect(runtime.started).toBe(false);

		// Still the owner's live kernel: an observer outside React keeps
		// receiving changes after the provider is gone.
		void runtime.kernel.commands.save('all');
		expect(external.current.permissions.marketing).toBe(true);
		external.detach();

		runtime.dispose();
		expect(dispose).toHaveBeenCalledTimes(1);
	});

	test('stay started after the provider unmounts, until the owner disposes them', async () => {
		const runtime = await restored();
		runtime.start();
		expect(runtime.started).toBe(true);

		const root = await mount(
			<ConsentProvider runtime={runtime}>
				<ConsentProbe name="started" />
			</ConsentProvider>
		);
		await root.unmount();

		expect(runtime.started).toBe(true);
		runtime.dispose();
		expect(runtime.started).toBe(false);
	});

	test('a provider that built its own kernel disposes it on unmount', async () => {
		let kernel: ConsentKernel | null = null;
		const root = await mount(
			<ConsentProvider options={await ownedOptions('none')}>
				<KernelCapture onKernel={(value) => (kernel = value)} />
			</ConsentProvider>
		);
		const captured = kernel as ConsentKernel | null;
		if (!captured) {
			throw new Error('provider put no kernel in context');
		}
		const dispose = vi.spyOn(captured, 'dispose');

		await root.unmount();

		expect(dispose).toHaveBeenCalledTimes(1);
	});
});

describe('missing and detached providers', () => {
	test('a consumer without a provider sees no grant, even beside a granting root', async () => {
		const granting = track(
			await mount(
				<ConsentProvider options={await ownedOptions('all')}>
					<ConsentProbe name="granting" />
				</ConsentProvider>
			)
		);
		expect(granting.probe('granting')?.granted).toBe('true');

		const orphan = track(await mount(<ConsentProbe name="orphan" />));

		expect(orphan.probe('orphan')).toEqual({
			attached: 'no',
			granted: 'false',
			revision: '',
		});
	});

	test('useConsent without a provider throws instead of borrowing a granting root', async () => {
		track(
			await mount(
				<ConsentProvider options={await ownedOptions('all')}>
					<ConsentProbe name="granting" />
				</ConsentProvider>
			)
		);
		const Reader = () => <output>{String(useConsent('marketing'))}</output>;
		const errors: unknown[] = [];
		vi.spyOn(console, 'error').mockImplementation(() => {
			// React reports the caught render error; the boundary records it.
		});

		const orphan = track(
			await mount(
				<ErrorBoundary onError={(error) => errors.push(error)}>
					<Reader />
				</ErrorBoundary>
			)
		);

		expect(orphan.container.querySelector('output')).toBeNull();
		expect(String(errors[0])).toMatch(/no kernel in context/u);
	});

	test('a consumer detached below a granting provider sees no grant', async () => {
		const runtime = await restored('all');
		const root = track(
			await mount(
				<ConsentProvider runtime={runtime}>
					<ConsentProbe name="inside" />
					<KernelContext.Provider value={null}>
						<ConsentProbe name="detached" />
					</KernelContext.Provider>
				</ConsentProvider>
			)
		);

		expect(root.probe('inside')?.granted).toBe('true');
		expect(root.probe('detached')).toEqual({
			attached: 'no',
			granted: 'false',
			revision: '',
		});
	});

	test('a consumer whose provider is removed drops the grant and the subscription', async () => {
		const runtime = await restored('all');
		const subscriptions = countSubscriptions(runtime.kernel);
		const Layout = ({
			children,
			provided,
		}: {
			children: ReactNode;
			provided: boolean;
		}) =>
			provided ? (
				<ConsentProvider runtime={runtime}>{children}</ConsentProvider>
			) : (
				children
			);
		const root = track(
			await mount(
				<Layout provided>
					<ConsentProbe name="moved" />
				</Layout>
			)
		);
		expect(root.probe('moved')?.granted).toBe('true');

		await root.rerender(
			<Layout provided={false}>
				<ConsentProbe name="moved" />
			</Layout>
		);

		expect(root.probe('moved')).toEqual({
			attached: 'no',
			granted: 'false',
			revision: '',
		});
		expect(subscriptions.active).toBe(0);
	});

	test('a consumer moved from a granting to a denying provider never keeps the grant', async () => {
		const granting = await restored('all');
		const denying = await restored('none');
		const seen: (boolean | null)[] = [];
		// Same provider element, so the consumer keeps its state and must not
		// render one frame with the previous provider's grant.
		const tree = (runtime: ConsentRuntime) => (
			<ConsentProvider runtime={runtime}>
				<ConsentProbe
					name="moved"
					onRender={(snapshot) =>
						seen.push(snapshot?.effectivePermissions.marketing ?? null)
					}
				/>
			</ConsentProvider>
		);
		const root = track(await mount(tree(granting)));
		seen.length = 0;

		await root.rerender(tree(denying));

		expect(seen.length).toBeGreaterThan(0);
		expect(seen.every((value) => value === false)).toBe(true);
		expect(root.probe('moved')?.granted).toBe('false');
	});
});
