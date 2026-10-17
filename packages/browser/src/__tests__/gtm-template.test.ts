/**
 * Runs the Google Tag Manager community template in `gtm-template/` against
 * the real browser global.
 *
 * GTM runs template code in a sandbox: each API needs a declared permission,
 * and values are copied when they cross between the template and the page.
 * The emulator below enforces the permissions the template declares and makes
 * those copies, so a call GTM would block fails here too. It also replays the
 * template's own `___TESTS___` scenarios, which GTM runs in its editor.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { policyRulePresets } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import type { ConsentClientOptions } from '../types';

const template = readFileSync(
	join(
		dirname(fileURLToPath(import.meta.url)),
		'../../gtm-template/template.tpl'
	),
	'utf8'
);

const section = function section(name: string): string {
	const match = new RegExp(
		`^___${name}___\\n(?<body>[\\s\\S]*?)(?=^___[A-Z_]+___$|(?![\\s\\S]))`,
		'mu'
	).exec(template);
	const body = match?.groups?.body;
	if (!body) {
		throw new Error(`template.tpl has no ___${name}___ section`);
	}
	return body.trim();
};

/**
 * Compile template source, the way GTM does before it runs a template.
 */
const compile = function compile(
	parameters: string[],
	code: string
): (...args: unknown[]) => void {
	// oxlint-disable-next-line no-new-func -- Running the template's own source is the point of this test.
	return new Function(...parameters, code) as (...args: unknown[]) => void;
};

const runTemplate = compile(
	['require', 'data'],
	section('SANDBOXED_JS_FOR_WEB_TEMPLATE')
);

// Permission values are typed: 1 string, 2 list, 3 map, 8 boolean.
type PermissionValue =
	| { type: 1; string: string }
	| { type: 2; listItem: PermissionValue[] }
	| { type: 3; mapKey: PermissionValue[]; mapValue: PermissionValue[] }
	| { type: 8; boolean: boolean };

const decode = function decode(value: PermissionValue): unknown {
	switch (value.type) {
		case 1:
			return value.string;
		case 2:
			return value.listItem.map(decode);
		case 3:
			return Object.fromEntries(
				value.mapKey.map((key, index) => [
					decode(key),
					decode(value.mapValue[index] as PermissionValue),
				])
			);
		case 8:
			return value.boolean;
		default:
			throw new Error('unknown permission value type');
	}
};

const permissions = new Map<string, Record<string, unknown>>(
	(
		JSON.parse(section('WEB_PERMISSIONS')) as {
			instance: {
				key: { publicId: string };
				param: { key: string; value: PermissionValue }[];
			};
		}[]
	).map(({ instance }) => [
		instance.key.publicId,
		Object.fromEntries(
			instance.param.map((param) => [param.key, decode(param.value)])
		),
	])
);

const permission = function permission(id: string): Record<string, unknown> {
	const granted = permissions.get(id);
	if (!granted) {
		throw new Error(`template needs the ${id} permission`);
	}
	return granted;
};

const globalAccess = function globalAccess(
	key: string,
	mode: 'read' | 'write' | 'execute'
): void {
	const keys = permission('access_globals').keys as Record<string, unknown>[];
	if (!keys.some((entry) => entry.key === key && entry[mode] === true)) {
		throw new Error(`access_globals does not allow ${mode} on ${key}`);
	}
};

const consentWrite = function consentWrite(
	command: Record<string, unknown>
): void {
	const types = permission('access_consent').consentTypes as Record<
		string,
		unknown
	>[];
	for (const key of Object.keys(command)) {
		if (key === 'region' || key === 'wait_for_update') {
			continue;
		}
		if (
			!types.some((entry) => entry.consentType === key && entry.write === true)
		) {
			throw new Error(`access_consent does not allow writing ${key}`);
		}
	}
};

const urlPattern = function urlPattern(pattern: string): RegExp {
	const escaped = pattern
		.split('*')
		.map((part) => part.replace(/[.+?^${}()|[\]\\/]/gu, '\\$&'))
		.join('.*');
	return new RegExp(`^${escaped}$`, 'u');
};

/**
 * Copy a value across the sandbox boundary. Functions stay callable, and
 * what they receive or return is copied too.
 */
const copy = function copy(value: unknown, seen = new Map()): unknown {
	if (typeof value === 'function') {
		return (...args: unknown[]) =>
			copy(
				(value as (...input: unknown[]) => unknown)(
					...args.map((arg) => copy(arg))
				)
			);
	}
	if (value === null || typeof value !== 'object') {
		return value;
	}
	if (seen.has(value)) {
		return seen.get(value);
	}
	if (Array.isArray(value)) {
		const result: unknown[] = [];
		seen.set(value, result);
		for (const item of value) {
			result.push(copy(item, seen));
		}
		return result;
	}
	const result: Record<string, unknown> = {};
	seen.set(value, result);
	for (const [key, item] of Object.entries(value)) {
		result[key] = copy(item, seen);
	}
	return result;
};

/** Runs the script. Throw to fail the load, or return 'pending' to leave it in flight. */
type Loader = (url: string) => 'pending' | undefined;

interface Recorded {
	defaults: Record<string, unknown>[];
	updates: Record<string, unknown>[];
	injected: string[];
	logs: string[];
	gtagSet: [string, unknown][];
}

/** One page: GTM's template storage lasts as long as the page does. */
const createPage = function createPage(load: Loader = () => undefined) {
	const storage = new Map<string, unknown>();
	const recorded: Recorded = {
		defaults: [],
		gtagSet: [],
		injected: [],
		logs: [],
		updates: [],
	};
	const testWindow = window as unknown as Record<string, unknown>;

	const apis: Record<string, unknown> = {
		copyFromWindow: (key: string) => {
			globalAccess(key, 'read');
			let value: unknown = testWindow;
			for (const part of key.split('.')) {
				value =
					value !== null && typeof value === 'object'
						? (value as Record<string, unknown>)[part]
						: undefined;
			}
			return copy(value);
		},
		createQueue: (key: string) => {
			globalAccess(key, 'read');
			globalAccess(key, 'write');
			if (testWindow[key] === undefined) {
				testWindow[key] = [];
			}
			return (...args: unknown[]) => {
				const target = testWindow[key] as { push?: unknown };
				if (typeof target.push !== 'function') {
					throw new Error(`window.${key} has no push()`);
				}
				target.push(...args.map((arg) => copy(arg)));
			};
		},
		gtagSet: (key: string, value: unknown) => {
			const patterns = permission('write_data_layer').keyPatterns as string[];
			if (!patterns.some((pattern) => urlPattern(pattern).test(key))) {
				throw new Error(`write_data_layer does not allow ${key}`);
			}
			recorded.gtagSet.push([key, value]);
		},
		injectScript: (
			url: string,
			onSuccess: () => void,
			onFailure: () => void
		) => {
			const patterns = permission('inject_script').urls as string[];
			if (!patterns.some((pattern) => urlPattern(pattern).test(url))) {
				throw new Error(`inject_script does not allow ${url}`);
			}
			recorded.injected.push(url);
			let state: 'pending' | undefined;
			try {
				state = load(url);
			} catch {
				onFailure();
				return;
			}
			if (state !== 'pending') {
				onSuccess();
			}
		},
		logToConsole: (...args: unknown[]) => {
			permission('logging');
			recorded.logs.push(args.join(' '));
		},
		makeNumber: (value: unknown) => Number(value),
		setDefaultConsentState: (command: Record<string, unknown>) => {
			consentWrite(command);
			recorded.defaults.push(command);
		},
		templateStorage: {
			getItem: (key: string) => {
				permission('access_template_storage');
				return storage.get(key);
			},
			setItem: (key: string, value: unknown) => {
				permission('access_template_storage');
				storage.set(key, value);
			},
		},
		updateConsentState: (command: Record<string, unknown>) => {
			consentWrite(command);
			recorded.updates.push(command);
		},
	};

	const run = function run(data: Record<string, unknown>) {
		const result = { failure: vi.fn(), success: vi.fn() };
		const require = (name: string) => {
			if (!(name in apis)) {
				throw new Error(`the emulator does not provide ${name}`);
			}
			return apis[name];
		};
		runTemplate(require, {
			...data,
			gtmOnFailure: result.failure,
			gtmOnSuccess: result.success,
		});
		return result;
	};

	return { apis, recorded, run };
};

const categories = ['necessary', 'measurement', 'marketing'] as const;
const policy = {
	...policyRulePresets.europeOptIn(),
	categories,
	match: { isDefault: true },
	scopeMode: 'strict' as const,
};
const options: ConsentClientOptions = {
	consentCategories: [...categories],
	policyRules: [policy],
	prefetch: {
		initialPolicyResolution: resolvePolicyRules({ rules: [policy] }),
	},
	reloadOnConsentRevoked: false,
	ui: false,
};

const testWindow = window as Window & { c15t?: unknown };

/** What the c15t script tag does when it runs, configured for this test. */
const loadC15t = function loadC15t(): C15tGlobal {
	if (Array.isArray(testWindow.c15t)) {
		testWindow.c15t.push(['config', options]);
	} else {
		testWindow.c15t = [['config', options]];
	}
	const api = installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));
	api.init();
	return api;
};

const inthUrl = 'https://acme.inth.app/c15t.js';
const tagData = {
	backendUrl: '',
	loadScript: true,
	scriptUrl: inthUrl,
	waitForUpdate: '500',
};

const denied = {
	ad_personalization: 'denied',
	ad_storage: 'denied',
	ad_user_data: 'denied',
	analytics_storage: 'denied',
	functionality_storage: 'denied',
	personalization_storage: 'denied',
	security_storage: 'denied',
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	vi.restoreAllMocks();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
});

describe('GTM template', () => {
	it('sets a denied default and waits for c15t', () => {
		const page = createPage(() => {
			loadC15t();
		});
		page.run(tagData);

		expect(page.recorded.defaults).toEqual([
			{ ...denied, security_storage: 'granted', wait_for_update: 500 },
		]);
		expect(page.recorded.gtagSet).toEqual([
			['ads_data_redaction', false],
			['url_passthrough', false],
		]);
	});

	it('sets one default per region row', () => {
		const page = createPage();
		page.run({
			...tagData,
			defaultSettings: [
				{ ...denied, region: 'de, fr' },
				{ ...denied, analytics_storage: 'granted', region: '' },
			],
			loadScript: false,
			waitForUpdate: '2000',
		});

		expect(page.recorded.defaults).toEqual([
			{ ...denied, region: ['DE', 'FR'], wait_for_update: 2000 },
			{ ...denied, analytics_storage: 'granted', wait_for_update: 2000 },
		]);
	});

	it('loads c15t and sends its permissions once the policy resolves', async () => {
		const page = createPage(() => {
			loadC15t();
		});
		const result = page.run(tagData);

		expect(page.recorded.injected).toEqual([inthUrl]);
		expect(result.success).toHaveBeenCalledOnce();
		await vi.waitFor(() => {
			expect(page.recorded.updates).toEqual([
				{ ...denied, security_storage: 'granted' },
			]);
		});
	});

	it('sends an update when the visitor accepts or rejects', async () => {
		let api: C15tGlobal | undefined;
		const page = createPage(() => {
			api = loadC15t();
		});
		page.run(tagData);
		await vi.waitFor(() => {
			expect(page.recorded.updates).toHaveLength(1);
		});

		await api?.acceptAll();
		await vi.waitFor(() => {
			expect(page.recorded.updates.at(-1)).toEqual({
				...denied,
				ad_personalization: 'granted',
				ad_storage: 'granted',
				ad_user_data: 'granted',
				analytics_storage: 'granted',
				security_storage: 'granted',
			});
		});

		await api?.rejectAll();
		await vi.waitFor(() => {
			expect(page.recorded.updates.at(-1)).toEqual({
				...denied,
				security_storage: 'granted',
			});
		});
	});

	it('uses c15t that the page already loaded', async () => {
		loadC15t();
		const warn = vi.spyOn(console, 'warn');
		const page = createPage();
		const result = page.run({
			...tagData,
			backendUrl: 'https://acme.inth.app',
		});

		expect(page.recorded.injected).toEqual([]);
		expect(warn).not.toHaveBeenCalled();
		expect(result.success).toHaveBeenCalledOnce();
		await vi.waitFor(() => {
			expect(page.recorded.updates).toEqual([
				{ ...denied, security_storage: 'granted' },
			]);
		});
	});

	it('queues for a page that loads c15t after the tag', async () => {
		const page = createPage();
		page.run({ ...tagData, loadScript: false });
		expect(page.recorded.logs).toEqual([]);

		loadC15t();
		await vi.waitFor(() => {
			expect(page.recorded.updates).toEqual([
				{ ...denied, security_storage: 'granted' },
			]);
		});
	});

	it('subscribes once when the tag fires twice', async () => {
		const page = createPage(() => {
			loadC15t();
		});
		page.run(tagData);
		const second = page.run(tagData);

		expect(page.recorded.injected).toHaveLength(1);
		expect(second.success).toHaveBeenCalledOnce();
		await vi.waitFor(() => {
			expect(page.recorded.updates).toHaveLength(1);
		});
	});

	it('queues the backend URL only when it loads the script', () => {
		const queued: unknown[] = [];
		const page = createPage(() => {
			queued.push(...(testWindow.c15t as unknown[]));
		});
		page.run({
			...tagData,
			backendUrl: 'https://acme.inth.app',
			scriptUrl:
				'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.js',
		});

		expect(queued[0]).toEqual([
			'config',
			{ backendURL: 'https://acme.inth.app' },
		]);
		expect(queued.slice(1).map((call) => (call as unknown[])[1])).toEqual([
			'ready',
			'consent',
		]);
	});

	it('fails the tag when the script does not load', () => {
		const page = createPage(() => {
			throw new Error('network');
		});
		const result = page.run(tagData);

		expect(result.failure).toHaveBeenCalledOnce();
		expect(page.recorded.logs).toEqual([`c15t: could not load ${inthUrl}`]);
	});

	it('tries again on a later firing after the script fails to load', async () => {
		let attempts = 0;
		const page = createPage(() => {
			attempts += 1;
			if (attempts === 1) {
				throw new Error('network');
			}
			loadC15t();
		});
		const first = page.run(tagData);
		const second = page.run(tagData);

		expect(first.failure).toHaveBeenCalledOnce();
		expect(second.success).toHaveBeenCalledOnce();
		expect(page.recorded.injected).toEqual([inthUrl, inthUrl]);
		await vi.waitFor(() => {
			expect(page.recorded.updates).toHaveLength(1);
		});
	});

	it('does not load the script twice while a load is in flight', () => {
		const page = createPage(() => 'pending');
		page.run(tagData);
		const second = page.run(tagData);

		expect(page.recorded.injected).toEqual([inthUrl]);
		expect(second.success).toHaveBeenCalledOnce();
	});

	it.each([
		['https://acme.inth.app/c15t.js', true],
		['https://acme.inth.app/c15t.offline.js', true],
		['https://acme.inth.app/c15t.headless.js', true],
		['https://acme.inth.app/c15t.iab.js', true],
		['https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.js', true],
		[
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.offline.js',
			true,
		],
		['https://example.com/c15t.js', false],
		['https://acme.inth.app.example.com/c15t.js', false],
		['https://inth.app/c15t.js', false],
		['https://acme.inth.app/other.js', false],
		['https://acme.inth.app/assets/c15t.js', false],
		['http://acme.inth.app/c15t.js', false],
		['https://acme.inth.app/c15t.js?v=1', false],
		['https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/other.js', false],
		[
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.gpp.js',
			false,
		],
		[
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.devtools.js',
			false,
		],
		['https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/c15t.js', false],
		['https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/x/dist/c15t.js', false],
		['https://acme.inth.app/c15t/c15t.js', false],
		['https://acme.inth.app/c15t.gpp.js', false],
	])('treats %s as allowed: %s', (scriptUrl, allowed) => {
		const page = createPage();
		// jsDelivr's hosted c15t.js needs a backend; see the cases below.
		const backendUrl = scriptUrl.endsWith('/dist/c15t.js')
			? 'https://acme.inth.app'
			: '';
		const result = page.run({ ...tagData, backendUrl, scriptUrl });

		expect(page.recorded.injected).toEqual(allowed ? [scriptUrl] : []);
		expect(result.failure).toHaveBeenCalledTimes(allowed ? 0 : 1);
	});

	it.each([
		[
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.js',
			'',
			'needs a "Backend URL"',
		],
		[
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.offline.js',
			'https://acme.inth.app',
			'uses no backend',
		],
	])('fails %s with Backend URL "%s"', (scriptUrl, backendUrl, message) => {
		const page = createPage();
		const result = page.run({ ...tagData, backendUrl, scriptUrl });

		expect(result.failure).toHaveBeenCalledOnce();
		expect(page.recorded.injected).toEqual([]);
		expect(page.recorded.logs.join('\n')).toContain(message);
		expect(testWindow.c15t).toEqual([]);
	});

	it.each([
		['https://acme.inth.app/c15t.js', ''],
		['https://acme.inth.app/c15t.js', 'https://other.inth.app'],
		[
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.headless.js',
			'',
		],
		['https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.iab.js', ''],
	])('loads %s with Backend URL "%s"', (scriptUrl, backendUrl) => {
		const page = createPage();
		const result = page.run({ ...tagData, backendUrl, scriptUrl });

		expect(result.success).toHaveBeenCalledOnce();
		expect(page.recorded.injected).toEqual([scriptUrl]);
	});

	it('matches the script URL field validator', () => {
		const parameters = JSON.parse(section('TEMPLATE_PARAMETERS')) as {
			name: string;
			valueValidators?: { type: string; args?: string[] }[];
		}[];
		const validator = parameters
			.find((parameter) => parameter.name === 'scriptUrl')
			?.valueValidators?.find((entry) => entry.type === 'REGEX')?.args?.[0];
		const pattern = new RegExp(validator ?? '(?!)', 'u');

		for (const url of [
			'https://acme.inth.app/c15t.js',
			'https://acme.inth.app/c15t.iab.js',
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.offline.js',
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.headless.js',
		]) {
			expect(pattern.test(url)).toBe(true);
		}
		for (const url of [
			'https://example.com/c15t.js',
			'https://acme.inth.app.example.com/c15t.js',
			'https://acme.inth.app/c15t.gpp.js',
			'https://cdn.jsdelivr.net/npm/@c15t/browser@3.1.0/dist/c15t.devtools.js',
		]) {
			expect(pattern.test(url)).toBe(false);
		}
	});
});

/**
 * GTM's test runner, enough for the template's scenarios: `mock`,
 * `runCode`, `assertApi` and `assertThat`.
 */
describe('GTM template scenarios', () => {
	const tests = section('TESTS');
	const setup =
		/^setup: \|-\n(?<code>[\s\S]*)$/mu.exec(tests)?.groups?.code ?? '';
	const scenarios = [
		...tests.matchAll(
			/^- name: (?<name>.+)\n {2}code: \|-\n(?<code>[\s\S]*?)(?=^- name: |^setup: )/gmu
		),
	].map((match) => ({
		code: match.groups?.code ?? '',
		name: match.groups?.name ?? '',
	}));

	it('has scenarios', () => {
		expect(scenarios.length).toBeGreaterThan(0);
	});

	it.each(scenarios)('$name', ({ code }) => {
		const page = createPage();
		const calls = new Map<string, unknown[][]>();
		const mocks = new Map<string, unknown>();
		const track = (name: string, impl: unknown) =>
			typeof impl === 'function'
				? (...args: unknown[]) => {
						calls.set(name, [...(calls.get(name) ?? []), args]);
						return (impl as (...input: unknown[]) => unknown)(...args);
					}
				: impl;

		const runCode = (data: Record<string, unknown>) => {
			const require = (name: string) => {
				if (mocks.has(name)) {
					return track(name, mocks.get(name));
				}
				// GTM does not run injectScript in tests unless it is mocked.
				return track(
					name,
					name === 'injectScript' ? () => undefined : page.apis[name]
				);
			};
			runTemplate(require, {
				...data,
				gtmOnFailure: track('gtmOnFailure', () => undefined),
				gtmOnSuccess: track('gtmOnSuccess', () => undefined),
			});
		};
		const assertApi = (name: string) => ({
			wasCalled: () => expect(calls.get(name)?.length ?? 0).toBeGreaterThan(0),
			wasCalledWith: (...args: unknown[]) =>
				expect(calls.get(name) ?? []).toContainEqual(args),
			wasNotCalled: () => expect(calls.get(name) ?? []).toEqual([]),
		});
		const assertThat = (actual: unknown) => ({
			isEqualTo: (expected: unknown) => expect(actual).toEqual(expected),
		});
		const mock = (name: string, impl: unknown) => {
			mocks.set(name, impl);
		};

		compile(
			['mock', 'runCode', 'assertApi', 'assertThat'],
			`${setup}\n${code}`
		)(mock, runCode, assertApi, assertThat);
	});
});
