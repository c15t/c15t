import type { ConsentRuntime } from '@c15t/core/runtime';
import { createConsentRuntime } from '@c15t/core/runtime';
import { Activity, StrictMode, useLayoutEffect } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ExternalIABProvider } from '../external-iab-context';
import { useIAB } from '../iab-context';
import type { ReactIABState } from '../iab-context';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const Probe = ({ onReady }: { onReady: (iab: ReactIABState) => void }) => {
	const iab = useIAB();
	useLayoutEffect(() => {
		if (iab) {
			onReady(iab);
		}
	}, [iab, onReady]);
	return null;
};
const BridgeProbe = ({
	runtime,
	onReady,
}: {
	runtime: ConsentRuntime;
	onReady: (iab: ReactIABState) => void;
}) => (
	<KernelContext.Provider value={runtime.kernel}>
		<ExternalIABProvider runtime={runtime}>
			<Probe onReady={onReady} />
		</ExternalIABProvider>
	</KernelContext.Provider>
);

const fixture = () => {
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
	const runtime = createConsentRuntime({
		createIAB: () => handle,
		iab: { cmpId: 42 },
		mode: offline(),
		persistence: false,
		prefetch: {
			...policyFixture({}, { model: 'iab' }),
			initialIab: { cmpId: 42, enabled: true },
		},
	});
	return { handle, runtime };
};

test.each(['acceptAll', 'rejectAll', 'save'] as const)(
	'replays %s after the external runtime publishes its handle',
	async (method) => {
		const { handle, runtime } = fixture();
		let actionResult: void | Promise<void>;
		let requested = false;
		const onReady = (iab: ReactIABState) => {
			if (!requested) {
				requested = true;
				actionResult = iab[method]();
			}
		};
		const screen = await render(
			<ConsentProvider runtime={runtime}>
				<Probe onReady={onReady} />
			</ConsentProvider>
		);
		try {
			expect(requested).toBe(true);
			expect(runtime.iab).toBeNull();
			expect(handle[method]).not.toHaveBeenCalled();
			runtime.start();
			await vi.waitFor(() => expect(handle[method]).toHaveBeenCalledOnce());
			await actionResult;
			expect(handle[method]).toHaveBeenCalledOnce();
		} finally {
			screen.unmount();
			runtime.dispose();
		}
	}
);

test('propagates save errors and runs ready actions', async () => {
	const { handle, runtime } = fixture();
	handle.save.mockRejectedValueOnce(new Error('save failed'));
	let iab: ReactIABState | undefined;
	const onReady = (value: ReactIABState) => {
		iab = value;
	};
	const screen = await render(
		<ConsentProvider runtime={runtime}>
			<Probe onReady={onReady} />
		</ConsentProvider>
	);
	try {
		if (!iab) {
			throw new Error('Missing IAB state');
		}
		const saved = expect(iab.save()).rejects.toThrow('save failed');
		runtime.start();
		await saved;
		iab.acceptAll();
		await iab.save();
		expect(handle.acceptAll).toHaveBeenCalledOnce();
		expect(handle.save).toHaveBeenCalledTimes(2);
	} finally {
		screen.unmount();
		runtime.dispose();
	}
});

test.each(['unmount', 'replace'] as const)(
	'aborts queued saves on provider %s',
	async (operation) => {
		const first = fixture();
		const second = fixture();
		let iab: ReactIABState | undefined;
		const onReady = (value: ReactIABState) => {
			iab = value;
		};
		const screen = await render(
			<BridgeProbe
				runtime={first.runtime}
				onReady={onReady}
			/>
		);
		try {
			if (!iab) {
				throw new Error('Missing IAB state');
			}
			const initialIAB = iab;
			const saved = expect(iab.save()).rejects.toMatchObject({
				name: 'AbortError',
			});
			// Void actions must not create unhandled rejections during teardown.
			iab.acceptAll();
			if (operation === 'unmount') {
				screen.unmount();
			} else {
				await screen.rerender(
					<BridgeProbe
						runtime={second.runtime}
						onReady={onReady}
					/>
				);
			}
			await saved;
			await expect(initialIAB.save()).rejects.toMatchObject({
				name: 'AbortError',
			});
			first.runtime.start();
			second.runtime.start();
			expect(first.handle.save).not.toHaveBeenCalled();
			expect(first.handle.acceptAll).not.toHaveBeenCalled();
			expect(second.handle.save).not.toHaveBeenCalled();
		} finally {
			if (operation !== 'unmount') {
				screen.unmount();
			}
			first.runtime.dispose();
			second.runtime.dispose();
		}
	}
);

test('keeps pending actions through StrictMode effect replay', async () => {
	const { runtime, handle } = fixture();
	let saved: Promise<void> | undefined;
	const onReady = (iab: ReactIABState) => {
		saved ??= iab.save();
	};
	const screen = await render(
		<StrictMode>
			<ConsentProvider runtime={runtime}>
				<Probe onReady={onReady} />
			</ConsentProvider>
		</StrictMode>
	);
	try {
		expect(saved).toBeDefined();
		await new Promise(requestAnimationFrame);
		runtime.start();
		await saved;
		expect(handle.save).toHaveBeenCalledOnce();
	} finally {
		screen.unmount();
		runtime.dispose();
	}
});

test('accepts new actions after a hidden provider resumes', async () => {
	const { runtime, handle } = fixture();
	let iab: ReactIABState | undefined;
	const onReady = (value: ReactIABState) => {
		iab = value;
	};
	const tree = (mode: 'visible' | 'hidden') => (
		<Activity mode={mode}>
			<BridgeProbe
				runtime={runtime}
				onReady={onReady}
			/>
		</Activity>
	);
	const screen = await render(tree('visible'));
	try {
		if (!iab) {
			throw new Error('Missing IAB state');
		}
		const cancelled = expect(iab.save()).rejects.toMatchObject({
			name: 'AbortError',
		});
		await screen.rerender(tree('hidden'));
		await cancelled;
		await screen.rerender(tree('visible'));
		const resumed = iab.save();
		runtime.start();
		await resumed;
		expect(handle.save).toHaveBeenCalledOnce();
	} finally {
		screen.unmount();
		runtime.dispose();
	}
});
