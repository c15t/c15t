import type { ConsentKernel } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import type * as IABModule from '@c15t/iab';
import { useContext, useLayoutEffect, useRef } from 'react';
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
	handles: new Map<unknown, Record<string, ReturnType<typeof vi.fn>>>(),
}));

// IABProvider imports createIAB itself and offers no injection point. Replace
// only that factory with one fake CMP per kernel, so a test can tell which
// runtime an action reached; the rest of the module stays real.
// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock('@c15t/iab', async (importOriginal) => ({
	...(await importOriginal<typeof IABModule>()),
	createIAB: ({ kernel }: { kernel: unknown }) => {
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
	onSwitch: (state: ReactIABState) => void;
}) => {
	const kernel = useContext(KernelContext);
	const state = useIAB();
	const previous = useRef(kernel);
	useLayoutEffect(() => {
		if (previous.current !== kernel && state) {
			previous.current = kernel;
			onSwitch(state);
		}
	}, [kernel, state, onSwitch]);
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
});
