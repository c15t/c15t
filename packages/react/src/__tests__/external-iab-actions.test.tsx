import { createConsentRuntime } from '@c15t/core/runtime';
import { useLayoutEffect } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

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

test('propagates a queued save failure and runs actions immediately once ready', async () => {
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
