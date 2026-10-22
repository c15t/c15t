/**
 * @vitest-environment jsdom
 */
import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel, ConsentState, Script } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import type { ScriptLoaderHandle } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hubspot } from './vendors/analytics/hubspot';
import type { HubSpotOptions } from './vendors/analytics/hubspot';

const granted = {
	experience: false,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};
const denied = {
	...granted,
	functionality: false,
	marketing: false,
	measurement: false,
};
const yes = { advertisement: true, analytics: true, functionality: true };
const no = { advertisement: false, analytics: false, functionality: false };
const globals = [
	'_hsp',
	'_hsq',
	'disableHubSpotCookieBanner',
	'HubSpotConversations',
	'hsConversationsOnReady',
	'hsConversationsSettings',
] as const;

const conversations = () => {
	const listeners = new Set<() => void>();
	let pending = 0;
	let visible = false;
	const api = {
		clear: vi.fn(),
		completeLoad() {
			expect(pending).toBeGreaterThan(0);
			pending -= 1;
			visible = true;
			for (const listener of listeners) {
				listener();
			}
		},
		listeners,
		off: vi.fn((_event: 'widgetLoaded', listener: () => void) => {
			listeners.delete(listener);
		}),
		on: vi.fn((_event: 'widgetLoaded', listener: () => void) => {
			listeners.add(listener);
		}),
		get pending() {
			return pending;
		},
		get visible() {
			return visible;
		},
		widget: {
			load: vi.fn(() => {
				pending += 1;
			}),
			remove: vi.fn(() => {
				visible = false;
			}),
		},
	};
	return api;
};

interface Owner {
	kernel: ConsentKernel;
	loader?: ScriptLoaderHandle;
	mount: (script?: Script) => ScriptLoaderHandle;
	save: (consents?: ConsentState, vendor?: boolean) => Promise<unknown>;
}

let owners: Owner[];
let errors: unknown[];
let frame: HTMLIFrameElement;
let hostDocument: Document;

beforeEach(() => {
	owners = [];
	errors = [];
	hostDocument = document;
	frame = document.createElement('iframe');
	document.body.appendChild(frame);
	const page = frame.contentWindow;
	const pageDocument = frame.contentDocument;
	if (!page || !pageDocument) {
		throw new Error(
			'The ownership fixture needs an independent browser window'
		);
	}
	vi.stubGlobal('window', page);
	vi.stubGlobal('document', pageDocument);
	vi.stubGlobal(
		'HTMLScriptElement',
		pageDocument.createElement('script').constructor
	);
	vi.stubGlobal('HTMLElement', pageDocument.createElement('div').constructor);
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	for (const owner of owners) {
		owner.loader?.dispose();
		owner.kernel.dispose();
	}
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	frame.remove();
	expect(document).toBe(hostDocument);
	expect(errors).toEqual([]);
});

const ownerOf = async (
	script: Script,
	consents: ConsentState = granted,
	vendor = true,
	deferMount = false
): Promise<Owner> => {
	const kernel = createConsentKernel();
	const owner: Owner = {
		kernel,
		mount(next = script) {
			owner.loader = createScriptLoader({
				kernel,
				onDebug(event) {
					if (event.action === 'error' || event.action === 'callback_error') {
						errors.push(event);
					}
				},
				scripts: [next],
			});
			return owner.loader;
		},
		save(next = granted, allowed = true) {
			return kernel.commands.save(next, { vendors: { hubspot: allowed } });
		},
	};
	owners.push(owner);
	await owner.save(consents, vendor);
	if (!deferMount) {
		owner.mount();
	}
	return owner;
};

const commands = (includeQueued = false) => {
	const queued = window._hsp;
	const recorded: unknown[][] =
		includeQueued && Array.isArray(queued) ? [...queued] : [];
	window._hsp = { push: (command) => recorded.push(command) };
	return recorded;
};

const expectConsent = (recorded: unknown[][], expected: typeof yes) => {
	expect(recorded.findLast(([name]) => name === 'setHubSpotConsent')).toEqual([
		'setHubSpotConsent',
		expected,
	]);
};

const expectNoLoss = (recorded: unknown[][]) => {
	expect(recorded.filter(([name]) => name === 'revokeCookieConsent')).toEqual(
		[]
	);
	for (const command of recorded) {
		expect(command).toEqual(['setHubSpotConsent', yes]);
	}
};

const sharedScripts = (form: 'same Script' | 'distinct helpers') => {
	const first = hubspot({ chat: true, portalId: '53' });
	return [
		first,
		form === 'same Script' ? first : hubspot({ chat: true, portalId: 53 }),
	] as const;
};

it('retains a pending load when a previous SDK client returns', async () => {
	const first = conversations();
	const second = conversations();
	window.HubSpotConversations = first;
	const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
	window.HubSpotConversations = second;
	await owner.save({ ...granted, experience: true });
	window.HubSpotConversations = first;
	await owner.save(granted);
	expect(first.widget.load).toHaveBeenCalledOnce();
	expect(second.widget.load).toHaveBeenCalledOnce();
	expect(first.pending).toBe(1);
	expect(second.pending).toBe(1);
	expect(first.listeners.size).toBe(1);
	expect(second.listeners.size).toBe(0);
	first.completeLoad();
	await owner.save({ ...granted, functionality: false });
	await owner.save();
	expect(first.widget.load).toHaveBeenCalledTimes(2);
});

it('adopts an already-loaded external chat and reloads it after regrant', async () => {
	const api = conversations();
	Object.assign(api.widget, {
		status: () => ({ loaded: api.visible }),
	});
	api.widget.load();
	api.completeLoad();
	api.widget.load.mockClear();
	window.HubSpotConversations = api;
	const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
	expect(api.widget.load).not.toHaveBeenCalled();
	await owner.save({ ...granted, functionality: false });
	expect(api.visible).toBe(false);
	await owner.save(granted);
	expect(api.widget.load).toHaveBeenCalledOnce();
	api.completeLoad();
	expect(api.visible).toBe(true);
});

it('recognizes a pending client that completed while its listener was detached', async () => {
	const first = conversations();
	const second = conversations();
	Object.assign(first.widget, {
		status: () => ({ loaded: first.visible }),
	});
	window.HubSpotConversations = first;
	const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
	window.HubSpotConversations = second;
	await owner.save({ ...granted, experience: true });
	window.HubSpotConversations = first;
	await owner.save(granted);
	expect(first.widget.load).toHaveBeenCalledOnce();
	window.HubSpotConversations = second;
	await owner.save({ ...granted, experience: true });
	first.completeLoad();
	window.HubSpotConversations = first;
	await owner.save(granted);
	expect(first.widget.load).toHaveBeenCalledOnce();
	await owner.save({ ...granted, functionality: false });
	await owner.save(granted);
	expect(first.widget.load).toHaveBeenCalledTimes(2);
	first.completeLoad();
	expect(first.visible).toBe(true);
});

describe.each(['same Script', 'distinct helpers'] as const)(
	'HubSpot independent kernel ownership with %s',
	(form) => {
		for (const reverse of [false, true]) {
			it.each([0, 1])(
				`keeps the survivor active when owner %s leaves, reverse arrival ${reverse}`,
				async (departing) => {
					const api = conversations();
					window.HubSpotConversations = api;
					const scripts = sharedScripts(form);
					const first = await ownerOf(scripts[reverse ? 1 : 0]);
					const second = await ownerOf(scripts[reverse ? 0 : 1]);
					const pair = [first, second];
					const leaving = pair[departing];
					const survivor = pair[1 - departing];
					expect(leaving).toBeDefined();
					expect(survivor).toBeDefined();
					expect(api.listeners.size).toBe(1);
					expect(api.widget.load).toHaveBeenCalledOnce();
					const [listener] = api.listeners;
					const element = document.getElementById('hs-script-loader');
					const recorded = commands();
					leaving?.loader?.dispose();
					expectNoLoss(recorded);
					expect(api.listeners).toEqual(new Set([listener]));
					expect(api.off).not.toHaveBeenCalled();
					expect(api.widget.remove).not.toHaveBeenCalled();
					expect(api.clear).not.toHaveBeenCalled();
					expect(api.widget.load).toHaveBeenCalledOnce();
					expect(document.getElementById('hs-script-loader')).toBe(element);
					expect(survivor?.loader?.getLoadedScriptIds()).toEqual(['hubspot']);
					recorded.length = 0;
					await survivor?.save({ ...granted, functionality: false });
					expect(recorded[0]).toEqual(['revokeCookieConsent']);
					expectConsent(recorded, { ...yes, functionality: false });
					api.completeLoad();
					expect(api.visible).toBe(false);
					expect(api.clear).toHaveBeenLastCalledWith({ resetWidget: false });
					survivor?.loader?.dispose();
					expect(api.listeners.size).toBe(0);
					expect(api.off).toHaveBeenCalledExactlyOnceWith(
						'widgetLoaded',
						listener
					);
					expect(document.getElementById('hs-script-loader')).toBe(element);
				}
			);
		}
	}
);

interface DenialCase {
	name: string;
	category?: HubSpotOptions['category'];
	consents: ConsentState;
	vendor?: boolean;
	expected: typeof yes;
}

const denialCases: DenialCase[] = [
	{
		consents: { ...granted, marketing: false },
		expected: no,
		name: 'whole category',
	},
	{ consents: granted, expected: no, name: 'vendor', vendor: false },
	{
		category: { and: ['marketing', 'measurement'] },
		consents: { ...granted, measurement: false },
		expected: no,
		name: 'compound gate',
	},
	{
		category: 'necessary',
		consents: { ...granted, marketing: false },
		expected: { ...yes, advertisement: false },
		name: 'marketing field',
	},
	{
		consents: { ...granted, measurement: false },
		expected: { ...yes, analytics: false },
		name: 'measurement field',
	},
	{
		consents: { ...granted, functionality: false },
		expected: { ...yes, functionality: false },
		name: 'functionality field',
	},
];

describe('HubSpot consent intersection', () => {
	it('creates no vendor globals for two initially denied memberships', async () => {
		const scripts = sharedScripts('same Script');
		const first = await ownerOf(scripts[0], denied);
		const second = await ownerOf(scripts[1], denied);
		for (const key of globals) {
			expect(key in window).toBe(false);
		}
		expect(document.querySelector('script, link')).toBeNull();
		first.loader?.dispose();
		second.loader?.dispose();
		for (const key of globals) {
			expect(key in window).toBe(false);
		}
	});

	for (const initial of [false, true]) {
		it.each(denialCases)(
			`keeps $name denial effective across another owner's grant, initial denial ${initial}`,
			async ({ category, consents, vendor = true, expected }) => {
				const restrictive = hubspot({ category, chat: true, portalId: '53' });
				const permissive = hubspot({
					category: 'necessary',
					chat: true,
					portalId: 53,
				});
				let first: Owner;
				let second: Owner;
				if (initial) {
					second = await ownerOf(restrictive, vendor ? consents : denied);
					await second.save(consents, vendor);
					first = await ownerOf(permissive);
				} else {
					first = await ownerOf(permissive);
					second = await ownerOf(restrictive);
					await second.save(consents, vendor);
				}
				const blockedBeforeStart = expected === no && initial;
				expect(blockedBeforeStart && globals.some((key) => key in window)).toBe(
					false
				);
				const recorded = commands(true);
				await first.save({ ...granted, experience: true });
				expect(document.querySelector('script') === null).toBe(
					blockedBeforeStart
				);
				expect(
					recorded.findLast(([name]) => name === 'setHubSpotConsent')
				).toEqual(
					blockedBeforeStart ? undefined : ['setHubSpotConsent', expected]
				);
				second.loader?.dispose();
				expectConsent(recorded, yes);
				expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
			}
		);
	}

	it('evaluates each OR gate before intersecting its fields', async () => {
		const script = hubspot({
			category: { or: ['marketing', 'measurement'] },
			portalId: '53',
		});
		const first = await ownerOf(script, { ...granted, measurement: false });
		await ownerOf(script, { ...granted, marketing: false });
		const recorded = commands(true);
		await first.save({ ...granted, experience: true, measurement: false });
		expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
		expectConsent(recorded, {
			advertisement: false,
			analytics: false,
			functionality: true,
		});
	});
});

describe('HubSpot reentrant ownership changes', () => {
	it('forwards denial when a retained granted SDK remounts with denied consent', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const script = hubspot({ chat: true, portalId: '53' });
		const owner = await ownerOf(script);
		api.completeLoad();
		owner.loader?.dispose();
		await owner.save(denied);
		const recorded = commands();
		owner.mount();
		expect(recorded).toContainEqual(['revokeCookieConsent']);
		expectConsent(recorded, no);
		expect(api.widget.remove).toHaveBeenCalledOnce();
		expect(api.clear).toHaveBeenCalledExactlyOnceWith({ resetWidget: false });
		expect(api.visible).toBe(false);
	});
	it.each(['disposal', 'replacement'] as const)(
		'preserves granted consent across a final-owner %s',
		async (departure) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
			api.completeLoad();
			const recorded = commands();
			if (departure === 'disposal') {
				owner.loader?.dispose();
			} else {
				owner.loader?.updateScripts([
					hubspot({ category: 'measurement', chat: true, portalId: '53' }),
				]);
			}
			expectNoLoss(recorded);
			expect(api.widget.remove).not.toHaveBeenCalled();
			expect(api.clear).not.toHaveBeenCalled();
			expect(api.visible).toBe(true);
			expect(owner.kernel.getSnapshot().effectivePermissions).toMatchObject(
				granted
			);
		}
	);
	for (const final of [false, true]) {
		it.each(['category', 'vendor'] as const)(
			`forwards real pending %s withdrawal before ${final ? 'final' : 'non-final'} departure`,
			async (gate) => {
				const api = conversations();
				window.HubSpotConversations = api;
				const script = hubspot({ chat: true, portalId: '53' });
				const departing = await ownerOf(script);
				if (!final) {
					await ownerOf(hubspot({ chat: true, portalId: 53 }));
				}
				const recorded = commands();
				const original = script.onConsentChange;
				let armed = true;
				let withdrawalSaved = false;
				script.onConsentChange = (info) => {
					original?.(info);
					if (armed && info.hasConsent) {
						armed = false;
						void departing.save(
							gate === 'category' ? { ...granted, marketing: false } : granted,
							gate !== 'vendor'
						);
						const snapshot = departing.kernel.getSnapshot();
						withdrawalSaved =
							gate === 'category'
								? snapshot.effectivePermissions.marketing === false
								: snapshot.vendorChoice?.denied.includes('hubspot') === true;
						departing.loader?.dispose();
					}
				};
				await departing.save({ ...granted, experience: true });
				expect(armed).toBe(false);
				expect(withdrawalSaved).toBe(true);
				const revoke = recorded.findIndex(
					([name]) => name === 'revokeCookieConsent'
				);
				expect(revoke).toBeGreaterThanOrEqual(0);
				expect(recorded[revoke + 1]).toEqual(['setHubSpotConsent', no]);
				expectConsent(recorded, final ? no : yes);
				expect(api.widget.remove).toHaveBeenCalled();
				expect(api.clear).toHaveBeenCalledWith({ resetWidget: false });
				expect(api.listeners.size).toBe(final ? 0 : 1);
			}
		);
	}

	it.each(['category', 'vendor'] as const)(
		'rechecks real %s withdrawal made synchronously by the privacy API before loading',
		async (gate) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const owner = await ownerOf(
				hubspot({ chat: true, portalId: '53' }),
				granted,
				true,
				true
			);
			const recorded: unknown[][] = [];
			let armed = true;
			window._hsp = {
				push(command) {
					recorded.push(command);
					if (armed && command[0] === 'setHubSpotConsent') {
						armed = false;
						void owner.save(
							gate === 'category' ? denied : granted,
							gate !== 'vendor'
						);
					}
				},
			};
			owner.mount();
			expect(armed).toBe(false);
			expect(api.widget.load).not.toHaveBeenCalled();
			expect(document.querySelector('script')).toBeNull();
			expectConsent(recorded, no);
		}
	);

	it('replaces one granted configuration without a synthetic denial pulse', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
		await ownerOf(hubspot({ chat: true, portalId: 53 }));
		api.completeLoad();
		const element = document.getElementById('hs-script-loader');
		const recorded = commands();
		owner.loader?.updateScripts([hubspot({ chat: true, portalId: '53' })]);
		expectNoLoss(recorded);
		expect(api.visible).toBe(true);
		expect(api.listeners.size).toBe(1);
		expect(api.widget.remove).not.toHaveBeenCalled();
		expect(api.clear).not.toHaveBeenCalled();
		expect(api.widget.load).toHaveBeenCalledOnce();
		expect(document.getElementById('hs-script-loader')).toBe(element);
		recorded.length = 0;
		await owner.save(granted, false);
		expect(recorded[0]).toEqual(['revokeCookieConsent']);
		expectConsent(recorded, no);
	});

	it.each(['category', 'vendor'] as const)(
		'applies pending real %s withdrawal during replacement before further widget effects',
		async (gate) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
			await ownerOf(hubspot({ chat: true, portalId: 53 }));
			api.completeLoad();
			const element = document.getElementById('hs-script-loader');
			const replacement = hubspot({ chat: true, portalId: '53' });
			const recorded: unknown[][] = [];
			let armed = true;
			window._hsp = {
				push(command) {
					recorded.push(command);
					if (armed && command[0] === 'setHubSpotConsent') {
						armed = false;
						void owner.save(
							gate === 'category' ? denied : granted,
							gate !== 'vendor'
						);
						owner.loader?.updateScripts([replacement]);
					}
				},
			};
			await owner.save({ ...granted, experience: true });
			expect(armed).toBe(false);
			const revoke = recorded.findIndex(
				([name]) => name === 'revokeCookieConsent'
			);
			expect(revoke).toBeGreaterThanOrEqual(0);
			expect(recorded[revoke + 1]).toEqual(['setHubSpotConsent', no]);
			expectConsent(recorded, no);
			expect(api.widget.load).toHaveBeenCalledOnce();
			expect(api.visible).toBe(false);
			expect(api.clear).toHaveBeenCalledWith({ resetWidget: false });
			expect(api.listeners.size).toBe(1);
			expect(document.getElementById('hs-script-loader')).toBe(element);
		}
	);
});

describe('HubSpot physical installation identity', () => {
	const conflicts: { name: string; options: Partial<HubSpotOptions> }[] = [
		{ name: 'portal', options: { portalId: '54' } },
		{
			name: 'effective URL',
			options: { scriptUrl: 'https://proxy.example/53.js' },
		},
		{ name: 'region URL', options: { region: 'eu1' } },
		{ name: 'explicit nonce', options: { nonce: 'second-nonce' } },
	];
	for (const reverse of [false, true]) {
		it.each(conflicts)(
			`rejects conflicting $name without changing the retained installation, reverse arrival ${reverse}`,
			async ({ options }) => {
				const base = { nonce: 'first-nonce', portalId: '53' };
				const alternate = { ...base, ...options };
				const accepted = reverse ? alternate : base;
				const rejected = reverse ? base : alternate;
				const first = await ownerOf(hubspot(accepted));
				const element =
					document.querySelector<HTMLScriptElement>('#hs-script-loader');
				expect(element).not.toBeNull();
				const src = element?.src;
				const nonce = element?.nonce;
				const recorded = commands();
				const second = await ownerOf(hubspot(rejected), denied);
				expect(recorded).toEqual([]);
				await second.save();
				expect(recorded).toEqual([]);
				expect(console.warn).toHaveBeenCalled();
				await first.save({ ...granted, functionality: false });
				expectConsent(recorded, { ...yes, functionality: false });
				first.loader?.dispose();
				second.loader?.dispose();
				expectConsent(recorded, { ...yes, functionality: false });
				recorded.length = 0;
				const incompatible = await ownerOf(hubspot(rejected));
				expect(recorded).toEqual([]);
				incompatible.loader?.dispose();
				await ownerOf(hubspot({ ...accepted, nonce: undefined }));
				expectConsent(recorded, yes);
				expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
				expect(document.getElementById('hs-script-loader')).toBe(element);
				expect(element?.src).toBe(src);
				expect(element?.nonce).toBe(nonce);
			}
		);
	}

	it('accepts normalized portal, matching effective URL, and omitted or equal nonces', async () => {
		const scriptUrl = 'https://proxy.example/53.js';
		const first = await ownerOf(
			hubspot({ nonce: 'same-nonce', portalId: ' 53 ', scriptUrl })
		);
		await ownerOf(
			hubspot({
				nonce: 'same-nonce',
				portalId: 53,
				region: 'ignored-invalid',
				scriptUrl,
			})
		);
		await ownerOf(hubspot({ portalId: '53', region: 'eu1', scriptUrl }));
		const recorded = commands();
		first.loader?.dispose();
		expectNoLoss(recorded);
		expect(console.warn).not.toHaveBeenCalled();
		expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
		expect(
			document.querySelector<HTMLScriptElement>('#hs-script-loader')?.nonce
		).toBe('same-nonce');
	});
});

describe('HubSpot shared chat lifecycle', () => {
	it.each([false, undefined])(
		"intersects a chat %s owner's real functionality denial with another owner's opt-in",
		async (chat) => {
			const api = conversations();
			window.HubSpotConversations = api;
			await ownerOf(hubspot({ chat: true, portalId: '53' }));
			const other = await ownerOf(hubspot({ chat, portalId: 53 }));
			const recorded = commands();
			await other.save({ ...granted, functionality: false });
			expect(recorded[0]).toEqual(['revokeCookieConsent']);
			expectConsent(recorded, { ...yes, functionality: false });
			api.completeLoad();
			expect(api.visible).toBe(false);
			expect(api.listeners.size).toBe(1);
			expect(api.clear).toHaveBeenLastCalledWith({ resetWidget: false });
		}
	);

	for (const chat of [false, undefined]) {
		it.each([false, true])(
			`uses one explicit opt-in without letting chat ${chat} veto it, reverse arrival %s`,
			async (reverse) => {
				const api = conversations();
				window.HubSpotConversations = api;
				let optIn: Owner;
				let optOut: Owner;
				if (reverse) {
					optOut = await ownerOf(hubspot({ chat, portalId: '53' }));
					optIn = await ownerOf(hubspot({ chat: true, portalId: 53 }));
				} else {
					optIn = await ownerOf(hubspot({ chat: true, portalId: 53 }));
					optOut = await ownerOf(hubspot({ chat, portalId: '53' }));
				}
				expect(api.listeners.size).toBe(1);
				expect(api.widget.load).toHaveBeenCalledOnce();
				api.completeLoad();
				expect(api.visible).toBe(true);
				const recorded = commands();
				optIn.loader?.dispose();
				expectNoLoss(recorded);
				expect(api.listeners.size).toBe(0);
				expect(api.widget.remove).not.toHaveBeenCalled();
				expect(api.clear).not.toHaveBeenCalled();
				await optOut.save({ ...granted, functionality: false });
				expect(recorded).toContainEqual(['revokeCookieConsent']);
				expectConsent(recorded, { ...yes, functionality: false });
				expect(api.widget.remove).not.toHaveBeenCalled();
				expect(api.clear).not.toHaveBeenCalled();
			}
		);
	}

	it.each([false, undefined])(
		'leaves manually managed chat alone with chat %s',
		async (chat) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const first = await ownerOf(hubspot({ chat, portalId: '53' }));
			const second = await ownerOf(hubspot({ chat, portalId: 53 }));
			const recorded = commands();
			await second.save({ ...granted, functionality: false });
			expect(recorded).toContainEqual(['revokeCookieConsent']);
			expectConsent(recorded, { ...yes, functionality: false });
			first.loader?.dispose();
			second.loader?.dispose();
			expectConsent(recorded, { ...yes, functionality: false });
			expect(api.on).not.toHaveBeenCalled();
			expect(api.off).not.toHaveBeenCalled();
			expect(api.widget.load).not.toHaveBeenCalled();
			expect(api.widget.remove).not.toHaveBeenCalled();
			expect(api.clear).not.toHaveBeenCalled();
			expect(window.hsConversationsOnReady ?? []).toEqual([]);
		}
	);

	it('detaches the exact old listener when the SDK client changes', async () => {
		const oldClient = conversations();
		window.HubSpotConversations = oldClient;
		const first = await ownerOf(hubspot({ chat: true, portalId: '53' }));
		await ownerOf(hubspot({ chat: true, portalId: 53 }));
		const [oldListener] = oldClient.listeners;
		const nextClient = conversations();
		window.HubSpotConversations = nextClient;
		await first.save({ ...granted, experience: true });
		expect(oldClient.off).toHaveBeenCalledExactlyOnceWith(
			'widgetLoaded',
			oldListener
		);
		expect(oldClient.listeners.size).toBe(0);
		expect(nextClient.listeners.size).toBe(1);
		expect(nextClient.widget.load).toHaveBeenCalledOnce();
		await first.save({ ...granted, functionality: false });
		nextClient.completeLoad();
		expect(nextClient.visible).toBe(false);
		expect(nextClient.clear).toHaveBeenLastCalledWith({ resetWidget: false });
	});

	it('ignores old ready callbacks after final disposal and a new lifecycle', async () => {
		const externalReady = vi.fn();
		window.hsConversationsOnReady = [externalReady];
		const script = hubspot({ chat: true, portalId: '53' });
		const owner = await ownerOf(script);
		const oldReady = window.hsConversationsOnReady.filter(
			(ready) => ready !== externalReady
		);
		expect(oldReady).toHaveLength(1);
		owner.loader?.dispose();
		expect(window.hsConversationsOnReady).toEqual([externalReady]);
		owner.mount();
		const currentReady = window.hsConversationsOnReady.filter(
			(ready) => ready !== externalReady
		);
		expect(currentReady).toHaveLength(1);
		const api = conversations();
		window.HubSpotConversations = api;
		for (const ready of oldReady) {
			ready();
		}
		expect(api.on).not.toHaveBeenCalled();
		expect(api.widget.load).not.toHaveBeenCalled();
		for (const ready of currentReady) {
			ready();
		}
		expect(api.listeners.size).toBe(1);
		expect(api.widget.load).toHaveBeenCalledOnce();
		expect(externalReady).not.toHaveBeenCalled();
	});

	it.each(['remount', 'replacement', 'shared departure', 'manual interval'])(
		'rechecks deferred chat cleanup after %s before SDK readiness',
		async (transition) => {
			const script = hubspot({ chat: true, portalId: '53' });
			const owner = await ownerOf(script);
			const loader = document.getElementById('hs-script-loader');
			const oldReady = [...(window.hsConversationsOnReady ?? [])];
			await owner.save({ ...granted, functionality: false });
			if (
				transition === 'shared departure' ||
				transition === 'manual interval'
			) {
				await ownerOf(
					hubspot({ chat: transition === 'shared departure', portalId: '53' })
				);
				owner.loader?.dispose();
				if (transition === 'manual interval') {
					await owner.save();
					owner.mount();
				}
			} else {
				if (transition === 'remount') {
					owner.loader?.dispose();
				}
				await owner.save();
				if (transition === 'remount') {
					owner.mount();
				} else {
					owner.loader?.updateScripts([
						hubspot({ chat: true, portalId: '53' }),
					]);
				}
			}
			const currentReady = [...(window.hsConversationsOnReady ?? [])];
			expect(currentReady).toHaveLength(1);
			const api = conversations();
			window.HubSpotConversations = api;
			for (const ready of [...oldReady, ...currentReady]) {
				ready();
			}
			expect(api.widget.remove).not.toHaveBeenCalled();
			expect(api.clear).not.toHaveBeenCalled();
			expect(api.widget.load).toHaveBeenCalledOnce();
			api.completeLoad();
			expect(api.visible).toBe(true);
			expect(document.getElementById('hs-script-loader')).toBe(loader);
		}
	);

	it.each(['regrant', 'remount'] as const)(
		'does not reload a permitted pending completion after %s',
		async (transition) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const script = hubspot({ chat: true, portalId: '53' });
			const owner = await ownerOf(script);
			if (transition === 'remount') {
				owner.loader?.dispose();
				owner.mount();
			} else {
				await owner.save({ ...granted, functionality: false });
				await owner.save(granted);
			}
			expect(api.widget.load).toHaveBeenCalledOnce();
			api.completeLoad();
			expect(api.visible).toBe(true);
			await owner.save({ ...granted, experience: true });
			expect(api.widget.load).toHaveBeenCalledOnce();
		}
	);

	it('retains pending loads over final disposal and guards late completion after remount', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const script = hubspot({ chat: true, portalId: '53' });
		const owner = await ownerOf(script);
		const element = document.getElementById('hs-script-loader');
		const [listener] = api.listeners;
		expect(api.pending).toBe(1);
		owner.loader?.dispose();
		expect(api.off).toHaveBeenCalledExactlyOnceWith('widgetLoaded', listener);
		expect(api.pending).toBe(1);
		owner.mount();
		expect(api.listeners.size).toBe(1);
		expect(api.widget.load).toHaveBeenCalledOnce();
		await owner.save({ ...granted, functionality: false });
		api.completeLoad();
		expect(api.visible).toBe(false);
		expect(api.clear).toHaveBeenLastCalledWith({ resetWidget: false });
		expect(document.getElementById('hs-script-loader')).toBe(element);
	});

	it('cleans up a denied remount, then loads the retained client on regrant', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const script = hubspot({ chat: true, portalId: '53' });
		const owner = await ownerOf(script);
		api.completeLoad();
		const element = document.getElementById('hs-script-loader');
		owner.loader?.dispose();
		await owner.save(denied);
		owner.mount();
		expect(api.listeners.size).toBe(1);
		expect(api.visible).toBe(false);
		expect(api.widget.load).toHaveBeenCalledOnce();
		await owner.save();
		expect(api.listeners.size).toBe(1);
		expect(api.on).toHaveBeenCalledTimes(2);
		expect(api.widget.load).toHaveBeenCalledTimes(2);
		await owner.save({ ...granted, functionality: false });
		api.completeLoad();
		expect(api.visible).toBe(false);
		expect(document.getElementById('hs-script-loader')).toBe(element);
	});
});

describe('HubSpot automatic chat attachment', () => {
	it.each(['available', 'late'])(
		'removes initially denied chat from an already-loaded %s SDK',
		async (readiness) => {
			const api = conversations();
			api.widget.load();
			api.completeLoad();
			api.widget.load.mockClear();
			const external = document.createElement('script');
			external.id = 'hs-script-loader';
			external.src = 'https://js.hs-scripts.com/53.js';
			document.head.appendChild(external);
			if (readiness === 'available') {
				window.HubSpotConversations = api;
			}
			const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }), {
				...granted,
				functionality: false,
			});
			if (readiness === 'late') {
				window.HubSpotConversations = api;
				for (const ready of [...(window.hsConversationsOnReady ?? [])]) {
					ready();
				}
			}
			expect(api.on).toHaveBeenCalledOnce();
			expect(api.widget.load).not.toHaveBeenCalled();
			expect(api.widget.remove).toHaveBeenCalledOnce();
			expect(api.clear).toHaveBeenCalledExactlyOnceWith({ resetWidget: false });
			expect(document.getElementById('hs-script-loader')).toBe(external);
			await owner.save({ ...granted, experience: true, functionality: false });
			expect(api.widget.remove).toHaveBeenCalledOnce();
			expect(api.clear).toHaveBeenCalledOnce();
		}
	);

	it('reconciles initial denial when manual chat gains an automatic owner', async () => {
		const api = conversations();
		api.widget.load();
		api.completeLoad();
		api.widget.load.mockClear();
		window.HubSpotConversations = api;
		await ownerOf(hubspot({ chat: false, portalId: '53' }), {
			...granted,
			functionality: false,
		});
		expect(api.on).not.toHaveBeenCalled();
		expect(api.widget.remove).not.toHaveBeenCalled();
		expect(api.clear).not.toHaveBeenCalled();
		await ownerOf(hubspot({ chat: true, portalId: '53' }));
		expect(api.on).toHaveBeenCalledOnce();
		expect(api.widget.load).not.toHaveBeenCalled();
		expect(api.widget.remove).toHaveBeenCalledOnce();
		expect(api.clear).toHaveBeenCalledExactlyOnceWith({ resetWidget: false });
	});

	it('reconciles a replacement client while functionality remains denied', async () => {
		const previous = conversations();
		window.HubSpotConversations = previous;
		const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }), {
			...granted,
			functionality: false,
		});
		const [listener] = previous.listeners;
		const replacement = conversations();
		replacement.widget.load();
		replacement.completeLoad();
		replacement.widget.load.mockClear();
		window.HubSpotConversations = replacement;
		await owner.save({ ...granted, experience: true, functionality: false });
		expect(previous.off).toHaveBeenCalledExactlyOnceWith(
			'widgetLoaded',
			listener
		);
		expect(previous.listeners.size).toBe(0);
		expect(replacement.listeners.size).toBe(1);
		expect(replacement.widget.load).not.toHaveBeenCalled();
		expect(replacement.widget.remove).toHaveBeenCalledOnce();
		expect(replacement.clear).toHaveBeenCalledExactlyOnceWith({
			resetWidget: false,
		});
	});

	it.each([false, true])(
		'reads consent saved inside SDK on before callback delivery, regrant: %s',
		async (regrant) => {
			const script = hubspot({ chat: true, portalId: '53' });
			let delivered = 0;
			const original = script.onConsentChange;
			script.onConsentChange = (info) => {
				delivered += 1;
				original?.(info);
			};
			const withoutFunctionality = { ...granted, functionality: false };
			const owner = await ownerOf(script, withoutFunctionality);
			if (!regrant) {
				await owner.save();
			}
			const api = conversations();
			api.on.mockImplementation((_event, listener) => {
				api.listeners.add(listener);
				const before = delivered;
				void owner.save(regrant ? granted : withoutFunctionality);
				expect(
					owner.kernel.getSnapshot().effectivePermissions.functionality
				).toBe(regrant);
				expect(delivered).toBe(before);
			});
			window.HubSpotConversations = api;
			await owner.save({
				...(regrant ? withoutFunctionality : granted),
				experience: true,
			});
			expect(api.on).toHaveBeenCalledOnce();
			const removalCalls = expect.arrayContaining([[]]);
			const clearCalls = expect.arrayContaining([[{ resetWidget: false }]]);
			expect(api.widget.remove.mock.calls).toEqual(regrant ? [] : removalCalls);
			expect(api.clear.mock.calls).toEqual(regrant ? [] : clearCalls);
			expect(api.widget.load).toHaveBeenCalledTimes(regrant ? 1 : 0);
		}
	);

	it('leaves initially permitted chat intact when attaching a client', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		await ownerOf(hubspot({ chat: true, portalId: '53' }));
		expect(api.widget.load).toHaveBeenCalledOnce();
		expect(api.widget.remove).not.toHaveBeenCalled();
		expect(api.clear).not.toHaveBeenCalled();
	});
});

describe('Independent review reentrant boundary probes', () => {
	it('keeps replacement load restriction through restored-consent API reentry', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const owner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
		const survivor = await ownerOf(hubspot({ chat: true, portalId: '53' }));
		api.completeLoad();
		const replacement = hubspot({ chat: true, portalId: '53' });
		let initial = true;
		let restored = false;
		const recorded: unknown[][] = [];
		window._hsp = {
			push(command) {
				recorded.push(command);
				if (initial && command[0] === 'setHubSpotConsent') {
					initial = false;
					void owner.save(denied);
					owner.loader?.updateScripts([replacement]);
				} else if (
					!restored &&
					command[0] === 'setHubSpotConsent' &&
					(command[1] as typeof yes).functionality
				) {
					restored = true;
					void survivor.save({ ...granted, experience: true });
				}
			},
		};
		await owner.save({ ...granted, experience: true });
		expect(restored).toBe(true);
		expectConsent(recorded, no);
		expect(api.widget.load).toHaveBeenCalledOnce();
	});

	it('does not create fresh chat work while final disposal observes a queued grant', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const script = hubspot({ chat: true, portalId: '53' });
		const owner = await ownerOf(script, { ...granted, functionality: false });
		const original = script.onConsentChange;
		let armed = true;
		script.onConsentChange = (info) => {
			if (armed) {
				armed = false;
				void owner.save(granted);
				owner.loader?.dispose();
			} else {
				original?.(info);
			}
		};
		await owner.save({ ...granted, experience: true, functionality: false });
		expect(api.listeners.size).toBe(0);
		expect(api.widget.load).not.toHaveBeenCalled();
	});
});

describe('Independent review final callback generation', () => {
	it('does not reset a new lifecycle chat request after reentrant off', async () => {
		const api = conversations();
		api.widget.load.mockImplementation(() => {
			for (const listener of api.listeners) {
				listener();
			}
		});
		window.HubSpotConversations = api;
		const oldOwner = await ownerOf(hubspot({ chat: true, portalId: '53' }));
		const newOwner = await ownerOf(
			hubspot({ chat: true, portalId: '53' }),
			granted,
			true,
			true
		);
		let armed = true;
		api.off.mockImplementation((_event, listener) => {
			api.listeners.delete(listener);
			if (armed) {
				armed = false;
				newOwner.mount();
			}
		});
		oldOwner.loader?.dispose();
		expect(api.listeners.size).toBe(1);
		expect(api.widget.load).toHaveBeenCalledTimes(2);
		await newOwner.save({ ...granted, experience: true });
		expect(api.widget.load).toHaveBeenCalledTimes(2);
	});
});

describe('Independent review current reader declaration sweep', () => {
	it('keeps a saved vendor denial authoritative after a reentrant declaration sweep', async () => {
		const script = hubspot({ portalId: '53' });
		const owner = await ownerOf(script);
		let observed: unknown;
		let armed = true;
		const original = script.onConsentChange;
		script.onConsentChange = (info) => {
			if (armed) {
				armed = false;
				void owner.save(granted, false);
				owner.kernel.set.vendors({ declared: [] }, { replaceSource: 'script' });
				const fresh = info.getCurrentConsent?.();
				observed = {
					denied: owner.kernel.getSnapshot().vendorChoice?.denied,
					hasConsent: fresh?.hasConsent,
					vendor: fresh?.vendor,
				};
			}
			original?.(info);
		};
		await owner.save({ ...granted, experience: true });
		expect(observed).toEqual({
			denied: ['hubspot'],
			hasConsent: false,
			vendor: { granted: false, id: 'hubspot' },
		});
	});
});

describe('HubSpot withdrawal during sibling teardown', () => {
	it.each(['category', 'vendor'] as const)(
		'forwards a %s withdrawal saved after final release only on remount',
		async (denial) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const script = hubspot({ chat: true, portalId: '53' });
			const owner = await ownerOf(script);
			api.completeLoad();
			owner.loader?.updateScripts([
				script,
				{
					callbackOnly: true,
					category: 'necessary',
					id: 'later-script',
					onDispose() {
						void owner.save(
							denial === 'category' ? denied : granted,
							denial !== 'vendor'
						);
					},
				},
			]);
			const recorded = commands();
			owner.loader?.dispose();
			expect(recorded).toEqual([]);
			expect(api.widget.remove).not.toHaveBeenCalled();
			expect(api.visible).toBe(true);
			expect(api.listeners.size).toBe(0);
			expect(owner.kernel.getSnapshot().effectivePermissions.marketing).toBe(
				denial !== 'category'
			);
			expect(owner.kernel.getSnapshot().vendorChoice?.denied ?? []).toEqual(
				denial === 'vendor' ? ['hubspot'] : []
			);
			owner.mount();
			expect(recorded).toContainEqual(['revokeCookieConsent']);
			expectConsent(recorded, no);
			expect(api.widget.remove).toHaveBeenCalledOnce();
			expect(api.visible).toBe(false);
		}
	);
	it.each(['category', 'vendor'] as const)(
		'keeps a reentrant %s denial effective until its registration leaves',
		async (denial) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const script = hubspot({ portalId: '53' });
			const owner = await ownerOf(script);
			const survivor = await ownerOf(hubspot({ chat: true, portalId: '53' }), {
				...granted,
				functionality: false,
			});
			let prematureLoads = -1;
			owner.loader?.updateScripts([
				{
					callbackOnly: true,
					category: 'necessary',
					id: 'earlier-script',
					onDispose() {
						void owner.save(
							denial === 'category' ? denied : granted,
							denial !== 'vendor'
						);
						void survivor.save(granted);
						prematureLoads = api.widget.load.mock.calls.length;
					},
				},
				script,
			]);
			const recorded = commands();
			owner.loader?.dispose();
			expect(prematureLoads).toBe(0);
			expect(recorded).toContainEqual(['revokeCookieConsent']);
			expect(recorded).toContainEqual(['setHubSpotConsent', no]);
			expectConsent(recorded, yes);
			expect(api.widget.load).toHaveBeenCalledOnce();
		}
	);
});

describe('HubSpot replacement completion', () => {
	it.each(['invalid portal', 'plain script', 'conflicting portal'] as const)(
		'loads the eligible independent survivor after replacement with %s',
		async (replacement) => {
			const api = conversations();
			window.HubSpotConversations = api;
			const owner = await ownerOf(
				hubspot({ chat: true, portalId: '53' }),
				denied
			);
			await ownerOf(hubspot({ chat: true, portalId: '53' }));
			expect(api.widget.load).not.toHaveBeenCalled();
			const invalid = vi.spyOn(console, 'error').mockImplementation(() => {});
			const next: Script =
				replacement === 'plain script'
					? { callbackOnly: true, category: 'necessary', id: 'hubspot' }
					: hubspot({
							chat: true,
							portalId: replacement === 'invalid portal' ? '' : '54',
						});
			owner.loader?.updateScripts([next]);
			expect(document.getElementById('hs-script-loader')).not.toBeNull();
			expect(api.widget.load).toHaveBeenCalledOnce();
			invalid.mockRestore();
		}
	);
});

describe('HubSpot complete replacement boundary', () => {
	it('holds replacement load suppression through a later sibling disposal callback', async () => {
		const api = conversations();
		window.HubSpotConversations = api;
		const firstScript = hubspot({ chat: true, portalId: '53' });
		const first = await ownerOf(
			firstScript,
			{ ...granted, functionality: false },
			true,
			true
		);
		const other = await ownerOf(hubspot({ chat: true, portalId: '53' }));
		const trigger: Script = {
			callbackOnly: true,
			category: 'necessary',
			id: 'sibling-cleanup',
			onDispose() {
				void other.save({ ...granted, experience: true });
			},
		};
		first.loader = createScriptLoader({
			kernel: first.kernel,
			scripts: [firstScript, trigger],
		});
		expect(api.widget.load).toHaveBeenCalledOnce();
		api.completeLoad();
		// Joining the first owner removes the previously permitted widget. It stays denied.
		const before = api.widget.load.mock.calls.length;
		const recorded = commands();
		first.loader.updateScripts([
			hubspot({ category: 'functionality', chat: true, portalId: '53' }),
		]);
		expect(api.widget.load).toHaveBeenCalledTimes(before);
		expectConsent(recorded, no);
	});
});

it('preserves a queued grant when another owner leaves from a release grant callback', async () => {
	const api = conversations();
	window.HubSpotConversations = api;
	const script = hubspot({ chat: true, portalId: '53' });
	const first = await ownerOf(script, { ...granted, functionality: false });
	const other = await ownerOf(hubspot({ chat: true, portalId: '53' }));
	const recorded: unknown[][] = [];
	let secondDisposed = false;
	window._hsp = {
		push(command) {
			recorded.push(command);
			if (
				!secondDisposed &&
				command[0] === 'setHubSpotConsent' &&
				(command[1] as typeof yes).functionality
			) {
				secondDisposed = true;
				other.loader?.dispose();
			}
		},
	};
	const original = script.onConsentChange;
	let armed = true;
	script.onConsentChange = (info) => {
		if (armed) {
			armed = false;
			void first.save(granted);
			first.loader?.dispose();
		} else {
			original?.(info);
		}
	};
	await first.save({ ...granted, experience: true, functionality: false });
	expect(secondDisposed).toBe(true);
	expect(api.listeners.size).toBe(0);
	expectConsent(recorded, yes);
	expectNoLoss(recorded);
	expect(api.widget.load).not.toHaveBeenCalled();
});
describe('HubSpot external installation compatibility', () => {
	it.each(['URL', 'nonce'] as const)(
		'blocks an external %s conflict across grants and remounts',
		async (conflict) => {
			const existing = document.createElement('script');
			existing.id = 'hs-script-loader';
			existing.src =
				conflict === 'URL'
					? 'https://js.hs-scripts.com/54.js'
					: 'https://js.hs-scripts.com/53.js';
			existing.nonce = 'external';
			document.head.appendChild(existing);
			const api = conversations();
			window.HubSpotConversations = api;
			const script = hubspot({ chat: true, nonce: 'selected', portalId: '53' });
			const owner = await ownerOf(script);
			await owner.save(denied);
			owner.loader?.dispose();
			owner.mount();
			await owner.save(granted);
			for (const name of [
				'_hsp',
				'_hsq',
				'disableHubSpotCookieBanner',
				'hsConversationsSettings',
				'hsConversationsOnReady',
			] as const) {
				expect(window[name]).toBeUndefined();
			}
			expect(api.on).not.toHaveBeenCalled();
			expect(api.widget.load).not.toHaveBeenCalled();
			expect(document.getElementById('hs-script-loader')).toBe(existing);
			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				'hubspot: #hs-script-loader has an incompatible URL or nonce. Consent forwarding and automatic chat will not start. Remove the other installation and reload.'
			);
		}
	);
});
