/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { Script } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deniedConsents, grantedMeasurementConsents } from './e2e-test-utils';
import { sentry } from './vendors/analytics/sentry';
import type {
	SentryClient,
	SentryEvent,
	SentryReplay,
	SentryReplayRecordingMode,
	SentrySdkOptions,
	SentrySession,
} from './vendors/analytics/sentry';

const sessionKey = 'sentryReplaySession';
type Sampling = SentryReplayRecordingMode | false;

/**
 * Follows Sentry Replay 10.67+: sampling runs when the integration is added,
 * stop() turns recording off before it returns and clears the stored session
 * only while recording, and start()/startBuffering() ignore the sample rates.
 */
class FakeReplay implements SentryReplay {
	name = 'Replay';
	enabled = false;
	mode: SentryReplayRecordingMode = 'buffer';
	flushed = 0;

	private readonly sampling: Sampling;

	constructor(sampling: Sampling) {
		this.sampling = sampling;
	}

	setup(): void {
		sessionStorage.setItem(
			sessionKey,
			JSON.stringify({ sampled: this.sampling })
		);
		if (this.sampling) {
			this.enabled = true;
			this.mode = this.sampling;
		}
	}

	start = vi.fn(() => {
		if (!this.enabled) {
			this.enabled = true;
			this.mode = 'session';
		}
	});

	startBuffering = vi.fn(() => {
		if (!this.enabled) {
			this.enabled = true;
			this.mode = 'buffer';
		}
	});

	stop = vi.fn(async (options?: { flush?: boolean }) => {
		if (!this.enabled) {
			return;
		}
		this.enabled = false;
		const flush = options?.flush ?? this.mode === 'session';
		this.mode = 'buffer';
		if (flush) {
			this.flushed += 1;
		}
		await Promise.resolve();
		sessionStorage.removeItem(sessionKey);
	});

	getRecordingMode = (): SentryReplayRecordingMode | undefined =>
		this.enabled ? this.mode : undefined;
}

/**
 * Follows the Sentry browser client: options, data collection and SDK
 * settings are live objects read when an envelope is sent, and
 * `beforeSendSession` hooks run in registration order.
 */
const createClient = ({
	dsn = 'https://key@example.ingest.sentry.io/1',
	enabled,
	userInfo = false,
}: { dsn?: string; enabled?: boolean; userInfo?: boolean } = {}) => {
	const integrations = new Map<string, unknown>();
	const processors: (<EventType extends SentryEvent>(
		event: EventType
	) => EventType)[] = [];
	const sessionHooks: ((session: SentrySession) => void)[] = [
		(session) => {
			if (userInfo) {
				session.ipAddress ??= '{{auto}}';
			}
		},
	];
	const options = { enabled };
	const dataCollection = { userInfo };
	const metadata = {
		sdk: { settings: { infer_ip: userInfo ? 'auto' : 'never' } },
	};
	const client = {
		addEventProcessor: vi.fn((processor) => {
			processors.push(processor);
		}),
		addIntegration: vi.fn((integration: SentryReplay) => {
			if (!integrations.has(integration.name)) {
				integrations.set(integration.name, integration);
				(integration as FakeReplay).setup();
			}
		}),
		captureException: vi.fn(),
		getDataCollectionOptions: () => dataCollection,
		getDsn: () => (dsn ? { host: 'example.ingest.sentry.io' } : undefined),
		getIntegrationByName: (name: string) => integrations.get(name),
		getOptions: () => options,
		getSdkMetadata: () => metadata,
		on: (
			_hook: 'beforeSendSession',
			hook: (session: SentrySession) => void
		) => {
			sessionHooks.push(hook);
		},
	} satisfies SentryClient;
	const processEvent = (event: SentryEvent): SentryEvent =>
		processors.reduce((current, processor) => processor(current), event);
	/** The session as Sentry would send it. */
	const sendSession = (session: SentrySession): SentrySession => {
		for (const hook of sessionHooks) {
			hook(session);
		}
		return session;
	};
	/** What the client would send next: whether it sends and its IP setting. */
	const sending = () => ({
		enabled: options.enabled !== false,
		inferIp: metadata.sdk.settings.infer_ip,
		userInfo: dataCollection.userInfo,
	});
	return { client, processEvent, sendSession, sending };
};

const deferred = <ValueType>() => {
	let resolvePromise: (value: ValueType) => void = () => {};
	const promise = new Promise<ValueType>((resolve) => {
		resolvePromise = resolve;
	});
	return { promise, resolve: (value: ValueType) => resolvePromise(value) };
};

const disposers: (() => void)[] = [];
beforeEach(() => {
	vi.useFakeTimers();
	sessionStorage.clear();
});
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const mount = (script: Script, initial = deniedConsents) => {
	const kernel = createConsentKernel();
	void kernel.commands.save(initial);
	const loader = createScriptLoader({ kernel, scripts: [script] });
	disposers.push(
		() => kernel.dispose(),
		() => loader.dispose()
	);
	return { kernel, loader };
};

/** Let the paint, load and idle wait and any pending start finish. */
const settle = () => vi.runAllTimersAsync();

const setup = ({
	sampling = 'session',
	client: clientOptions,
	...options
}: Partial<SentrySdkOptions> & {
	sampling?: Sampling;
	client?: Parameters<typeof createClient>[0];
} = {}) => {
	const sentryClient = createClient(clientOptions);
	const replays: FakeReplay[] = [];
	const load = vi.fn(() => {
		if (replays.length > 0) {
			throw new Error(
				'Multiple Sentry Session Replay instances are not supported'
			);
		}
		const replay = new FakeReplay(sampling);
		replays.push(replay);
		return Promise.resolve(replay);
	});
	const script = sentry({
		getClient: () => sentryClient.client,
		replay: { load },
		...options,
	});
	return { ...sentryClient, load, replays, script };
};

describe('Sentry adapter through the kernel and script loader', () => {
	it('registers the gated categories while running for every visitor', () => {
		const { client } = createClient();
		const script = sentry({
			getClient: () => client,
			pii: { category: 'functionality' },
			replay: { category: 'experience', load: () => new FakeReplay(false) },
		});
		const { kernel } = mount(script);
		expect(script).toMatchObject({
			alwaysLoad: true,
			callbackOnly: true,
			vendor: 'sentry',
		});
		expect(kernel.getSnapshot().consentCategories).toEqual([
			'experience',
			'functionality',
			'necessary',
		]);
	});

	it('downloads nothing and strips user data while measurement is denied', async () => {
		const setUser = vi.fn();
		const { client, load, processEvent, script } = setup({ setUser });
		const before = document.scripts.length;
		mount(script);
		await settle();
		expect(load).not.toHaveBeenCalled();
		expect(client.addIntegration).not.toHaveBeenCalled();
		expect(setUser).toHaveBeenCalledWith(null);
		expect(processEvent({ user: { id: 'u1' } }).user).toBeUndefined();
		expect(document.scripts.length).toBe(before);
	});

	it('loads Replay once after a grant and keeps user data', async () => {
		const setUser = vi.fn();
		const { client, load, processEvent, replays, script } = setup({
			pii: { user: () => ({ id: 'u1' }) },
			setUser,
		});
		const { kernel } = mount(script);
		await kernel.commands.save(grantedMeasurementConsents);
		expect(load).not.toHaveBeenCalled();
		await settle();
		expect(load).toHaveBeenCalledOnce();
		expect(client.addIntegration).toHaveBeenCalledWith(replays[0]);
		expect(replays[0]?.getRecordingMode()).toBe('session');
		expect(setUser).toHaveBeenLastCalledWith({ id: 'u1' });
		expect(processEvent({ user: { id: 'u1' } }).user).toEqual({ id: 'u1' });
	});

	it('stops recording without a flush during the withdrawal itself', async () => {
		const setUser = vi.fn();
		const { processEvent, replays, script } = setup({ setUser });
		const { kernel } = mount(script, grantedMeasurementConsents);
		await settle();
		const [replay] = replays;
		expect(sessionStorage.getItem(sessionKey)).not.toBeNull();

		void kernel.commands.save(deniedConsents);

		expect(replay?.stop).toHaveBeenCalledWith({ flush: false });
		expect(replay?.getRecordingMode()).toBeUndefined();
		expect(replay?.flushed).toBe(0);
		expect(sessionStorage.getItem(sessionKey)).toBeNull();
		expect(setUser).toHaveBeenLastCalledWith(null);
		expect(processEvent({ user: { id: 'u1' } }).user).toBeUndefined();
	});

	it.each([
		['session', 'start'],
		['buffer', 'startBuffering'],
	] as const)(
		'restores %s sampling on re-grant with %s',
		async (sampling, method) => {
			const { load, replays, script } = setup({ sampling });
			const { kernel } = mount(script, grantedMeasurementConsents);
			await settle();
			await kernel.commands.save(deniedConsents);
			await kernel.commands.save(grantedMeasurementConsents);
			await settle();
			const [replay] = replays;
			expect(load).toHaveBeenCalledOnce();
			expect(replay?.[method]).toHaveBeenCalledOnce();
			expect(replay?.getRecordingMode()).toBe(sampling);
		}
	);

	it('records nothing on re-grant when the session was not sampled', async () => {
		const { replays, script } = setup({ sampling: false });
		const { kernel } = mount(script, grantedMeasurementConsents);
		await settle();
		await kernel.commands.save(deniedConsents);
		expect(sessionStorage.getItem(sessionKey)).toBeNull();
		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		const [replay] = replays;
		expect(replay?.start).not.toHaveBeenCalled();
		expect(replay?.startBuffering).not.toHaveBeenCalled();
		expect(replay?.getRecordingMode()).toBeUndefined();
	});

	it('cancels a start when consent is withdrawn before the page settles', async () => {
		const { load, script } = setup();
		const { kernel } = mount(script);
		await kernel.commands.save(grantedMeasurementConsents);
		await kernel.commands.save(deniedConsents);
		await settle();
		expect(load).not.toHaveBeenCalled();
	});

	it('does not add a Replay whose download finishes after withdrawal', async () => {
		const { client } = createClient();
		const download = deferred<SentryReplay>();
		const replay = new FakeReplay('session');
		const load = vi.fn(() => download.promise);
		const { kernel } = mount(
			sentry({ getClient: () => client, replay: { load } }),
			grantedMeasurementConsents
		);
		await settle();
		expect(load).toHaveBeenCalledOnce();

		await kernel.commands.save(deniedConsents);
		download.resolve(replay);
		await settle();
		expect(client.addIntegration).not.toHaveBeenCalled();

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(load).toHaveBeenCalledOnce();
		expect(client.addIntegration).toHaveBeenCalledWith(replay);
	});

	it('restarts after a re-grant that arrives while stop() is still pending', async () => {
		const { replays, script } = setup();
		const { kernel } = mount(script, grantedMeasurementConsents);
		await settle();
		const [replay] = replays;
		void kernel.commands.save(deniedConsents);
		void kernel.commands.save(grantedMeasurementConsents);
		void kernel.commands.save(deniedConsents);
		await settle();
		expect(replay?.start).not.toHaveBeenCalled();
		expect(replay?.getRecordingMode()).toBeUndefined();

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(replay?.start).toHaveBeenCalledOnce();
		expect(replay?.getRecordingMode()).toBe('session');
	});

	it('applies a grant that arrives before Sentry.init', async () => {
		const sentryClient = createClient();
		const current: { client?: SentryClient } = {};
		const replay = new FakeReplay('session');
		const { kernel } = mount(
			sentry({
				getClient: () => current.client,
				replay: { load: () => replay },
			})
		);
		await kernel.commands.save(grantedMeasurementConsents);
		current.client = sentryClient.client;
		await settle();
		expect(sentryClient.client.addIntegration).toHaveBeenCalledWith(replay);
		expect(replay.getRecordingMode()).toBe('session');
	});

	it('waits for a Sentry.init that runs after the page settles', async () => {
		const sentryClient = createClient();
		const current: { client?: SentryClient } = {};
		const replay = new FakeReplay('session');
		mount(
			sentry({
				getClient: () => current.client,
				replay: { load: () => replay },
			}),
			grantedMeasurementConsents
		);
		await vi.advanceTimersByTimeAsync(3000);
		current.client = sentryClient.client;
		await settle();
		expect(sentryClient.client.addIntegration).toHaveBeenCalledWith(replay);
		expect(sentryClient.client.addEventProcessor).toHaveBeenCalledOnce();
	});

	it('retries on the next consent change when Sentry.init never ran in time', async () => {
		const sentryClient = createClient();
		const current: { client?: SentryClient } = {};
		const replay = new FakeReplay('session');
		const { kernel } = mount(
			sentry({
				getClient: () => current.client,
				replay: { load: () => replay },
			}),
			grantedMeasurementConsents
		);
		await settle();
		current.client = sentryClient.client;
		await kernel.commands.save({
			...grantedMeasurementConsents,
			marketing: true,
		});
		await settle();
		expect(sentryClient.client.addIntegration).toHaveBeenCalledWith(replay);
	});

	it.each([
		['without a DSN', { dsn: '' }],
		['with enabled: false', { enabled: false }],
	])('downloads nothing when Sentry is disabled %s', async (_, client) => {
		const { load, script } = setup({ client });
		mount(script, grantedMeasurementConsents);
		await settle();
		expect(load).not.toHaveBeenCalled();
	});

	it('stops a Replay passed to Sentry.init and restores it on re-grant', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { client, load, script } = setup();
		const existing = new FakeReplay('buffer');
		client.addIntegration(existing);

		const { kernel } = mount(script);
		expect(existing.stop).toHaveBeenCalledWith({ flush: false });
		expect(existing.getRecordingMode()).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Sentry Replay was added in Sentry.init')
		);

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(load).not.toHaveBeenCalled();
		expect(existing.startBuffering).toHaveBeenCalledOnce();
	});

	it('keeps one Replay when the script is recreated', async () => {
		const onError = vi.fn();
		const { client, load, replays, script } = setup({ onError });
		const { loader } = mount(script, grantedMeasurementConsents);
		await settle();
		loader.updateScripts([
			sentry({ getClient: () => client, onError, replay: { load } }),
		]);
		await settle();
		expect(load).toHaveBeenCalledOnce();
		expect(onError).not.toHaveBeenCalled();
		expect(replays[0]?.stop).not.toHaveBeenCalled();
	});

	it('does not stop Replay when the configuration is removed', async () => {
		const { replays, script } = setup();
		const { loader } = mount(script, grantedMeasurementConsents);
		await settle();
		loader.updateScripts([]);
		await settle();
		expect(replays[0]?.stop).not.toHaveBeenCalled();
		expect(replays[0]?.getRecordingMode()).toBe('session');
	});

	it('reports a failed download and retries on the next grant', async () => {
		const { client } = createClient();
		const replay = new FakeReplay('session');
		const error = new Error('chunk failed');
		const load = vi
			.fn<() => Promise<SentryReplay>>()
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce(replay);
		const { kernel } = mount(
			sentry({ getClient: () => client, replay: { load } }),
			grantedMeasurementConsents
		);
		await settle();
		expect(client.captureException).toHaveBeenCalledWith(error, {
			captureContext: { tags: { 'c15t.integration': 'sentry' } },
		});

		await kernel.commands.save(deniedConsents);
		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(client.addIntegration).toHaveBeenCalledWith(replay);
	});

	it('refuses a Replay placeholder from a Sentry CDN bundle without Replay', async () => {
		const { client } = createClient();
		const onError = vi.fn();
		const noop = () => undefined;
		const placeholder = {
			flush: noop,
			name: 'Replay',
			start: noop,
			stop: noop,
		};
		mount(
			sentry({
				getClient: () => client,
				onError,
				replay: { load: () => placeholder as unknown as SentryReplay },
			}),
			grantedMeasurementConsents
		);
		await settle();
		expect(client.addIntegration).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('load replay.min.js first'),
			})
		);
	});

	it('treats a visitor who turned the Sentry vendor off as denied', async () => {
		const { replays, script } = setup();
		mount(script, grantedMeasurementConsents);
		await settle();
		script.onConsentChange?.({
			consents: grantedMeasurementConsents,
			elementId: script.id,
			hasConsent: false,
			id: script.id,
			vendor: { granted: false, id: 'sentry' },
		});
		expect(replays[0]?.stop).toHaveBeenCalledWith({ flush: false });
	});

	it('turns IP inference off and strips sessions until user data is allowed', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { script, sendSession, sending } = setup({
			client: { userInfo: true },
		});
		const { kernel } = mount(script);
		expect(sending()).toMatchObject({ inferIp: 'never', userInfo: false });
		expect(sendSession({ did: 'u1' })).toEqual({
			did: undefined,
			ipAddress: undefined,
		});

		await kernel.commands.save(grantedMeasurementConsents);
		expect(sending()).toMatchObject({ inferIp: 'auto', userInfo: true });
		expect(sendSession({ did: 'u1' })).toEqual({
			did: 'u1',
			ipAddress: '{{auto}}',
		});
	});

	it('keeps IP inference off when the app turned it off', async () => {
		const { script, sending } = setup();
		const { kernel } = mount(script, grantedMeasurementConsents);
		await kernel.commands.save(deniedConsents);
		await kernel.commands.save(grantedMeasurementConsents);
		expect(sending()).toMatchObject({ inferIp: 'never', userInfo: false });
	});

	it('warns when Sentry.init ran before c15t and infers IP addresses', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { script } = setup({ client: { userInfo: true } });
		mount(script);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('dataCollection: { userInfo: false }')
		);
	});

	it('does not warn about IP addresses when c15t starts Sentry', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { client } = createClient({ userInfo: true });
		const current: { client?: SentryClient } = {};
		mount(
			sentry({
				getClient: () => current.client,
				init: () => {
					current.client = client;
				},
			})
		);
		await settle();
		expect(current.client).toBe(client);
		expect(warn).not.toHaveBeenCalled();
	});

	it('starts Sentry only after measurement with loadMode after-consent', async () => {
		const sentryClient = createClient();
		const current: { client?: SentryClient } = {};
		const replay = new FakeReplay('session');
		const init = vi.fn(async () => {
			await Promise.resolve();
			current.client = sentryClient.client;
		});
		const script = sentry({
			getClient: () => current.client,
			init,
			loadMode: 'after-consent',
			replay: { load: () => replay },
		});
		const { kernel } = mount(script);
		await settle();
		expect(init).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().consentCategories).toContain('measurement');

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(init).toHaveBeenCalledOnce();
		expect(sentryClient.sending().enabled).toBe(true);
		expect(replay.getRecordingMode()).toBe('session');

		await kernel.commands.save(deniedConsents);
		expect(sentryClient.sending().enabled).toBe(false);
		expect(replay.getRecordingMode()).toBeUndefined();

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(init).toHaveBeenCalledOnce();
		expect(sentryClient.sending().enabled).toBe(true);
	});

	it('keeps Replay off while Sentry waits for measurement', async () => {
		const { client } = createClient();
		const load = vi.fn(() => new FakeReplay('session'));
		mount(
			sentry({
				getClient: () => client,
				init: () => undefined,
				loadMode: 'after-consent',
				replay: { category: 'experience', load },
			}),
			{ ...deniedConsents, experience: true }
		);
		await settle();
		expect(load).not.toHaveBeenCalled();
	});

	it('keeps a client the app disabled switched off', async () => {
		const { client, sending } = createClient({ enabled: false });
		const { kernel } = mount(
			sentry({
				getClient: () => client,
				init: () => undefined,
				loadMode: 'after-consent',
			})
		);
		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(sending().enabled).toBe(false);
	});

	it('reports a failed init and tries again on the next grant', async () => {
		const sentryClient = createClient();
		const current: { client?: SentryClient } = {};
		const onError = vi.fn();
		const error = new Error('chunk failed');
		const init = vi
			.fn<() => Promise<void>>()
			.mockRejectedValueOnce(error)
			.mockImplementationOnce(() => {
				current.client = sentryClient.client;
				return Promise.resolve();
			});
		const { kernel } = mount(
			sentry({
				getClient: () => current.client,
				init,
				loadMode: 'after-consent',
				onError,
			}),
			grantedMeasurementConsents
		);
		await settle();
		expect(onError).toHaveBeenCalledWith(error);

		await kernel.commands.save(deniedConsents);
		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(current.client).toBe(sentryClient.client);
	});

	it('requires init with loadMode after-consent and your own SDK', () => {
		expect(() =>
			sentry({ getClient: () => undefined, loadMode: 'after-consent' })
		).toThrow('init');
	});

	it('requires setUser when pii.user is set', () => {
		expect(() =>
			sentry({ getClient: () => undefined, pii: { user: () => null } })
		).toThrow('setUser');
	});
});

const cdn = 'https://browser.sentry-cdn.com';
const dsn = 'https://key@o0.ingest.sentry.io/0';

/**
 * Stands in for Sentry's CDN files: the bundle defines `window.Sentry`, and
 * `replay.min.js` adds the real `replayIntegration` to it.
 */
const installSentryCdn = (sampling: Sampling = 'session') => {
	const sentryClient = createClient();
	const loaded: HTMLScriptElement[] = [];
	const current: { client?: SentryClient } = {};
	const replays: FakeReplay[] = [];
	const sentryGlobal = {
		browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
		getClient: () => current.client,
		init: vi.fn((_options: Record<string, unknown>) => {
			current.client = sentryClient.client;
		}),
		replayIntegration: undefined as
			| ((options?: Record<string, unknown>) => FakeReplay)
			| undefined,
		setUser: vi.fn(),
	};
	const observer = new MutationObserver((records) => {
		for (const node of records.flatMap((record) => [...record.addedNodes])) {
			if (!(node instanceof HTMLScriptElement) || !node.src.startsWith(cdn)) {
				continue;
			}
			loaded.push(node);
			if (node.src.endsWith('/replay.min.js')) {
				sentryGlobal.replayIntegration = () => {
					const replay = new FakeReplay(sampling);
					replays.push(replay);
					return replay;
				};
			} else {
				Object.assign(window, { Sentry: sentryGlobal });
			}
			node.dispatchEvent(new Event('load'));
		}
	});
	observer.observe(document, { childList: true, subtree: true });
	disposers.push(() => {
		observer.disconnect();
		Reflect.deleteProperty(window, 'Sentry');
		document.head.innerHTML = '';
		document.body.innerHTML = '';
	});
	return { ...sentryClient, loaded, replays, sentryGlobal };
};

describe('Sentry loaded from the CDN', () => {
	it('loads the pinned bundle with integrity and initializes Sentry once', async () => {
		const { loaded, sentryGlobal } = installSentryCdn();
		const script = sentry({
			dsn,
			initOptions: { environment: 'production', release: 'app@1.0.0' },
		});
		const { kernel } = mount(script);
		await settle();

		expect(script).toMatchObject({ alwaysLoad: true, vendor: 'sentry' });
		expect(loaded.map((element) => element.src)).toEqual([
			`${cdn}/11.4.0/bundle.min.js`,
		]);
		expect(loaded[0]?.getAttribute('crossorigin')).toBe('anonymous');
		expect(loaded[0]?.getAttribute('integrity')).toMatch(/^sha384-/u);
		expect(sentryGlobal.init).toHaveBeenCalledOnce();
		expect(sentryGlobal.init.mock.calls[0]?.[0]).toMatchObject({
			dsn,
			environment: 'production',
			release: 'app@1.0.0',
		});
		expect(sentryGlobal.setUser).toHaveBeenCalledWith(null);

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		// Without Replay sample rates there is nothing to record.
		expect(loaded).toHaveLength(1);
	});

	it('loads the tracing bundle and adds browser tracing when traces are sampled', async () => {
		const { loaded, sentryGlobal } = installSentryCdn();
		const custom = { name: 'Custom' };
		mount(
			sentry({
				dsn,
				initOptions: { integrations: [custom], tracesSampleRate: 0.2 },
			})
		);
		await settle();
		expect(loaded[0]?.src).toBe(`${cdn}/11.4.0/bundle.tracing.min.js`);
		const initOptions = sentryGlobal.init.mock.calls[0]?.[0] as {
			integrations: (defaults: unknown[]) => unknown[];
		};
		expect(initOptions.integrations([{ name: 'Default' }])).toEqual([
			{ name: 'Default' },
			custom,
			{ name: 'BrowserTracing' },
		]);
	});

	it('loads another version without integrity', async () => {
		const { loaded } = installSentryCdn();
		mount(sentry({ dsn, version: '10.76.1' }));
		await settle();
		expect(loaded[0]?.src).toBe(`${cdn}/10.76.1/bundle.min.js`);
		expect(loaded[0]?.hasAttribute('integrity')).toBe(false);
	});

	it('loads replay.min.js only once measurement is allowed', async () => {
		const { client, loaded, replays, sendSession } = installSentryCdn();
		const { kernel } = mount(
			sentry({
				dsn,
				initOptions: { replaysOnErrorSampleRate: 1 },
				replay: { options: { maskAllText: true } },
			})
		);
		await settle();
		expect(loaded).toHaveLength(1);
		expect(sendSession({ did: 'u1' }).did).toBeUndefined();

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(loaded[1]?.src).toBe(`${cdn}/11.4.0/replay.min.js`);
		expect(loaded[1]?.getAttribute('integrity')).toMatch(/^sha384-/u);
		expect(client.addIntegration).toHaveBeenCalledWith(replays[0]);

		await kernel.commands.save(deniedConsents);
		expect(replays[0]?.stop).toHaveBeenCalledWith({ flush: false });
	});

	it('never loads Replay with replay: false', async () => {
		const { loaded } = installSentryCdn();
		mount(
			sentry({
				dsn,
				initOptions: { replaysSessionSampleRate: 1 },
				replay: false,
			}),
			grantedMeasurementConsents
		);
		await settle();
		expect(loaded).toHaveLength(1);
	});

	it('loads Sentry only after measurement with loadMode after-consent', async () => {
		const { loaded, sending, sentryGlobal } = installSentryCdn();
		const script = sentry({ dsn, loadMode: 'after-consent' });
		const { kernel } = mount(script);
		await settle();
		expect(script.alwaysLoad).toBeUndefined();
		expect(loaded).toHaveLength(0);

		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(loaded).toHaveLength(1);
		expect(sending().enabled).toBe(true);

		await kernel.commands.save(deniedConsents);
		expect(sending().enabled).toBe(false);

		// Without a reload the bundle loads again; the running client stays.
		await kernel.commands.save(grantedMeasurementConsents);
		await settle();
		expect(sentryGlobal.init).toHaveBeenCalledOnce();
		expect(sending().enabled).toBe(true);
	});

	it('requires a DSN', () => {
		expect(() => sentry({ dsn: ' ' })).toThrow(
			'sentry: missing or invalid dsn'
		);
	});
});
