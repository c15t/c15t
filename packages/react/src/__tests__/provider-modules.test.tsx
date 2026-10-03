import type { ClearOnRevocationConfig, ConsentKernel } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import { useContext, useEffect } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const scriptModuleRequests = () =>
	performance
		.getEntriesByType('resource')
		.filter(({ name }) =>
			name.includes('/core/src/modules/script-loader/index.ts')
		);

let kernel: ConsentKernel;
const Capture = () => {
	const value = useContext(KernelContext);
	useEffect(() => {
		if (value) {
			kernel = value;
		}
	}, [value]);
	return null;
};

afterEach(() => {
	for (const key of [
		'cleanup:ready',
		'analytics:visitor',
		'analytics:replacement',
	]) {
		localStorage.removeItem(key);
	}
});

test('loads scripts only when added and preserves cleanup ordering and initial config', async () => {
	// Vite's module graph can fill the browser's default resource buffer.
	performance.setResourceTimingBufferSize(5000);
	performance.clearResourceTimings();
	const initialCleanup: ClearOnRevocationConfig = {
		marketing: { localStorage: ['cleanup:ready'] },
		measurement: { localStorage: ['analytics:visitor'] },
	};
	const replacementCleanup: ClearOnRevocationConfig = {
		measurement: { localStorage: ['analytics:replacement'] },
	};
	const mode = offline();
	const prefetch = policyFixture({ measurement: true });
	const provider = (scripts: Script[], clearOnRevocation = initialCleanup) => (
		<ConsentProvider
			options={{
				clearOnRevocation,
				mode,
				persistence: false,
				prefetch,
				scripts,
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	localStorage.setItem('cleanup:ready', 'pending');
	const screen = await render(provider([]));
	await vi.waitFor(() =>
		expect(localStorage.getItem('cleanup:ready')).toBeNull()
	);
	expect(scriptModuleRequests()).toHaveLength(0);

	const onBeforeLoad = vi.fn();
	const onConsentChange = vi.fn(({ hasConsent }: { hasConsent: boolean }) => {
		if (!hasConsent) {
			localStorage.setItem('analytics:visitor', 'written during shutdown');
		}
	});
	const scripts: Script[] = [
		{
			callbackOnly: true,
			category: 'measurement',
			id: 'late-cleanup-script',
			onBeforeLoad,
			onConsentChange,
		},
	];
	localStorage.setItem('cleanup:ready', 'pending');
	await screen.rerender(provider(scripts, replacementCleanup));
	await vi.waitFor(() => expect(onBeforeLoad).toHaveBeenCalledOnce());
	// Starting the first loader reattaches cleanup after its subscription.
	// The new attachment performs its initial denied-category sweep.
	await vi.waitFor(() =>
		expect(localStorage.getItem('cleanup:ready')).toBeNull()
	);
	expect(scriptModuleRequests()).toHaveLength(1);
	localStorage.setItem('analytics:visitor', 'visitor');
	localStorage.setItem('analytics:replacement', 'keep');
	await kernel.commands.save({ measurement: false });
	expect(onConsentChange).toHaveBeenCalledWith(
		expect.objectContaining({ hasConsent: false })
	);
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
	expect(localStorage.getItem('analytics:replacement')).toBe('keep');

	await kernel.commands.save({ measurement: true });
	expect(onBeforeLoad).toHaveBeenCalledTimes(2);
	localStorage.setItem('cleanup:ready', 'keep until a new denial');
	await screen.rerender(provider([], replacementCleanup));
	expect(localStorage.getItem('cleanup:ready')).toBe('keep until a new denial');
	await kernel.commands.save({ measurement: false });
	await kernel.commands.save({ measurement: true });
	expect(onBeforeLoad).toHaveBeenCalledTimes(2);
	await screen.rerender(provider(scripts, replacementCleanup));
	await vi.waitFor(() => expect(onBeforeLoad).toHaveBeenCalledTimes(3));
	expect(scriptModuleRequests()).toHaveLength(1);
	await screen.rerender(
		<ConsentProvider options={{ mode, persistence: false, prefetch, scripts }}>
			<Capture />
		</ConsentProvider>
	);
	localStorage.setItem('analytics:visitor', 'visitor');
	await kernel.commands.save({ measurement: false });
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
	await screen.unmount();
});
