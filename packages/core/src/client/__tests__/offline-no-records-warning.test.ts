import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_RECORDS_WARNING } from '../../libs/no-records-warning';
import { configureConsentManager } from '../client-factory';

const WARNED = Symbol.for('c15t.noRecordsWarned');

// The factory caches clients by storage key, so each call gets its own key.
let storageKey = 0;
const nextStorageConfig = () => ({ storageKey: `no-records-${storageKey++}` });

describe('offline mode no-records warning', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		delete (globalThis as { [WARNED]?: true })[WARNED];
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		warn.mockRestore();
	});

	it('warns once per page in a development build', () => {
		configureConsentManager({
			mode: 'offline',
			storageConfig: nextStorageConfig(),
		});
		configureConsentManager({
			mode: 'offline',
			storageConfig: nextStorageConfig(),
		});

		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(NO_RECORDS_WARNING);
		expect(NO_RECORDS_WARNING).toBe(
			'[c15t] Offline mode keeps consent only in this browser. c15t keeps no server-side record of consent. Offline mode also has no geolocation, so every visitor gets the same policy. Use it for development and tests. For production, see https://c15t.com/docs/concepts/modes\nSet acknowledgeNoRecords: true to hide this message.'
		);
	});

	it('stays silent with acknowledgeNoRecords: true', () => {
		configureConsentManager({
			mode: 'offline',
			acknowledgeNoRecords: true,
			storageConfig: nextStorageConfig(),
		});

		expect(warn).not.toHaveBeenCalled();
	});

	it('stays silent in a production build', () => {
		vi.stubEnv('NODE_ENV', 'production');

		configureConsentManager({
			mode: 'offline',
			storageConfig: nextStorageConfig(),
		});

		expect(warn).not.toHaveBeenCalled();
	});

	it('stays silent on the server', () => {
		// vitest.setup.ts stubs `window`; remove only that stub for this call.
		const scope = globalThis as { window?: unknown };
		const { window: browserWindow } = scope;
		scope.window = undefined;
		try {
			configureConsentManager({
				mode: 'offline',
				storageConfig: nextStorageConfig(),
			});
		} finally {
			scope.window = browserWindow;
		}

		expect(warn).not.toHaveBeenCalled();
	});

	it('stays silent for hosted and custom mode', () => {
		configureConsentManager({
			backendURL: '/api/c15t',
			storageConfig: nextStorageConfig(),
		});
		configureConsentManager({
			mode: 'custom',
			endpointHandlers: {
				identifyUser: async () => ({
					data: null,
					error: null,
					ok: true,
					response: null,
				}),
				setConsent: async () => ({
					data: null,
					error: null,
					ok: true,
					response: null,
				}),
				showConsentBanner: async () => ({
					data: null,
					error: null,
					ok: true,
					response: null,
				}),
				verifyConsent: async () => ({
					data: null,
					error: null,
					ok: true,
					response: null,
				}),
			},
			storageConfig: nextStorageConfig(),
		});

		expect(warn).not.toHaveBeenCalled();
	});
});
