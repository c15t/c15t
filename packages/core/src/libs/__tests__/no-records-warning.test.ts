/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	clearClientRegistry,
	configureConsentManager,
	type EndpointHandlers,
} from '../../client';
import {
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from '../../runtime';
import { NO_RECORDS_WARNING } from '../no-records-warning';

const WARNED = Symbol.for('c15t.noRecordsWarned');

describe('the offline mode warning', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	const noRecordsWarnings = () =>
		warn.mock.calls.filter(([message]) => message === NO_RECORDS_WARNING);

	beforeEach(() => {
		Reflect.deleteProperty(globalThis, WARNED);
		clearConsentRuntimeCache();
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		warn.mockRestore();
		Reflect.deleteProperty(globalThis, WARNED);
		clearConsentRuntimeCache();
	});

	test('warns once per page in development, however many clients start', () => {
		configureConsentManager({ mode: 'offline' });
		clearClientRegistry();
		configureConsentManager({ mode: 'offline' });
		getOrCreateConsentRuntime({ mode: 'offline' });

		expect(noRecordsWarnings()).toHaveLength(1);
		expect(warn).toHaveBeenCalledWith(NO_RECORDS_WARNING);
	});

	test('logs the exact message, with a warning rather than an error', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {
			/* noop */
		});

		configureConsentManager({ mode: 'offline' });

		expect(NO_RECORDS_WARNING).toBe(
			'[c15t] Offline mode keeps consent only in this browser. c15t keeps no server-side record of consent. Offline mode also has no geolocation, so every visitor gets the same policy. Use it for development and tests. For production, see https://c15t.com/docs/concepts/modes\nSet acknowledgeNoRecords: true to hide this message.'
		);
		expect(noRecordsWarnings()).toHaveLength(1);
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	test('stays silent with acknowledgeNoRecords', () => {
		configureConsentManager({ mode: 'offline', acknowledgeNoRecords: true });

		expect(noRecordsWarnings()).toEqual([]);
	});

	test('carries acknowledgeNoRecords through the runtime', () => {
		getOrCreateConsentRuntime({
			mode: 'offline',
			acknowledgeNoRecords: true,
		});

		expect(noRecordsWarnings()).toEqual([]);

		clearConsentRuntimeCache();
		getOrCreateConsentRuntime({ mode: 'offline' });

		expect(noRecordsWarnings()).toHaveLength(1);
	});

	test('stays silent in a production build', () => {
		vi.stubEnv('NODE_ENV', 'production');

		configureConsentManager({ mode: 'offline' });
		getOrCreateConsentRuntime({ mode: 'offline' });

		expect(noRecordsWarnings()).toEqual([]);
	});

	test('stays silent on the server', () => {
		const browserWindow = globalThis.window;
		vi.stubGlobal('window', undefined);
		try {
			configureConsentManager({ mode: 'offline' });
		} finally {
			vi.stubGlobal('window', browserWindow);
		}

		expect(noRecordsWarnings()).toEqual([]);
	});

	test('stays silent for hosted and custom mode', () => {
		configureConsentManager({ mode: 'hosted', backendURL: '/api/c15t' });
		configureConsentManager({
			mode: 'custom',
			endpointHandlers: {} as EndpointHandlers,
		});
		getOrCreateConsentRuntime({ mode: 'hosted', backendURL: '/api/c15t' });

		expect(noRecordsWarnings()).toEqual([]);
	});
});
