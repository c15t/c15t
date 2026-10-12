/** @vitest-environment jsdom */
import process from 'node:process';

import { createConsentKernel } from '@c15t/core';
import type { ConsentState } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import * as sentry10 from 'sentry-browser-v10';
import * as sentry11 from 'sentry-browser-v11';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deniedConsents, grantedMeasurementConsents } from './e2e-test-utils';
import { sentry } from './vendors/analytics/sentry';
import type {
	SentryClient,
	SentryEnvelope,
	SentrySdkOptions,
} from './vendors/analytics/sentry';

type BrowserSdk = Omit<typeof sentry10 | typeof sentry11, 'getClient'> & {
	getClient: () =>
		| ReturnType<typeof sentry10.getClient>
		| ReturnType<typeof sentry11.getClient>;
};
const sdkVersions = [
	{
		sdk: { ...sentry10, getClient: () => sentry10.getClient() },
		version: '10.67.0',
	},
	{
		sdk: { ...sentry11, getClient: () => sentry11.getClient() },
		version: '11.4.0',
	},
];
const disposers: (() => void | Promise<void>)[] = [];
const privateUrl = '/account?email=visitor@example.test#secret';
const processType = Object.getOwnPropertyDescriptor(process, 'type');

beforeEach(() => {
	// Sentry's browser check supports Electron renderer processes. Use that
	// detection in jsdom so its actual recorder runs instead of becoming a no-op.
	Object.defineProperty(process, 'type', {
		configurable: true,
		value: 'renderer',
	});
});

afterEach(async () => {
	vi.useRealTimers();
	await Promise.all(
		disposers
			.splice(0)
			.reverse()
			.map((dispose) => dispose())
	);
	if (processType) {
		Object.defineProperty(process, 'type', processType);
	} else {
		Reflect.deleteProperty(process, 'type');
	}
	vi.restoreAllMocks();
	sessionStorage.clear();
	history.replaceState({}, '', '/');
});

/** Exercise the public loader and capture actual SDK envelopes without network I/O. */
const mountSdk = async (
	sdk: BrowserSdk,
	options: Partial<SentrySdkOptions> & { afterInit?: () => void } = {},
	consents: ConsentState = deniedConsents
) => {
	const { afterInit, initOptions, ...scriptOptions } = options;
	sdk.setUser(null);
	sdk.getCurrentScope().clearBreadcrumbs();
	sdk.getIsolationScope().clearBreadcrumbs();
	const envelopes: SentryEnvelope[] = [];
	const kernel = createConsentKernel();
	await kernel.commands.save(consents);
	const initialization = {
		dsn: 'https://key@example.ingest.sentry.io/1',
		sendClientReports: false,
		skipBrowserExtensionCheck: true,
		transport: () => ({
			flush: () => Promise.resolve(true),
			send(envelope: SentryEnvelope) {
				envelopes.push(structuredClone(envelope));
				return Promise.resolve({ statusCode: 200 });
			},
		}),
		...initOptions,
	};
	const script = sentry({
		getClient: () => sdk.getClient(),
		init: afterInit
			? (protectedOptions) => {
					// Keep the transport even when testing an adapter that fails to
					// supply startup protection, so the regression fails on leaked data.
					sdk.init({ ...initialization, ...protectedOptions });
					afterInit();
				}
			: sdk.init,
		initOptions: initialization,
		setUser: sdk.setUser,
		...scriptOptions,
	});
	const loader = createScriptLoader({ kernel, scripts: [script] });
	disposers.push(async () => {
		loader.dispose();
		kernel.dispose();
		await sdk.close();
		sdk.getCurrentScope().setClient(undefined);
	});
	return { envelopes, kernel, loader };
};

const eventPayloads = (envelopes: SentryEnvelope[]) =>
	envelopes.flatMap((envelope) =>
		envelope[1].flatMap(([header, payload]) =>
			header.type === 'event' ? [payload as Record<string, unknown>] : []
		)
	);

describe.each(sdkVersions)(
	'Sentry $version privacy with the real SDK',
	({ sdk }) => {
		it('protects events captured before the SDK init callback returns', async () => {
			const { envelopes, kernel } = await mountSdk(sdk, {
				afterInit: () => {
					sdk.setUser({ email: 'startup@example.test', id: 'startup-user' });
					sdk.captureEvent({
						message: 'during-init',
						request: {
							headers: { 'X-Private': 'secret' },
							url: `https://app.example.test${privateUrl}`,
						},
					});
				},
			});
			await sdk.flush();
			const startup = eventPayloads(envelopes).find(
				(event) => event.message === 'during-init'
			);
			expect(startup).toBeDefined();
			expect(startup?.user).toBeUndefined();
			expect(startup?.request).toEqual({
				url: 'https://app.example.test/account',
			});
			expect(startup?.sdk).toMatchObject({ settings: { infer_ip: 'never' } });

			await kernel.commands.save(grantedMeasurementConsents);
			sdk.setUser({ id: 'granted-user' });
			sdk.captureEvent({ message: 'after-grant' });
			await sdk.flush();
			expect(
				eventPayloads(envelopes).find(
					(event) => event.message === 'after-grant'
				)
			).toMatchObject({ user: { id: 'granted-user' } });
		});

		it('attaches consent before other integrations run their startup hooks', async () => {
			const collection: unknown[] = [];
			const { envelopes } = await mountSdk(sdk, {
				initOptions: {
					integrations: [
						{
							beforeSetup: () => {
								collection.push(
									sdk.getClient()?.getDataCollectionOptions().userInfo
								);
								sdk.setUser({ id: 'hook-user' });
								sdk.captureEvent({ message: 'startup-hook' });
							},
							name: 'StartupCapture',
						},
					],
				},
			});
			await sdk.flush();
			expect(collection).toEqual([false]);
			expect(
				eventPayloads(envelopes).find(
					(event) => event.message === 'startup-hook'
				)
			).toMatchObject({ sdk: { settings: { infer_ip: 'never' } } });
			expect(
				eventPayloads(envelopes).every((event) => event.user === undefined)
			).toBe(true);
		});

		it('scrubs SDK navigation and HTTP breadcrumbs on denial and withdrawal', async () => {
			const { envelopes, kernel } = await mountSdk(sdk);
			history.pushState({}, '', privateUrl);
			sdk.addBreadcrumb({
				category: 'fetch',
				data: {
					method: 'GET',
					status_code: 200,
					url: '/api?token=private#secret',
				},
				type: 'http',
			});
			sdk.captureEvent({ message: 'denied-navigation' });
			await sdk.flush();
			const denied = eventPayloads(envelopes).find(
				(event) => event.message === 'denied-navigation'
			);
			expect(denied?.breadcrumbs).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						category: 'navigation',
						data: { from: '/', to: '/account' },
					}),
					expect.objectContaining({
						category: 'fetch',
						data: { method: 'GET', status_code: 200, url: '/api' },
					}),
				])
			);

			await kernel.commands.save(grantedMeasurementConsents);
			history.pushState({}, '', '/granted?email=allowed@example.test#token');
			sdk.captureEvent({ message: 'granted-navigation' });
			await sdk.flush();
			expect(
				eventPayloads(envelopes).find(
					(event) => event.message === 'granted-navigation'
				)?.breadcrumbs
			).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						category: 'navigation',
						data: expect.objectContaining({
							to: '/granted?email=allowed@example.test#token',
						}),
					}),
				])
			);

			await kernel.commands.save(deniedConsents);
			sdk.captureEvent({ message: 'after-withdrawal' });
			await sdk.flush();
			const withdrawn = eventPayloads(envelopes).find(
				(event) => event.message === 'after-withdrawal'
			);
			expect(JSON.stringify(withdrawn?.breadcrumbs)).not.toContain('?');
			expect(JSON.stringify(withdrawn?.breadcrumbs)).not.toContain('#');
		});

		it('requires PII permission for Replay and discards recording after its withdrawal', async () => {
			vi.useFakeTimers();
			history.replaceState({}, '', privateUrl);
			const load = vi.fn(() =>
				sdk.replayIntegration({
					flushMaxDelay: 100_000,
					flushMinDelay: 100_000,
					minReplayDuration: 0,
					useCompression: false,
				})
			);
			const { envelopes, kernel } = await mountSdk(
				sdk,
				{
					initOptions: {
						replaysOnErrorSampleRate: 0,
						replaysSessionSampleRate: 1,
					},
					replay: { category: 'functionality', load },
				},
				{ ...deniedConsents, functionality: true }
			);
			await vi.advanceTimersByTimeAsync(3000);
			expect(load).not.toHaveBeenCalled();
			expect(sdk.getReplay()).toBeUndefined();

			await kernel.commands.save({
				...grantedMeasurementConsents,
				functionality: true,
			});
			await vi.advanceTimersByTimeAsync(3000);
			expect(load).toHaveBeenCalledOnce();
			expect(sdk.getReplay()?.getRecordingMode()).toBe('session');
			await sdk.getReplay()?.flush();
			const recording = envelopes.find((envelope) =>
				envelope[1].some(([header]) => header.type === 'replay_recording')
			);
			expect(recording).toBeDefined();
			expect(JSON.stringify(recording)).toContain('email=visitor@example.test');

			await kernel.commands.save({ ...deniedConsents, functionality: true });
			await vi.advanceTimersByTimeAsync(0);
			expect(sdk.getReplay()?.getRecordingMode()).toBeUndefined();
			sdk.getReplay()?.start();
			await sdk.getReplay()?.flush();
			expect(sdk.getReplay()?.getRecordingMode()).toBeUndefined();
			const client: SentryClient | undefined = sdk.getClient();
			const transport = client?.getTransport?.();
			if (!recording || !transport) {
				throw new Error(
					'The granted Replay control did not reach its transport'
				);
			}
			await transport.send(recording);
			expect(envelopes.at(-1)?.[1]).toEqual([]);
		});
	}
);
