import type { ClearOnRevocationConfig, ConsentKernel } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import type * as ScriptLoaderModule from '@c15t/core/modules/script-loader';
import { useContext, useEffect } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const loaderStarts = vi.hoisted(() => ({ count: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when the provider starts the script loader. The test server does not split chunks, so count starts and run the real loader.
vi.mock('@c15t/core/modules/script-loader', async (importOriginal) => {
	const original = await importOriginal<typeof ScriptLoaderModule>();
	return {
		...original,
		createScriptLoader: (
			options: Parameters<typeof original.createScriptLoader>[0]
		) => {
			loaderStarts.count += 1;
			return original.createScriptLoader(options);
		},
	};
});

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
	expect(loaderStarts.count).toBe(0);

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
	expect(loaderStarts.count).toBe(1);
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
	expect(loaderStarts.count).toBe(1);
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
