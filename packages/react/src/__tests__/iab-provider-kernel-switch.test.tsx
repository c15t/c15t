import type { ConsentKernel } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import type * as IABModule from '@c15t/iab';
import {
	Component,
	StrictMode,
	useContext,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { IABContext } from '../context/iab-context-value';
import type { IABContextValue } from '../context/iab-context-value';
import { IABProvider, useIAB } from '../iab-context';
import type { ReactIABState } from '../iab-context';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const iab = vi.hoisted(() => ({
	/** Every handle created, in order, including StrictMode replays. */
	created: [] as Record<string, ReturnType<typeof vi.fn>>[],
	/** Kernels whose CMP fails to start, as a broken configuration would. */
	failing: new Set<unknown>(),
	/** The latest handle per kernel. */
	handles: new Map<unknown, Record<string, ReturnType<typeof vi.fn>>>(),
}));

// IABProvider imports createIAB itself and offers no injection point. Replace
// only that factory with one fake CMP per kernel, so a test can tell which
// runtime an action reached; the rest of the module stays real.
// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock('@c15t/iab', async (importOriginal) => ({
	...(await importOriginal<typeof IABModule>()),
	createIAB: ({ kernel }: { kernel: unknown }) => {
		if (iab.failing.has(kernel)) {
			throw new Error('CMP failed to start');
		}
		const handle = {
			acceptAll: vi.fn(),
			dispose: vi.fn(),
			generateTCString: vi.fn(() => Promise.resolve('tc')),
			rejectAll: vi.fn(),
			save: vi.fn(() => Promise.resolve()),
			setPurposeConsent: vi.fn(),
			setPurposeLegitimateInterest: vi.fn(),
			setSpecialFeatureOptIn: vi.fn(),
			setVendorConsent: vi.fn(),
			setVendorLegitimateInterest: vi.fn(),
		};
		iab.handles.set(kernel, handle);
		iab.created.push(handle);
		return handle;
	},
}));

const runtimes: ConsentRuntime[] = [];

const createKernel = function createKernel(): ConsentKernel {
	const runtime = createConsentRuntime({
		mode: offline(),
		persistence: false,
		prefetch: {
			...policyFixture({}, { model: 'iab' }),
			initialIab: { cmpId: 42, enabled: true },
		},
	});
	runtimes.push(runtime);
	return runtime.kernel;
};

const handleOf = function handleOf(kernel: ConsentKernel) {
	const handle = iab.handles.get(kernel);
	if (!handle) {
		throw new Error('IABProvider created no handle for this kernel');
	}
	return handle;
};

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	iab.handles.clear();
	iab.created.length = 0;
	iab.failing.clear();
});

/** Records what every render sees: the kernel and the published handle. */
const ContextProbe = ({
	onRender,
}: {
	onRender: (
		kernel: ConsentKernel | null,
		value: IABContextValue | null
	) => void;
}) => {
	onRender(useContext(KernelContext), useContext(IABContext));
	return null;
};

/** Takes IAB actions in a layout effect as soon as the kernel changes. */
const SwitchActor = ({
	onSwitch,
}: {
	onSwitch: (state: ReactIABState, kernel: ConsentKernel) => void;
}) => {
	const kernel = useContext(KernelContext);
	const state = useIAB();
	const previous = useRef(kernel);
	useLayoutEffect(() => {
		if (previous.current !== kernel && state && kernel) {
			previous.current = kernel;
			onSwitch(state, kernel);
		}
	}, [kernel, state, onSwitch]);
	return null;
};

/** Reports every render's kernel and `useIAB()` result. */
const StateProbe = ({
	onState,
}: {
	onState: (kernel: ConsentKernel | null, state: ReactIABState | null) => void;
}) => {
	onState(useContext(KernelContext), useIAB());
	return null;
};

describe('IABProvider when the context kernel changes', () => {
	test('actions taken in a layout effect right after the switch reach the new kernel', async () => {
		const first = createKernel();
		const second = createKernel();
		let saved: Promise<void> | undefined;
		const onSwitch = (state: ReactIABState) => {
			state.acceptAll();
			saved = state.save();
		};
		const tree = (kernel: ConsentKernel) => (
			<KernelContext.Provider value={kernel}>
				<IABProvider cmpId={42}>
					<SwitchActor onSwitch={onSwitch} />
				</IABProvider>
			</KernelContext.Provider>
		);
		const screen = await render(tree(first));
		try {
			await vi.waitFor(() => expect(iab.handles.has(first)).toBe(true));

			await screen.rerender(tree(second));
			await vi.waitFor(() => expect(handleOf(second).save).toHaveBeenCalled());
			await saved;

			expect(handleOf(first).acceptAll).not.toHaveBeenCalled();
			expect(handleOf(first).save).not.toHaveBeenCalled();
			expect(handleOf(second).acceptAll).toHaveBeenCalledOnce();
			expect(handleOf(second).save).toHaveBeenCalledOnce();
		} finally {
			screen.unmount();
		}
	});

	test('actions taken right after switching back to an earlier kernel reach its new handle', async () => {
		const first = createKernel();
		const second = createKernel();
		let saved: Promise<void> | undefined;
		// Act only on the return to the first kernel, which the provider
		// already tore a handle down for once.
		const onSwitch = (state: ReactIABState, kernel: ConsentKernel) => {
			if (kernel === first) {
				state.acceptAll();
				saved = state.save();
			}
		};
		const tree = (kernel: ConsentKernel) => (
			<KernelContext.Provider value={kernel}>
				<IABProvider cmpId={42}>
					<SwitchActor onSwitch={onSwitch} />
				</IABProvider>
			</KernelContext.Provider>
		);
		const screen = await render(tree(first));
		try {
			await vi.waitFor(() => expect(iab.handles.has(first)).toBe(true));
			const original = handleOf(first);
			await screen.rerender(tree(second));
			await vi.waitFor(() => expect(iab.handles.has(second)).toBe(true));

			await screen.rerender(tree(first));
			await vi.waitFor(() => expect(handleOf(first)).not.toBe(original));
			await expect(saved).resolves.toBeUndefined();

			const reselected = handleOf(first);
			expect(reselected.acceptAll).toHaveBeenCalledOnce();
			expect(reselected.save).toHaveBeenCalledOnce();
			expect(original.acceptAll).not.toHaveBeenCalled();
			expect(original.save).not.toHaveBeenCalled();
			expect(handleOf(second).acceptAll).not.toHaveBeenCalled();
			expect(handleOf(second).save).not.toHaveBeenCalled();
		} finally {
			screen.unmount();
		}
	});

	test('never publishes the previous handle and aborts actions left on the previous kernel', async () => {
		const first = createKernel();
		const second = createKernel();
		const renders: {
			kernel: ConsentKernel | null;
			handle: unknown;
		}[] = [];
		let run: IABContextValue['run'];
		const onRender = (
			kernel: ConsentKernel | null,
			value: IABContextValue | null
		) => {
			renders.push({ handle: value?.handle ?? null, kernel });
			if (kernel === first) {
				run = value?.run;
			}
		};
		const tree = (kernel: ConsentKernel) => (
			<KernelContext.Provider value={kernel}>
				<IABProvider cmpId={42}>
					<ContextProbe onRender={onRender} />
				</IABProvider>
			</KernelContext.Provider>
		);
		const screen = await render(tree(first));
		try {
			await vi.waitFor(() =>
				expect(renders.at(-1)?.handle).toBe(handleOf(first))
			);
			const staleRun = run;

			await screen.rerender(tree(second));
			await vi.waitFor(() =>
				expect(renders.at(-1)?.handle).toBe(handleOf(second))
			);

			// (a) No render pairs a kernel with another kernel's handle.
			const mismatched = renders.filter(
				(entry) =>
					entry.handle !== null &&
					entry.handle !== iab.handles.get(entry.kernel)
			);
			expect(mismatched).toEqual([]);

			// (b) A save still addressed to the first kernel, after its handle
			// was disposed, is aborted rather than recorded anywhere.
			await expect(staleRun?.((handle) => handle.save())).rejects.toMatchObject(
				{ name: 'AbortError' }
			);
			expect(handleOf(first).save).not.toHaveBeenCalled();
			expect(handleOf(second).save).not.toHaveBeenCalled();
			expect(handleOf(first).dispose).toHaveBeenCalledOnce();
		} finally {
			screen.unmount();
		}
	});

	test('a useIAB result kept from before the switch cannot act on either kernel', async () => {
		const first = createKernel();
		const second = createKernel();
		let latest: { kernel: ConsentKernel | null; state: ReactIABState | null } =
			{ kernel: null, state: null };
		const onState = (
			kernel: ConsentKernel | null,
			state: ReactIABState | null
		) => {
			latest = { kernel, state };
		};
		let retained: ReactIABState | null = null;
		let duringCommit: Promise<void> | undefined;
		// A descendant layout effect in the switch commit, before any passive
		// effect of that commit has run, calls the kept result.
		const onSwitch = () => {
			retained?.acceptAll();
			duringCommit = retained?.save();
		};
		const tree = (kernel: ConsentKernel) => (
			<KernelContext.Provider value={kernel}>
				<IABProvider cmpId={42}>
					<StateProbe onState={onState} />
					<SwitchActor onSwitch={onSwitch} />
				</IABProvider>
			</KernelContext.Provider>
		);
		const screen = await render(tree(first));
		try {
			// Wait for a render on the first kernel with its handle published,
			// so the kept result would act on that handle directly.
			await vi.waitFor(() => expect(iab.handles.has(first)).toBe(true));
			await screen.rerender(tree(first));
			retained = latest.state;
			expect(latest.kernel).toBe(first);
			retained?.acceptAll();
			expect(handleOf(first).acceptAll).toHaveBeenCalledOnce();
			handleOf(first).acceptAll.mockClear();

			await screen.rerender(tree(second));
			await vi.waitFor(() => expect(iab.handles.has(second)).toBe(true));

			await expect(duringCommit).rejects.toMatchObject({ name: 'AbortError' });
			retained?.acceptAll();
			retained?.setPurposeConsent(1, true);
			await expect(retained?.save()).rejects.toMatchObject({
				name: 'AbortError',
			});

			for (const handle of [handleOf(first), handleOf(second)]) {
				expect(handle.acceptAll).not.toHaveBeenCalled();
				expect(handle.setPurposeConsent).not.toHaveBeenCalled();
				expect(handle.save).not.toHaveBeenCalled();
			}
		} finally {
			screen.unmount();
		}
	});
});

/** Resolves to `'pending'` if `promise` has not settled after `ms`. */
const settleWithin = function settleWithin(
	promise: Promise<void> | undefined,
	ms = 200
): Promise<unknown> {
	const outcome = async () => {
		try {
			await promise;
			return 'resolved';
		} catch (error) {
			return error;
		}
	};
	return Promise.race([
		outcome(),
		new Promise((resolve) => {
			setTimeout(() => resolve('pending'), ms);
		}),
	]);
};

/** Calls `onAct` from a layout effect on mount and on every kernel change. */
const LayoutActor = ({
	onAct,
}: {
	onAct: (state: ReactIABState, kernel: ConsentKernel) => void;
}) => {
	const kernel = useContext(KernelContext);
	const state = useIAB();
	const last = useRef<ConsentKernel | null>(null);
	useLayoutEffect(() => {
		if (state && kernel && last.current !== kernel) {
			last.current = kernel;
			onAct(state, kernel);
		}
	});
	return null;
};

/**
 * An IABProvider that its child can remove from inside a layout effect,
 * before the provider's passive effects run for that commit. `onAct`
 * returns whether to remove it.
 */
const RemovableProvider = ({
	kernel,
	onAct,
}: {
	kernel: ConsentKernel;
	onAct: (state: ReactIABState, kernel: ConsentKernel) => boolean;
}) => {
	const [open, setOpen] = useState(true);
	return open ? (
		<KernelContext.Provider value={kernel}>
			<IABProvider cmpId={42}>
				<LayoutActor
					onAct={(state, current) => {
						if (onAct(state, current)) {
							setOpen(false);
						}
					}}
				/>
			</IABProvider>
		</KernelContext.Provider>
	) : null;
};

interface BoundaryProps {
	children: ReactNode;
}

/** Catches the provider's start-up failure so it unmounts cleanly. */
class Boundary extends Component<BoundaryProps, { failed: boolean }> {
	constructor(props: BoundaryProps) {
		super(props);
		this.state = { failed: false };
	}

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override render() {
		return this.state.failed ? null : this.props.children;
	}
}

// React flushes a commit's passive effects before it renders the next
// update, so a provider removed from a layout effect still creates its
// handle and runs the queued action first. These two tests lock that in:
// the action settles against the handle of the kernel it was taken for.
describe('IABProvider unmount', () => {
	test('an action queued on mount settles when the provider is removed right away', async () => {
		const first = createKernel();
		let saved: Promise<void> | undefined;
		const screen = await render(
			<RemovableProvider
				kernel={first}
				onAct={(state) => {
					saved = state.save();
					return true;
				}}
			/>
		);
		try {
			expect(await settleWithin(saved)).toBe('resolved');
			expect(handleOf(first).save).toHaveBeenCalledOnce();
		} finally {
			screen.unmount();
		}
	});

	test('an action queued mid-switch settles on the new kernel when the provider is removed', async () => {
		const first = createKernel();
		const second = createKernel();
		let saved: Promise<void> | undefined;
		const onAct = (state: ReactIABState, kernel: ConsentKernel) => {
			if (kernel !== second) {
				return false;
			}
			saved = state.save();
			return true;
		};
		const screen = await render(
			<RemovableProvider
				kernel={first}
				onAct={onAct}
			/>
		);
		try {
			await vi.waitFor(() => expect(iab.handles.has(first)).toBe(true));
			await screen.rerender(
				<RemovableProvider
					kernel={second}
					onAct={onAct}
				/>
			);

			expect(await settleWithin(saved)).toBe('resolved');
			expect(handleOf(first).save).not.toHaveBeenCalled();
			expect(handleOf(second).save).toHaveBeenCalledOnce();
		} finally {
			screen.unmount();
		}
	});

	test('rejects queued actions when the provider unmounts without ever creating a handle', async () => {
		const first = createKernel();
		iab.failing.add(first);
		let saved: Promise<void> | undefined;
		const onAct = (state: ReactIABState) => {
			saved = state.save();
			return false;
		};
		vi.spyOn(console, 'error').mockImplementation(() => {
			// React reports the start-up failure the boundary catches.
		});
		const screen = await render(
			<Boundary>
				<RemovableProvider
					kernel={first}
					onAct={onAct}
				/>
			</Boundary>
		);
		try {
			expect(await settleWithin(saved)).toMatchObject({ name: 'AbortError' });
			expect(iab.created).toEqual([]);
		} finally {
			screen.unmount();
		}
	});

	test('keeps an action queued on mount through StrictMode effect replay', async () => {
		const first = createKernel();
		let saved: Promise<void> | undefined;
		const screen = await render(
			<StrictMode>
				<RemovableProvider
					kernel={first}
					onAct={(state) => {
						saved ??= state.save();
						return false;
					}}
				/>
			</StrictMode>
		);
		try {
			// StrictMode replays the provider's cleanup and setup. The action
			// must survive that replay and run exactly once.
			expect(await settleWithin(saved)).toBe('resolved');
			const saves = iab.created.flatMap((handle) => handle.save?.mock.calls);
			expect(saves).toHaveLength(1);
		} finally {
			screen.unmount();
		}
	});
});
