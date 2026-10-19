import { NO_RECORDS_WARNING } from '@c15t/core';
import type { local as localMode } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { C15tGlobalBase } from '../global-base';
import { isDevelopmentHost } from '../no-records-warning';

const testWindow = window as Window & { c15t?: unknown };
const RENAME_NOTE =
	'[c15t] c15t.offline.js is now c15t.local.js. c15t v4 removes the old file name.';

/**
 * Load a local-mode script-tag entry the way the CDN file runs: as a
 * production build, with the given attributes on its tag.
 */
const loadTag = async function loadTag(
	entry: 'cdn-local' | 'cdn-offline',
	attributes: Record<string, string> = {}
): Promise<C15tGlobalBase> {
	const script = document.createElement('script');
	for (const [name, value] of Object.entries({
		'data-no-ui': '',
		...attributes,
	})) {
		script.setAttribute(name, value);
	}
	vi.spyOn(document, 'currentScript', 'get').mockReturnValue(script);
	vi.resetModules();
	await (entry === 'cdn-local'
		? import('../entries/cdn-local')
		: import('../entries/cdn-offline'));
	const api = testWindow.c15t as C15tGlobalBase;
	if (!('data-manual' in attributes)) {
		await api.ready();
	}
	return api;
};

const warnings = function warnings(warn: ReturnType<typeof vi.spyOn>) {
	return warn.mock.calls.map(([message]) => message);
};

describe('local mode warning in the script tag', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		Reflect.deleteProperty(globalThis, Symbol.for('c15t.noRecordsWarned'));
		vi.stubEnv('NODE_ENV', 'production');
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		(testWindow.c15t as C15tGlobalBase | undefined)?.dispose?.();
		testWindow.c15t = undefined;
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		localStorage.clear();
	});

	it('warns once on a development host', async () => {
		const api = await loadTag('cdn-local');
		api.dispose();
		api.init();
		await api.ready();

		expect(warnings(warn)).toEqual([NO_RECORDS_WARNING]);
	});

	it('stays silent with data-acknowledge-no-records', async () => {
		await loadTag('cdn-local', { 'data-acknowledge-no-records': '' });

		expect(warnings(warn)).toEqual([]);
	});

	it('stays silent with acknowledgeNoRecords in queued config', async () => {
		testWindow.c15t = [['config', { acknowledgeNoRecords: true }]];
		await loadTag('cdn-local');

		expect(warnings(warn)).toEqual([]);
	});

	it('stays silent with an acknowledged local() factory', async () => {
		const api = await loadTag('cdn-local', { 'data-manual': '' });
		const { local } = api as C15tGlobalBase & {
			local: typeof localMode;
		};
		api.init({ mode: local({ acknowledgeNoRecords: true }) });
		await api.ready();

		expect(warnings(warn)).toEqual([]);
	});

	it('stays silent on a public host', async () => {
		vi.stubGlobal('location', {
			...window.location,
			hostname: 'shop.example.com',
		});
		await loadTag('cdn-local');

		expect(warnings(warn)).toEqual([]);
	});

	// `vite preview` and `next start` serve production builds on localhost.
	it('follows NODE_ENV, not the host, in the ES module entry', async () => {
		const { createConsentClient } = await import('../offline');
		createConsentClient({ ui: false }).dispose();

		expect(warnings(warn)).toEqual([]);

		vi.stubEnv('NODE_ENV', 'development');
		createConsentClient({ ui: false }).dispose();

		expect(warnings(warn)).toEqual([NO_RECORDS_WARNING]);
	});

	it('names the new file when the page loads c15t.offline.js', async () => {
		await loadTag('cdn-offline');

		expect(warnings(warn)).toEqual([RENAME_NOTE, NO_RECORDS_WARNING]);
	});
});

describe('isDevelopmentHost', () => {
	it.each([
		['localhost', true],
		['127.0.0.1', true],
		['[::1]', true],
		['0.0.0.0', true],
		['shop.localhost', true],
		['printer.local', true],
		['site.test', true],
		['example.com', false],
		['localhost.example.com', false],
		['testsite.com', false],
	])('%s: %s', (hostname, expected) => {
		expect(isDevelopmentHost(hostname)).toBe(expected);
	});
});
