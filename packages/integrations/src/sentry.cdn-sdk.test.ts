/** @vitest-environment jsdom */
import process from 'node:process';

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import * as sentry10 from 'sentry-browser-v10';
import * as sentry11 from 'sentry-browser-v11';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deniedConsents, grantedMeasurementConsents } from './e2e-test-utils';
import { sentry } from './vendors/analytics/sentry';
import type { SentryEnvelope } from './vendors/analytics/sentry';

const processType = Object.getOwnPropertyDescriptor(process, 'type');
const disposers: (() => void | Promise<void>)[] = [];

beforeEach(() => {
	Object.defineProperty(process, 'type', {
		configurable: true,
		value: 'renderer',
	});
	vi.useFakeTimers();
});

afterEach(async () => {
	vi.useRealTimers();
	await Promise.all(
		disposers
			.splice(0)
			.reverse()
			.map((dispose) => dispose())
	);
	vi.restoreAllMocks();
	if (processType) {
		Object.defineProperty(process, 'type', processType);
	} else {
		Reflect.deleteProperty(process, 'type');
	}
	Reflect.deleteProperty(window, 'Sentry');
	document.head.innerHTML = '';
	sessionStorage.clear();
});

describe.each([
	{
		sdk: { ...sentry10, getClient: () => sentry10.getClient() },
		version: '10.67.0',
	},
	{
		sdk: { ...sentry11, getClient: () => sentry11.getClient() },
		version: '11.4.0',
	},
])('Sentry $version CDN replacement with the real SDK', ({ sdk, version }) => {
	it('moves the single Replay to changed clients and preserves consent guards', async () => {
		const onError = vi.fn();
		const replayIntegration = vi.fn(sdk.replayIntegration);
		Object.assign(window, { Sentry: { ...sdk, replayIntegration } });
		const observer = new MutationObserver((records) => {
			for (const node of records.flatMap((record) => [...record.addedNodes])) {
				if (
					node instanceof HTMLScriptElement &&
					node.src.startsWith('https://browser.sentry-cdn.com/')
				) {
					node.dispatchEvent(new Event('load'));
				}
			}
		});
		observer.observe(document, { childList: true, subtree: true });
		disposers.push(async () => {
			observer.disconnect();
			await sdk.close();
			sdk.getCurrentScope().setClient(undefined);
		});

		const envelopes = new Map<string, SentryEnvelope[]>();
		const configuration = (release: string, project: number) => {
			const sent: SentryEnvelope[] = [];
			envelopes.set(release, sent);
			return sentry({
				dsn: `https://key@example.ingest.sentry.io/${project}`,
				initOptions: {
					defaultIntegrations: [],
					release,
					replaysOnErrorSampleRate: 0,
					replaysSessionSampleRate: 1,
					sendClientReports: false,
					skipBrowserExtensionCheck: true,
					transport: () => ({
						flush: () => Promise.resolve(true),
						send(envelope: SentryEnvelope) {
							sent.push(structuredClone(envelope));
							return Promise.resolve({ statusCode: 200 });
						},
					}),
				},
				onError,
				replay: {
					options: {
						flushMaxDelay: 100_000,
						flushMinDelay: 100_000,
						maskAllText: release === 'before',
						minReplayDuration: 0,
						useCompression: false,
					},
				},
				version,
			});
		};
		const mount = async (release: string, project: number) => {
			const kernel = createConsentKernel();
			await kernel.commands.save(grantedMeasurementConsents);
			const loader = createScriptLoader({
				kernel,
				scripts: [configuration(release, project)],
			});
			disposers.push(() => {
				loader.dispose();
				kernel.dispose();
			});
			await vi.advanceTimersByTimeAsync(3000);
			return { kernel, loader };
		};

		const first = await mount('before', 1);
		const previous = sdk.getClient();
		const replay = sdk.getReplay();
		if (!replay) {
			throw new Error('Replay did not load');
		}
		expect(replay.getRecordingMode()).toBe('session');

		const second = await mount('after', 2);
		expect(onError).not.toHaveBeenCalled();
		expect(sdk.getClient()).not.toBe(previous);
		expect(sdk.getClient()?.getDsn()?.projectId).toBe('2');
		expect(sdk.getReplay()).toBe(replay);
		expect(replayIntegration).toHaveBeenCalledOnce();
		expect(replay.getRecordingMode()).toBe('session');
		const errorId = sdk.captureEvent({ message: 'new-client-error' });
		const flushing = sdk.flush();
		await vi.advanceTimersByTimeAsync(100);
		await flushing;
		await replay.flush();
		const recording = envelopes
			.get('after')
			?.find((envelope) =>
				envelope[1].some(([header]) => header.type === 'replay_recording')
			);
		expect(recording).toBeDefined();
		const replayEvent = envelopes
			.get('after')
			?.flatMap((envelope) => envelope[1])
			.find(([header]) => header.type === 'replay_event')?.[1];
		expect(replayEvent).toMatchObject({ error_ids: [errorId] });
		expect(envelopes.get('before')).toEqual([]);

		await second.kernel.commands.save(deniedConsents);
		await vi.advanceTimersByTimeAsync(0);
		expect(replay.getRecordingMode()).toBeUndefined();
		replay.start();
		await replay.flush();
		expect(replay.getRecordingMode()).toBeUndefined();
		await second.kernel.commands.save(grantedMeasurementConsents);
		await vi.advanceTimersByTimeAsync(3000);
		expect(replay.getRecordingMode()).toBe('session');
		first.loader.dispose();
		expect(replay.getRecordingMode()).toBe('session');

		second.loader.updateScripts([configuration('replacement', 3)]);
		await vi.advanceTimersByTimeAsync(3000);
		expect(onError).not.toHaveBeenCalled();
		expect(sdk.getClient()?.getDsn()?.projectId).toBe('3');
		expect(sdk.getReplay()).toBe(replay);
		expect(replayIntegration).toHaveBeenCalledOnce();
		expect(replay.getRecordingMode()).toBe('session');
		await replay.flush();
		expect(
			envelopes
				.get('replacement')
				?.some((envelope) =>
					envelope[1].some(([header]) => header.type === 'replay_recording')
				)
		).toBe(true);
		second.loader.dispose();
		await vi.advanceTimersByTimeAsync(0);
		expect(replay.getRecordingMode()).toBeUndefined();
		replay.startBuffering();
		await replay.flush();
		expect(replay.getRecordingMode()).toBeUndefined();
	});
});
