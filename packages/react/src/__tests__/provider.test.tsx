import type { ConsentKernel } from '@c15t/core';
import { resolveStorageKeys } from '@c15t/core/modules/persistence';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { useContext, useEffect, StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentBanner } from '../components/consent-banner';
import { KernelContext } from '../context';
import { custom, offline } from '../index';
import { ConsentProvider } from '../provider';
import { useUIConfig } from '../ui-config-context';
import { policyFixture } from './policy-fixture';

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
afterEach(() => vi.restoreAllMocks());

test('offline rules resolve after mount and expose canonical state', async () => {
	const screen = await render(
		<ConsentProvider
			options={{
				mode: offline({
					policyRules: [
						{
							id: 'local',
							match: { fallback: true },
							model: 'opt-in',
							prompt: 'choice',
						},
					],
				}),
				persistence: false,
			}}
		>
			<Capture />
			<ConsentBanner />
		</ConsentProvider>
	);
	await expect
		.element(screen.getByTestId('consent-banner-accept-button'))
		.toBeVisible();
	expect(kernel.getSnapshot().policyRule.id).toBe('local');
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
});

test('unconfigured offline mode retains safe opt-in permissions without inventing a choice', async () => {
	await render(
		<ConsentProvider options={{ mode: offline(), persistence: false }}>
			<Capture />
			<ConsentBanner />
		</ConsentProvider>
	);
	expect(kernel.getSnapshot().resolution.status).toBe('unconfigured');
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
});

test('failed initialization keeps the first layer hidden and reports the error', async () => {
	const onError = vi.fn();
	await render(
		<ConsentProvider
			options={{
				callbacks: { onError },
				mode: custom({ init: () => Promise.reject(new Error('offline')) }),
				persistence: false,
			}}
		>
			<Capture />
			<ConsentBanner />
		</ConsentProvider>
	);
	await vi.waitFor(() => expect(onError).toHaveBeenCalled());
	expect(
		document.querySelector('[data-testid="consent-banner-root"]')
	).toBeNull();
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
});

test('keeps the kernel across rerenders and synchronizes identity and geographic overrides', async () => {
	const prepared = policyFixture();
	const init = vi.fn(() =>
		Promise.resolve({
			policyResolution: writePolicyResolutionWire(
				prepared.initialPolicyResolution ?? {
					policy: null,
					status: 'unconfigured',
				}
			),
		})
	);
	const mode = custom({ init });
	const screen = await render(
		<ConsentProvider
			options={{
				mode,
				overrides: { country: 'DE' },
				persistence: false,
				prefetch: prepared,
				user: { externalId: 'first' },
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	const first = kernel;
	await screen.rerender(
		<ConsentProvider
			options={{
				mode,
				overrides: { country: 'FR' },
				persistence: false,
				prefetch: prepared,
				user: { externalId: 'second' },
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	expect(kernel).toBe(first);
	expect(kernel.getSnapshot().user?.externalId).toBe('second');
	expect(kernel.getSnapshot().overrides.country).toBe('FR');
	await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
});

test('disposes the kernel on unmount', async () => {
	const screen = await render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	const dispose = vi.spyOn(kernel, 'dispose');
	await screen.unmount();
	await vi.waitFor(() => expect(dispose).toHaveBeenCalledTimes(1));
});

test('disabled mode skips initialization and grants defaults without recording choice', async () => {
	const init = vi.fn();
	await render(
		<ConsentProvider
			options={{ enabled: false, mode: custom({ init }), persistence: false }}
		>
			<Capture />
			<ConsentBanner />
		</ConsentProvider>
	);
	expect(init).not.toHaveBeenCalled();
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(
		document.querySelector('[data-testid="consent-banner-root"]')
	).toBeNull();
});

test('prepared receipts remain authoritative when persistence is disabled', async () => {
	await render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture({ marketing: true }),
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		true
	);
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
});

test('separates explicit actions from effective permission changes', async () => {
	const onChoiceRecorded = vi.fn();
	const onPermissionsChanged = vi.fn();
	const save = vi.fn(() => Promise.resolve({ ok: true }));
	await render(
		<ConsentProvider
			options={{
				callbacks: { onChoiceRecorded, onPermissionsChanged },
				mode: custom({ save }),
				persistence: false,
				prefetch: policyFixture(),
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	expect(onChoiceRecorded).not.toHaveBeenCalled();
	await kernel.commands.save({ marketing: true });
	expect(onChoiceRecorded).toHaveBeenCalledTimes(1);
	expect(onPermissionsChanged).toHaveBeenCalledTimes(1);
	await kernel.commands.save({ marketing: true });
	expect(onChoiceRecorded).toHaveBeenCalledTimes(2);
	expect(onPermissionsChanged).toHaveBeenCalledTimes(1);
	expect(save).toHaveBeenCalledTimes(2);
});

test('uses current callback props without replacing the kernel', async () => {
	const first = vi.fn();
	const second = vi.fn();
	const mode = offline();
	const prefetch = policyFixture();
	const screen = await render(
		<ConsentProvider
			options={{
				callbacks: { onChoiceRecorded: first },
				mode,
				persistence: false,
				prefetch,
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	await screen.rerender(
		<ConsentProvider
			options={{
				callbacks: { onChoiceRecorded: second },
				mode,
				persistence: false,
				prefetch,
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	await kernel.commands.save('none');
	expect(first).not.toHaveBeenCalled();
	expect(second).toHaveBeenCalledTimes(1);
});

test('passes host presentation through UI context', async () => {
	const Probe = () => (
		<output data-testid="presentation">
			{useUIConfig().presentation?.prompt?.direction}
		</output>
	);
	const screen = await render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
				presentation: { prompt: { direction: 'column' } },
			}}
		>
			<Probe />
		</ConsentProvider>
	);
	await expect
		.element(screen.getByTestId('presentation'))
		.toHaveTextContent('column');
});

test('merges selected i18n messages with English defaults', async () => {
	await render(
		<ConsentProvider
			options={{
				i18n: {
					locale: 'en',
					messages: { en: { cookieBanner: { title: 'Your privacy' } } },
				},
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	expect(
		kernel.getSnapshot().translations?.translations.cookieBanner.title
	).toBe('Your privacy');
	expect(
		kernel.getSnapshot().translations?.translations.common.acceptAll
	).toBeTruthy();
});

test('StrictMode remount keeps persistence subscriptions active', async () => {
	const key = 'react-strict-persistence';
	const screen = await render(
		<StrictMode>
			<ConsentProvider
				options={{
					mode: offline(),
					prefetch: policyFixture(),
					storageConfig: { storageKey: key },
				}}
			>
				<Capture />
			</ConsentProvider>
		</StrictMode>
	);
	await kernel.commands.save({ marketing: true });
	await vi.waitFor(() =>
		expect(
			localStorage.getItem(resolveStorageKeys({ storageKey: key }).consent)
		).not.toBeNull()
	);
	await screen.unmount();
});
