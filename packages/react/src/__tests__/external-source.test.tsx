import type { ConsentKernel, ConsentState } from '@c15t/core';
import { custom } from '@c15t/core';
import { useContext, useEffect, StrictMode } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { useHasConsentUI, useSetActiveUI } from '../hooks';
import { ConsentProvider } from '../provider';

let kernel: ConsentKernel;
const Controls = () => {
	const value = useContext(KernelContext);
	useEffect(() => {
		if (value) {
			kernel = value;
		}
	}, [value]);
	const setActiveUI = useSetActiveUI();
	const hasUi = useHasConsentUI();
	return (
		<button
			type="button"
			data-native-ui={String(hasUi)}
			onClick={() => setActiveUI('dialog')}
		>
			External preferences
		</button>
	);
};

test('standard React options share external authority, scripts and preferences under StrictMode', async () => {
	let permissions: Partial<ConsentState> | null = null;
	let notify = () => {};
	const detach = vi.fn();
	const openPreferences = vi.fn();
	const source = {
		getPermissions: () => permissions,
		openPreferences,
		subscribe: (listener: () => void) => {
			notify = listener;
			return detach;
		},
	};
	const loaded = vi.fn();
	const removed = vi.fn();
	const script = {
		callbackOnly: true as const,
		category: 'measurement' as const,
		id: 'external-tracker',
		onConsentChange: removed,
		onLoad: loaded,
	};

	const init = vi.fn();
	const recorded = vi.fn();
	const view = await render(
		<StrictMode>
			<ConsentProvider
				options={{
					callbacks: { onChoiceRecorded: recorded },
					consentSource: source,
					iframeBlocker: false,
					mode: custom({ init }),
					scripts: [script],
				}}
			>
				<Controls />
			</ConsentProvider>
		</StrictMode>
	);
	await vi.dynamicImportSettled();
	expect(init).not.toHaveBeenCalled();
	expect(loaded).not.toHaveBeenCalled();
	expect(kernel.getSnapshot().activeUI).toBe('none');
	expect(
		document.querySelector('[data-native-ui]')?.getAttribute('data-native-ui')
	).toBe('false');
	permissions = { measurement: true };
	notify();
	await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
	await view.getByRole('button', { name: 'External preferences' }).click();
	expect(openPreferences).toHaveBeenCalledTimes(1);
	expect(kernel.getSnapshot().activeUI).toBe('none');
	await expect(kernel.commands.save('all')).rejects.toThrow('external CMP');
	permissions = null;
	notify();
	expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
	expect(removed).toHaveBeenLastCalledWith(
		expect.objectContaining({ hasConsent: false })
	);
	expect(recorded).not.toHaveBeenCalled();
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	const before = detach.mock.calls.length;
	await view.unmount();
	expect(detach).toHaveBeenCalledTimes(before + 1);
});
