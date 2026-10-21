/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
	eloquaTracking as EloquaTrackingFactory,
	EloquaTrackingOptions,
} from './vendors/analytics/oracle-eloqua';

let eloquaTracking: typeof EloquaTrackingFactory;

const denied = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};
const granted = { ...denied, marketing: true };
const defaultUrl = 'https://img.en25.com/i/elqCfg.min.js';
const account = {
	firstPartyCookieDomain: 'tracking-a.example.com',
	siteId: '1973398186',
};
type Behavior =
	| 'response'
	| 'missing'
	| 'throw'
	| 'throw-after-response'
	| 'deferred'
	| 'unmatched'
	| 'malformed';
type ConsentCommand = 'elqOptIn' | 'elqOptOut';
interface Command {
	args: unknown[];
	domain: string | undefined;
	siteId: string | undefined;
}
interface Response {
	element: HTMLScriptElement;
	permitted: boolean;
}
const owners: {
	kernel: ReturnType<typeof createConsentKernel>;
	loader: ReturnType<typeof createScriptLoader>;
}[] = [];
const responses: Response[] = [];
let report: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
	vi.resetModules();
	({ eloquaTracking } = await import('./vendors/analytics/oracle-eloqua'));
	document.cookie = 'OPTIN=0; path=/';
	report = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	for (const owner of owners.splice(0).reverse()) {
		owner.loader.dispose();
		owner.kernel.dispose();
	}
	// Disposal can append a corrective response to an earlier opt-in.
	for (const response of responses) {
		response.element.dispatchEvent(new Event('error'));
	}
	responses.length = 0;
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	document.cookie = 'OPTIN=; max-age=0; path=/';
	delete window._elqQ;
	vi.restoreAllMocks();
});

const register = async (
	options: EloquaTrackingOptions = account,
	consents = granted
) => {
	const kernel = createConsentKernel();
	await kernel.commands.save(consents);
	const script = eloquaTracking(options);
	const loader = createScriptLoader({ kernel, scripts: [script] });
	const owner = { kernel, loader, script };
	owners.push(owner);
	return owner;
};

const getLoader = (url = defaultUrl): HTMLScriptElement => {
	const element = Array.from(document.scripts).find(
		(candidate) => candidate.src === url
	);
	expect(element).toBeDefined();
	if (!element) {
		throw new Error(`Expected Eloqua SDK ${url}`);
	}
	return element;
};

const installSdk = (
	element: HTMLScriptElement,
	postResponseFailure: { value: unknown } = {
		value: new Error('SDK consent push failed after insertion'),
	}
) => {
	let siteId: string | undefined;
	let domain: string | undefined;
	const commands: Command[] = [];
	const behavior: Record<ConsentCommand, Behavior> = {
		elqOptIn: 'response',
		elqOptOut: 'response',
	};
	const appendResponse = (
		command: ConsentCommand,
		configuredSite: string,
		configuredDomain: string | undefined,
		unmatched: boolean,
		malformed = false
	) => {
		const response = document.createElement('script');
		const url = new URL(
			`https://${configuredDomain ?? `s${configuredSite}.t.eloqua.com`}/visitor/v200/svrGP`
		);
		url.searchParams.set('pps', command === 'elqOptIn' ? '41' : '42');
		url.searchParams.set('siteid', unmatched ? '9999999999' : configuredSite);
		response.src = malformed ? 'https://' : url.href;
		document.head.append(response);
		responses.push({ element: response, permitted: command === 'elqOptIn' });
	};
	const dispatcher = {
		push(...batch: unknown[][]) {
			for (const args of batch) {
				const [method] = args;
				if (method === 'elqSetSiteId') {
					siteId = String(args[1]);
				} else if (method === 'elqUseFirstPartyCookie') {
					domain = String(args[1]);
				}
				commands.push({ args: [...args], domain, siteId });
				if (method !== 'elqOptIn' && method !== 'elqOptOut') {
					continue;
				}
				const mode = behavior[method];
				if (mode === 'throw') {
					throw new Error('SDK consent push failed');
				}
				// Like the saved SDK, an unconfigured dispatcher emits no response.
				if (!siteId || mode === 'missing') {
					continue;
				}
				const configuredSite = siteId;
				const configuredDomain = domain;
				if (mode === 'deferred') {
					queueMicrotask(() =>
						appendResponse(method, configuredSite, configuredDomain, false)
					);
				} else {
					appendResponse(
						method,
						configuredSite,
						configuredDomain,
						mode === 'unmatched',
						mode === 'malformed'
					);
					if (mode === 'throw-after-response') {
						throw postResponseFailure.value;
					}
				}
			}
		},
	};
	const queue = window._elqQ;
	window._elqQ = dispatcher;
	if (Array.isArray(queue)) {
		for (const command of queue) {
			dispatcher.push(command);
		}
	}
	return {
		behavior,
		commands,
		load: () => element.dispatchEvent(new Event('load')),
	};
};

const finish = (pps: '41' | '42') => {
	const response = responses.find(
		(candidate) =>
			candidate.element.isConnected &&
			new URL(candidate.element.src).searchParams.get('pps') === pps
	);
	expect(response).toBeDefined();
	if (!response) {
		throw new Error(`Expected consent response ${pps}`);
	}
	document.cookie = `OPTIN=${response.permitted ? '1' : '0'}; path=/`;
	response.element.dispatchEvent(new Event('load'));
	response.element.remove();
	return response.element;
};

const actions = (sdk: ReturnType<typeof installSdk>) =>
	sdk.commands
		.filter(({ args }) =>
			['elqOptIn', 'elqOptOut', 'elqTrackPageView'].includes(String(args[0]))
		)
		.map(({ args }) => args);

describe('Eloqua consent response failures through the core loader', () => {
	it.each(
		[undefined, null, false, 0, ''].flatMap((value) => [
			{ corrective: false, value },
			{ corrective: true, value },
		])
	)(
		'quarantines a matching response followed by throw $value, corrective=$corrective',
		async ({ corrective, value }) => {
			const scriptUrl = 'https://tracking-a.example.com/eloqua.js';
			const owner = await register({ ...account, scriptUrl });
			const sdk = installSdk(getLoader(scriptUrl), { value });
			sdk.behavior[corrective ? 'elqOptOut' : 'elqOptIn'] =
				'throw-after-response';
			sdk.load();
			if (corrective) {
				owner.loader.dispose();
				finish('41');
			}
			const dispatched = corrective
				? [['elqOptIn'], ['elqOptOut']]
				: [['elqOptIn']];
			expect(actions(sdk)).toEqual(dispatched);
			expect(report.mock.calls.flat().join(' ')).toContain(
				'Reload before tracking again.'
			);
			finish(corrective ? '42' : '41');
			sdk.behavior.elqOptIn = 'response';
			sdk.behavior.elqOptOut = 'response';
			owner.loader.updateScripts([owner.script]);
			await owner.kernel.commands.save(denied);
			await owner.kernel.commands.save(granted);
			owner.loader.dispose();
			const remount = await register({ ...account, scriptUrl });
			remount.loader.updateScripts([remount.script]);
			expect(actions(sdk)).toEqual(dispatched);
			expect(responses).toHaveLength(corrective ? 2 : 1);
		}
	);

	it.each([false, true])(
		'quarantines a malformed response without escaping the listener, pending 41=%s',
		async (pendingOptIn) => {
			const errors: unknown[] = [];
			const onError = (event: ErrorEvent) => {
				errors.push(event.error);
				event.preventDefault();
			};
			window.addEventListener('error', onError);
			try {
				const owner = await register();
				const sdk = installSdk(getLoader());
				if (pendingOptIn) {
					sdk.load();
					sdk.behavior.elqOptOut = 'malformed';
					owner.loader.dispose();
					finish('41');
				} else {
					sdk.behavior.elqOptIn = 'malformed';
					sdk.load();
				}
				expect(errors).toEqual([]);
				expect(report).toHaveBeenCalledWith(
					expect.stringContaining('Reload before tracking again.'),
					expect.any(Error)
				);
				const before = actions(sdk);
				const responseCount = responses.length;
				owner.loader.updateScripts([owner.script]);
				expect(() => owner.loader.dispose()).not.toThrow();
				const deniedOwner = await register(account, denied);
				deniedOwner.loader.updateScripts([deniedOwner.script]);
				expect(actions(sdk)).toEqual(before);
				expect(responses).toHaveLength(responseCount);
				expect(
					actions(sdk).some(([method]) => method === 'elqTrackPageView')
				).toBe(false);
				expect(document.cookie).toContain(pendingOptIn ? 'OPTIN=1' : 'OPTIN=0');
				expect(errors).toEqual([]);
			} finally {
				window.removeEventListener('error', onError);
			}
		}
	);

	it('reports a missing initial 41 and retries only after explicit updateScripts', async () => {
		const owner = await register();
		const sdk = installSdk(getLoader());
		sdk.behavior.elqOptIn = 'missing';
		sdk.load();
		expect(actions(sdk)).toEqual([['elqOptIn']]);
		expect(responses).toHaveLength(0);
		expect(document.cookie).toContain('OPTIN=0');
		expect(report).toHaveBeenCalled();
		sdk.behavior.elqOptIn = 'response';
		await Promise.resolve();
		expect(actions(sdk)).toEqual([['elqOptIn']]);
		owner.loader.updateScripts([owner.script]);
		expect(actions(sdk)).toEqual([['elqOptIn'], ['elqOptIn']]);
		finish('41');
		expect(actions(sdk)).toEqual([
			['elqOptIn'],
			['elqOptIn'],
			['elqTrackPageView', window.location.href],
		]);
		expect(document.cookie).toContain('OPTIN=1');
	});

	it('keeps OPTIN=1 after a missing withdrawal until an explicit retry responds', async () => {
		const owner = await register();
		const sdk = installSdk(getLoader());
		sdk.load();
		finish('41');
		sdk.behavior.elqOptOut = 'missing';
		await owner.kernel.commands.save(denied);
		expect(actions(sdk)).toEqual([
			['elqOptIn'],
			['elqTrackPageView', window.location.href],
			['elqOptOut'],
		]);
		expect(document.cookie).toContain('OPTIN=1');
		expect(report).toHaveBeenCalled();
		sdk.behavior.elqOptOut = 'response';
		await Promise.resolve();
		expect(responses.filter(({ element }) => element.isConnected)).toEqual([]);
		owner.loader.updateScripts([owner.script]);
		expect(actions(sdk).at(-1)).toEqual(['elqOptOut']);
		expect(
			actions(sdk).filter(([method]) => method === 'elqOptOut')
		).toHaveLength(2);
		expect(document.cookie).toContain('OPTIN=1');
		finish('42');
		expect(document.cookie).toContain('OPTIN=0');
		expect(
			actions(sdk).filter(([method]) => method === 'elqTrackPageView')
		).toHaveLength(1);
	});

	it('releases the final owner and removes its tag when disposal cannot create 42', async () => {
		const owner = await register();
		const element = getLoader();
		const sdk = installSdk(element);
		sdk.load();
		finish('41');
		sdk.behavior.elqOptOut = 'missing';
		owner.loader.dispose();
		expect(element.isConnected).toBe(false);
		expect(document.cookie).toContain('OPTIN=1');
		expect(report).toHaveBeenCalled();
		expect(actions(sdk)).toEqual([
			['elqOptIn'],
			['elqTrackPageView', window.location.href],
			['elqOptOut'],
		]);
		const remount = await register();
		const fresh = installSdk(getLoader());
		fresh.load();
		finish('41');
		expect(actions(fresh)).toEqual([
			['elqOptIn'],
			['elqTrackPageView', window.location.href],
		]);
		await remount.kernel.commands.save(denied);
		finish('42');
		expect(document.cookie).toContain('OPTIN=0');
	});

	it.each(
		(['missing', 'throw'] as const).flatMap((behavior) =>
			[false, true].map((pending) => ({ behavior, pending }))
		)
	)(
		'retries a $behavior disposal 42 on an initially denied remount, pending 41=$pending',
		async ({ behavior, pending }) => {
			const owner = await register();
			const element = getLoader();
			const sdk = installSdk(element);
			sdk.load();
			if (!pending) {
				finish('41');
			}
			sdk.behavior.elqOptOut = behavior;
			owner.loader.dispose();
			expect(element.isConnected).toBe(false);
			if (pending) {
				finish('41');
			}
			expect(actions(sdk)).toEqual(
				pending
					? [['elqOptIn'], ['elqOptOut']]
					: [
							['elqOptIn'],
							['elqTrackPageView', window.location.href],
							['elqOptOut'],
						]
			);
			expect(report).toHaveBeenCalled();
			expect(document.cookie).toContain('OPTIN=1');
			expect(document.querySelector('script[src]')).toBeNull();
			const before = actions(sdk);
			const replacementQueue: unknown[][] = [];
			window._elqQ = replacementQueue;
			sdk.behavior.elqOptOut = 'response';
			await Promise.resolve();
			expect(actions(sdk)).toEqual(before);
			await register(account, denied);
			expect(actions(sdk).slice(before.length)).toEqual([['elqOptOut']]);
			expect(replacementQueue).toEqual([]);
			expect(document.cookie).toContain('OPTIN=1');
			const retry = responses.at(-1)?.element;
			expect(Array.from(document.querySelectorAll('script[src]'))).toEqual([
				retry,
			]);
			expect(retry?.src).toBe(
				`https://${account.firstPartyCookieDomain}/visitor/v200/svrGP?pps=42&siteid=${account.siteId}`
			);
			finish('42');
			expect(document.cookie).toContain('OPTIN=0');
			expect(actions(sdk).slice(before.length)).toEqual([['elqOptOut']]);
			expect(document.querySelector('script[src]')).toBeNull();
		}
	);

	it.each(['missing', 'throw'] as const)(
		'contains a corrective 42 %s failure in a pending 41 DOM completion',
		async (behavior) => {
			const owner = await register();
			const element = getLoader();
			const sdk = installSdk(element);
			const escaped: unknown[] = [];
			const capture = (event: ErrorEvent) => {
				escaped.push(event.error);
				event.preventDefault();
			};
			window.addEventListener('error', capture);
			try {
				sdk.load();
				owner.loader.dispose();
				expect(element.isConnected).toBe(false);
				expect(actions(sdk)).toEqual([['elqOptIn']]);
				sdk.behavior.elqOptOut = behavior;
				finish('41');
				expect(escaped).toEqual([]);
				expect(report).toHaveBeenCalled();
				expect(actions(sdk)).toEqual([['elqOptIn'], ['elqOptOut']]);
				expect(document.cookie).toContain('OPTIN=1');
				await Promise.resolve();
				expect(actions(sdk)).toHaveLength(2);
			} finally {
				window.removeEventListener('error', capture);
			}
		}
	);

	it('contains a thrown initial push and permits an explicit stock-loader retry', async () => {
		const owner = await register();
		const sdk = installSdk(getLoader());
		sdk.behavior.elqOptIn = 'throw';
		expect(() => sdk.load()).not.toThrow();
		expect(report).toHaveBeenCalled();
		expect(actions(sdk)).toEqual([['elqOptIn']]);
		expect(document.cookie).toContain('OPTIN=0');
		sdk.behavior.elqOptIn = 'response';
		owner.loader.updateScripts([owner.script]);
		finish('41');
		expect(actions(sdk)).toEqual([
			['elqOptIn'],
			['elqOptIn'],
			['elqTrackPageView', window.location.href],
		]);
	});

	it.each([
		'missing',
		'deferred',
		'unmatched',
		'throw',
		'throw-after-response',
	] as const)(
		'quarantines a custom loader with a %s response across disposal and fresh work',
		async (behavior) => {
			const scriptUrl = 'https://tracking-a.example.com/eloqua.js';
			const owner = await register({ ...account, scriptUrl });
			const element = getLoader(scriptUrl);
			const sdk = installSdk(element);
			sdk.behavior.elqOptIn = behavior;
			sdk.load();
			await Promise.resolve();
			expect(report).toHaveBeenCalled();
			expect(report.mock.calls.flat().join(' ')).toMatch(/reload/iu);
			sdk.behavior.elqOptIn = 'response';
			owner.loader.updateScripts([owner.script]);
			await owner.kernel.commands.save(denied);
			await owner.kernel.commands.save(granted);
			for (const response of responses) {
				document.cookie = 'OPTIN=1; path=/';
				response.element.dispatchEvent(new Event('load'));
				response.element.dispatchEvent(new Event('load'));
			}
			expect(actions(sdk)).toEqual([['elqOptIn']]);
			owner.loader.dispose();
			expect(element.isConnected).toBe(false);
			const independent = await register();
			independent.loader.updateScripts([independent.script]);
			await Promise.resolve();
			expect(
				Array.from(document.scripts).filter(({ src }) => src === defaultUrl)
			).toEqual([]);
			expect(actions(sdk)).toEqual([['elqOptIn']]);
		}
	);
});

const conflictPairs: { name: string; other: EloquaTrackingOptions }[] = [
	{
		name: 'site only',
		other: { ...account, siteId: '1973398187' },
	},
	{
		name: 'domain only',
		other: { ...account, firstPartyCookieDomain: 'tracking-b.example.com' },
	},
	{
		name: 'site and domain',
		other: {
			firstPartyCookieDomain: 'tracking-b.example.com',
			siteId: '1973398187',
		},
	},
	{
		name: 'configured and absent domain',
		other: { siteId: account.siteId },
	},
];
const orderedPairs = conflictPairs.flatMap(({ name, other }) => [
	{ first: account, name: `${name}, A first`, second: other },
	{ first: other, name: `${name}, B first`, second: account },
]);

describe('Eloqua account conflicts through independent core kernels', () => {
	it.each(orderedPairs)(
		'blocks SDK bootstrap until a preexisting conflict is removed: $name',
		async ({ first, second }) => {
			const survivor = await register(first, denied);
			const conflict = await register(second, denied);
			await survivor.kernel.commands.save(granted);
			expect(window._elqQ).toBeUndefined();
			expect(document.querySelector('script[src]')).toBeNull();
			await conflict.kernel.commands.save(granted);
			expect(window._elqQ).toBeUndefined();
			expect(document.querySelector('script[src]')).toBeNull();
			expect(report).toHaveBeenCalled();
			conflict.loader.dispose();
			const sdk = installSdk(getLoader());
			sdk.load();
			finish('41');
			expect(actions(sdk)).toEqual([
				['elqOptIn'],
				['elqTrackPageView', window.location.href],
			]);
			for (const command of sdk.commands) {
				expect(command.siteId).toBe(String(first.siteId));
			}
		}
	);

	it.each(
		orderedPairs.flatMap((pair) =>
			[false, true].flatMap((completed) =>
				[false, true].map((conflictGranted) => ({
					...pair,
					completed,
					conflictGranted,
				}))
			)
		)
	)(
		'serializes installed-account denial and resumes after conflict removal: $name, 41 completed=$completed, adopter granted=$conflictGranted',
		async ({ first, second, completed, conflictGranted }) => {
			const survivor = await register(first);
			const element = getLoader();
			const sdk = installSdk(element);
			sdk.load();
			if (completed) {
				finish('41');
			}
			const conflict = await register(
				second,
				conflictGranted ? granted : denied
			);
			await Promise.resolve();
			expect(getLoader()).toBe(element);
			expect(report).toHaveBeenCalled();
			expect(actions(sdk)).toEqual(
				completed
					? [
							['elqOptIn'],
							['elqTrackPageView', window.location.href],
							['elqOptOut'],
						]
					: [['elqOptIn']]
			);
			if (!completed) {
				finish('41');
			}
			expect(actions(sdk)).toEqual(
				completed
					? [
							['elqOptIn'],
							['elqTrackPageView', window.location.href],
							['elqOptOut'],
						]
					: [['elqOptIn'], ['elqOptOut']]
			);
			const optOut = responses.at(-1);
			expect(
				new URL(optOut?.element.src ?? '').searchParams.get('siteid')
			).toBe(String(first.siteId));
			expect(new URL(optOut?.element.src ?? '').hostname).toBe(
				first.firstPartyCookieDomain ?? `s${first.siteId}.t.eloqua.com`
			);
			finish('42');
			expect(document.cookie).toContain('OPTIN=0');
			const callsBefore = actions(sdk).length;
			conflict.loader.dispose();
			expect(actions(sdk).slice(callsBefore)).toEqual([['elqOptIn']]);
			finish('41');
			expect(actions(sdk).slice(callsBefore)).toEqual([
				['elqOptIn'],
				['elqTrackPageView', window.location.href],
			]);
			expect(document.cookie).toContain('OPTIN=1');
			for (const { siteId } of sdk.commands) {
				expect(siteId).toBe(String(first.siteId));
			}
			for (const { args } of sdk.commands.filter(
				(command) => command.args[0] === 'elqUseFirstPartyCookie'
			)) {
				expect(args[1]).toBe(first.firstPartyCookieDomain);
			}
			for (const { domain } of sdk.commands.filter(({ args }) =>
				['elqOptIn', 'elqOptOut', 'elqTrackPageView'].includes(String(args[0]))
			)) {
				expect(domain).toBe(first.firstPartyCookieDomain);
			}
			const beforeDispose = actions(sdk).length;
			survivor.loader.dispose();
			finish('42');
			expect(actions(sdk).slice(beforeDispose)).toEqual([['elqOptOut']]);
			expect(element.isConnected).toBe(false);
			expect(document.cookie).toContain('OPTIN=0');
		}
	);

	it.each(orderedPairs)(
		'retains the installed identity after all tags and owners are removed: $name',
		async ({ first, second }) => {
			const initial = await register(first);
			const element = getLoader();
			const sdk = installSdk(element);
			sdk.load();
			finish('41');
			initial.loader.dispose();
			finish('42');
			expect(element.isConnected).toBe(false);
			const before = [...sdk.commands];
			const conflict = await register(second);
			conflict.loader.updateScripts([conflict.script]);
			expect(document.querySelector('script[src]')).toBeNull();
			expect(sdk.commands).toEqual(before);
			expect(report).toHaveBeenCalled();
			conflict.loader.dispose();
			await register(first);
			const fresh = installSdk(getLoader());
			fresh.load();
			finish('41');
			expect(actions(fresh)).toEqual([
				['elqOptIn'],
				['elqTrackPageView', window.location.href],
			]);
		}
	);

	it.each(
		orderedPairs.flatMap((pair) =>
			[false, true].map((sdkLoaded) => ({ ...pair, sdkLoaded }))
		)
	)(
		'keeps a removed tag bound to its account until late work finishes: $name, SDK loaded=$sdkLoaded',
		async ({ first, second, sdkLoaded }) => {
			const initial = await register(first);
			const detached = getLoader();
			const sdk = sdkLoaded ? installSdk(detached) : undefined;
			sdk?.load();
			initial.loader.dispose();
			expect(detached.isConnected).toBe(false);
			const conflict = await register(second);
			expect(document.querySelector(`script[src="${defaultUrl}"]`)).toBeNull();
			const completedSdk = sdk ?? installSdk(detached);
			if (sdkLoaded) {
				finish('41');
			} else {
				completedSdk.load();
			}
			expect(
				actions(completedSdk).filter(([method]) => method !== 'elqOptOut')
			).toEqual(sdkLoaded ? [['elqOptIn']] : []);
			const denials = actions(completedSdk).filter(
				([method]) => method === 'elqOptOut'
			);
			expect(denials.length).toBeGreaterThanOrEqual(Number(sdkLoaded));
			expect(denials.length).toBeLessThanOrEqual(1);
			for (const response of responses.filter(
				(candidate) => candidate.element.isConnected && !candidate.permitted
			)) {
				document.cookie = 'OPTIN=0; path=/';
				response.element.dispatchEvent(new Event('load'));
				response.element.remove();
			}
			for (const command of completedSdk.commands) {
				expect(command.siteId).toBe(String(first.siteId));
			}
			expect(document.cookie).toContain('OPTIN=0');
			expect(document.querySelector('script[src]')).toBeNull();
			conflict.loader.dispose();
			await register(first);
			const active = installSdk(getLoader());
			active.load();
			finish('41');
			expect(actions(active)).toEqual([
				['elqOptIn'],
				['elqTrackPageView', window.location.href],
			]);
		}
	);
});
