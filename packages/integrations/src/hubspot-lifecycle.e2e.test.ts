/**
 * @vitest-environment jsdom
 */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { hubspot } from './vendors/analytics/hubspot';

const allConsents = {
	...grantedMarketingConsents,
	functionality: true,
	measurement: true,
};
const deniedHubSpotConsent = {
	advertisement: false,
	analytics: false,
	functionality: false,
};
const hubspotGlobals = [
	'_hsp',
	'_hsq',
	'disableHubSpotCookieBanner',
	'HubSpotConversations',
	'hsConversationsOnReady',
	'hsConversationsSettings',
] as const;

const conversationsApi = () => {
	const listeners = new Set<() => void>();
	return {
		clear: vi.fn(),
		emitWidgetLoaded() {
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
		widget: {
			load: vi.fn(),
			remove: vi.fn(),
		},
	};
};

describe('HubSpot core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of hubspotGlobals) {
			Reflect.deleteProperty(window, key);
		}
	});

	it('creates no HubSpot globals or elements before marketing consent', () => {
		const scripts = [hubspot({ chat: true, portalId: '53' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		updateScripts(scripts, { ...deniedConsents, functionality: true });
		updateScripts(scripts, {
			...grantedMeasurementConsents,
			functionality: true,
		});
		for (const key of hubspotGlobals) {
			expect(key in window).toBe(false);
		}
		expect(document.querySelector('script, link')).toBeNull();
	});

	it('suppresses the banner and forwards real categories before insertion', () => {
		const beforeAppend = vi.fn();
		installHeadProbe((element) => {
			if (element.id !== 'hs-script-loader') {
				return;
			}
			beforeAppend();
			expect(window.disableHubSpotCookieBanner).toBe(true);
			expect(window.hsConversationsSettings).toMatchObject({
				loadImmediately: false,
			});
			expect(window._hsq).toEqual([]);
			expect(window._hsp).toEqual([
				[
					'setHubSpotConsent',
					{ advertisement: true, analytics: false, functionality: false },
				],
			]);
		});
		loadScripts([hubspot({ portalId: 53 })], grantedMarketingConsents);
		expect(beforeAppend).toHaveBeenCalledOnce();
		const element =
			document.querySelector<HTMLScriptElement>('#hs-script-loader');
		expect(element?.src).toBe('https://js.hs-scripts.com/53.js');
		expect(element?.async).toBe(true);
		expect(element?.defer).toBe(true);
	});

	it('preserves queues and conversation settings already supplied by the app', () => {
		const tracking: unknown[][] = [
			['identify', { email: 'known@example.com' }],
		];
		const privacy: unknown[][] = [['existing-command']];
		window._hsq = tracking;
		window._hsp = privacy;
		window.hsConversationsSettings = {
			inlineEmbedSelector: '#chat',
			loadImmediately: true,
		};
		loadScripts([hubspot({ portalId: '53' })], grantedMarketingConsents);
		expect(window._hsq).toBe(tracking);
		expect(tracking).toEqual([['identify', { email: 'known@example.com' }]]);
		expect(window._hsp).toBe(privacy);
		expect(privacy[0]).toEqual(['existing-command']);
		expect(window.hsConversationsSettings).toEqual({
			inlineEmbedSelector: '#chat',
			loadImmediately: false,
		});
	});

	it.each(['queued', 'ready'])(
		'requests cookie revocation on marketing-only withdrawal with a %s privacy API',
		(state) => {
			const scripts = [hubspot({ portalId: '53' })];
			loadScripts(scripts, grantedMarketingConsents);
			const commands: unknown[][] = [];
			if (state === 'ready') {
				window._hsp = { push: (command) => commands.push(command) };
			} else {
				window._hsp = commands;
			}
			const original = document.getElementById('hs-script-loader');
			updateScripts(scripts, deniedConsents);
			expect(commands).toEqual([
				['revokeCookieConsent'],
				['setHubSpotConsent', deniedHubSpotConsent],
			]);
			updateScripts(scripts, deniedConsents);
			expect(
				commands.filter(([name]) => name === 'revokeCookieConsent')
			).toHaveLength(1);
			original?.dispatchEvent(new Event('load'));
			updateScripts(scripts, grantedMarketingConsents);
			expect(commands.at(-1)).toEqual([
				'setHubSpotConsent',
				{ advertisement: true, analytics: false, functionality: false },
			]);
			updateScripts(scripts, deniedConsents);
			expect(commands.slice(-2)).toEqual([
				['revokeCookieConsent'],
				['setHubSpotConsent', deniedHubSpotConsent],
			]);
			expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
			expect(document.getElementById('hs-script-loader')).toBe(original);
		}
	);

	it.each([
		{
			category: 'marketing' as const,
			expected: { advertisement: true, analytics: false, functionality: true },
			next: { ...allConsents, measurement: false },
			withdrawn: 'measurement',
		},
		{
			category: 'measurement' as const,
			expected: { advertisement: false, analytics: true, functionality: true },
			next: { ...allConsents, marketing: false },
			withdrawn: 'marketing',
		},
		{
			category: 'marketing' as const,
			expected: { advertisement: true, analytics: true, functionality: false },
			next: { ...allConsents, functionality: false },
			withdrawn: 'functionality',
		},
	])(
		'requests revocation on $withdrawn loss, then restores remaining grants',
		({ category, next, expected }) => {
			const scripts = [hubspot({ category, portalId: '53' })];
			loadScripts(scripts, allConsents);
			const push = vi.fn();
			window._hsp = { push };
			updateScripts(scripts, next);
			expect(push.mock.calls).toEqual([
				[['revokeCookieConsent']],
				[['setHubSpotConsent', expected]],
			]);
		}
	);

	it('keeps necessary and experience separate from HubSpot consent fields', () => {
		const scripts = [hubspot({ category: 'necessary', portalId: '53' })];
		loadScripts(scripts, { ...deniedConsents, experience: true });
		const push = vi.fn();
		window._hsp = { push };
		updateScripts(scripts, deniedConsents);
		expect(push).toHaveBeenCalledExactlyOnceWith([
			'setHubSpotConsent',
			deniedHubSpotConsent,
		]);
	});

	it('retains one loader across withdrawal, regrant and provider remount', () => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const scripts = [hubspot({ portalId: '53' })];
		loadScripts(scripts, allConsents);
		const original = document.getElementById('hs-script-loader');
		updateScripts(scripts, deniedConsents);
		expect(original?.isConnected).toBe(true);
		original?.dispatchEvent(new Event('load'));
		updateScripts(scripts, allConsents);
		clearAllScripts();
		expect(original?.isConnected).toBe(true);
		loadScripts(scripts, allConsents);
		expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
		expect(document.getElementById('hs-script-loader')).toBe(original);
		expect(warning).not.toHaveBeenCalled();
		expect(window._hsp).toEqual(
			expect.arrayContaining([
				[
					'setHubSpotConsent',
					{ advertisement: true, analytics: true, functionality: true },
				],
			])
		);
	});

	it('reuses a hand-installed literal ID without inserting another loader', () => {
		const existing = document.createElement('script');
		existing.id = 'hs-script-loader';
		existing.src = 'https://js-na1.hs-scripts.com/53.js';
		document.head.appendChild(existing);
		const warning = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const scripts = [hubspot({ portalId: '53' })];
		loadScripts(scripts, grantedMarketingConsents);
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(document.getElementById('hs-script-loader')).toBe(existing);
		expect(existing.src).toBe('https://js-na1.hs-scripts.com/53.js');
		expect(warning).toHaveBeenCalledExactlyOnceWith(
			'hubspot: #hs-script-loader already exists. Reusing it; remove other HubSpot installations to keep loading consent-gated.'
		);
	});

	it.each([false, true])(
		'diagnoses a non-script loader ID collision with a saved grant: %s',
		(savedGrant) => {
			const existing = document.createElement('div');
			existing.id = 'hs-script-loader';
			existing.textContent = 'Application content';
			document.body.appendChild(existing);
			const originalMarkup = existing.outerHTML;
			const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const scripts = [hubspot({ portalId: '53' })];
			loadScripts(scripts, deniedConsents);
			updateScripts(scripts, grantedMeasurementConsents);
			expect(warning).not.toHaveBeenCalled();
			expect(window._hsp).toBeUndefined();
			if (savedGrant) {
				clearAllScripts();
			}
			loadScripts(scripts, grantedMarketingConsents);
			expect(warning).toHaveBeenCalledExactlyOnceWith(
				'hubspot: #hs-script-loader belongs to a non-script element. HubSpot will not load; remove or rename the conflicting ID.'
			);
			updateScripts(scripts, grantedMarketingConsents);
			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, grantedMarketingConsents);
			clearAllScripts();
			loadScripts([hubspot({ portalId: '53' })], grantedMarketingConsents);
			expect(warning).toHaveBeenCalledOnce();
			expect(document.querySelector('script')).toBeNull();
			expect(document.querySelectorAll('#hs-script-loader')).toHaveLength(1);
			expect(document.getElementById('hs-script-loader')).toBe(existing);
			expect(existing.outerHTML).toBe(originalMarkup);
			expect(existing.parentElement).toBe(document.body);
		}
	);

	it('keeps a loader ID collision silent while the vendor is denied', async () => {
		const existing = document.createElement('div');
		existing.id = 'hs-script-loader';
		document.body.appendChild(existing);
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [hubspot({ portalId: '53' })],
		});
		try {
			await kernel.commands.save(grantedMarketingConsents, {
				vendors: { hubspot: false },
			});
			expect(warning).not.toHaveBeenCalled();
			for (const key of hubspotGlobals) {
				expect(key in window).toBe(false);
			}
			await kernel.commands.save(grantedMarketingConsents, {
				vendors: { hubspot: true },
			});
			expect(warning).toHaveBeenCalledExactlyOnceWith(
				'hubspot: #hs-script-loader belongs to a non-script element. HubSpot will not load; remove or rename the conflicting ID.'
			);
			expect(document.querySelector('script')).toBeNull();
			expect(document.getElementById('hs-script-loader')).toBe(existing);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('requires the entire custom condition and denies every field when it fails', () => {
		const scripts = [
			hubspot({
				category: { and: ['marketing', 'measurement'] },
				portalId: '53',
			}),
		];
		loadScripts(scripts, grantedMarketingConsents);
		expect(window._hsp).toBeUndefined();
		expect(document.querySelector('script')).toBeNull();
		updateScripts(scripts, allConsents);
		const push = vi.fn();
		window._hsp = { push };
		updateScripts(scripts, { ...allConsents, measurement: false });
		expect(push.mock.calls).toEqual([
			[['revokeCookieConsent']],
			[['setHubSpotConsent', deniedHubSpotConsent]],
		]);
	});

	it('honors vendor denial before loading and denies all fields after loading', async () => {
		const scripts = [hubspot({ portalId: '53' })];
		const kernel = createConsentKernel();
		const loader = createScriptLoader({ kernel, scripts });
		try {
			await kernel.commands.save(grantedMarketingConsents, {
				vendors: { hubspot: false },
			});
			expect(window._hsp).toBeUndefined();
			expect(document.querySelector('script')).toBeNull();
			await kernel.commands.save(grantedMarketingConsents, {
				vendors: { hubspot: true },
			});
			expect(document.getElementById('hs-script-loader')).not.toBeNull();
			const push = vi.fn();
			window._hsp = { push };
			await kernel.commands.save(grantedMarketingConsents, {
				vendors: { hubspot: false },
			});
			expect(push.mock.calls.slice(0, 2)).toEqual([
				[['revokeCookieConsent']],
				[['setHubSpotConsent', deniedHubSpotConsent]],
			]);
			expect(
				push.mock.calls.filter(
					([command]) => command[0] === 'revokeCookieConsent'
				)
			).toHaveLength(1);
			for (const [command] of push.mock.calls.slice(1)) {
				expect(command).toEqual(['setHubSpotConsent', deniedHubSpotConsent]);
			}
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('loads chat only after explicit configuration and functionality consent', () => {
		const scripts = [hubspot({ chat: true, portalId: '53' })];
		loadScripts(scripts, grantedMarketingConsents);
		const api = conversationsApi();
		window.HubSpotConversations = api;
		for (const ready of window.hsConversationsOnReady ?? []) {
			ready();
		}
		expect(api.widget.load).not.toHaveBeenCalled();
		updateScripts(scripts, {
			...grantedMarketingConsents,
			functionality: true,
		});
		expect(api.widget.load).toHaveBeenCalledOnce();
		updateScripts(scripts, allConsents);
		expect(api.widget.load).toHaveBeenCalledOnce();
		updateScripts(scripts, grantedMarketingConsents);
		expect(api.widget.remove).toHaveBeenCalledOnce();
		expect(api.clear).toHaveBeenCalledWith({ resetWidget: false });
		api.emitWidgetLoaded();
		expect(api.widget.remove).toHaveBeenCalledTimes(2);
		expect(api.widget.load).toHaveBeenCalledOnce();
	});

	it.each([false, true])(
		'reattaches one chat listener when the same Script remounts (initially denied: %s)',
		async (initiallyDenied) => {
			const api = conversationsApi();
			window.HubSpotConversations = api;
			const script = hubspot({ chat: true, portalId: '53' });
			const kernel = createConsentKernel();
			let loader = createScriptLoader({ kernel, scripts: [script] });
			try {
				await kernel.commands.save(allConsents);
				const element = document.getElementById('hs-script-loader');
				expect(api.listeners.size).toBe(1);
				const remount = async (registrations: number) => {
					const disposalCommands: unknown[][] = [];
					window._hsp = disposalCommands;
					const loads = api.widget.load.mock.calls.length;
					loader.dispose();
					expect(api.listeners.size).toBe(0);
					expect(disposalCommands).toEqual([
						['revokeCookieConsent'],
						['setHubSpotConsent', deniedHubSpotConsent],
					]);
					expect(kernel.getSnapshot().effectivePermissions).toMatchObject(
						allConsents
					);
					if (initiallyDenied) {
						await kernel.commands.save(deniedConsents);
					}
					loader = createScriptLoader({ kernel, scripts: [script] });
					expect(api.listeners.size).toBe(initiallyDenied ? 0 : 1);
					expect(api.widget.load).toHaveBeenCalledTimes(
						loads + (initiallyDenied ? 0 : 1)
					);
					await kernel.commands.save(allConsents);
					expect(api.listeners.size).toBe(1);
					expect(api.on).toHaveBeenCalledTimes(registrations);
					expect(document.getElementById('hs-script-loader')).toBe(element);
					const commands: unknown[][] = [];
					window._hsp = commands;
					await kernel.commands.save({ ...allConsents, functionality: false });
					expect(commands.slice(0, 2)).toEqual([
						['revokeCookieConsent'],
						[
							'setHubSpotConsent',
							{ advertisement: true, analytics: true, functionality: false },
						],
					]);
					const removals = api.widget.remove.mock.calls.length;
					const clears = api.clear.mock.calls.length;
					api.emitWidgetLoaded();
					expect(api.widget.remove).toHaveBeenCalledTimes(removals + 1);
					expect(api.clear).toHaveBeenCalledTimes(clears + 1);
					expect(api.clear).toHaveBeenLastCalledWith({ resetWidget: false });
					await kernel.commands.save(allConsents);
				};
				await remount(2);
				await remount(3);
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	it('attaches a fresh helper to the retained conversations client', () => {
		const api = conversationsApi();
		window.HubSpotConversations = api;
		loadScripts([hubspot({ chat: true, portalId: '53' })], allConsents);
		clearAllScripts();
		expect(api.listeners.size).toBe(0);
		const scripts = [hubspot({ chat: true, portalId: '53' })];
		loadScripts(scripts, allConsents);
		expect(api.listeners.size).toBe(1);
		updateScripts(scripts, grantedMarketingConsents);
		const removals = api.widget.remove.mock.calls.length;
		api.emitWidgetLoaded();
		expect(api.widget.remove).toHaveBeenCalledTimes(removals + 1);
	});

	it('moves the listener to a changed conversations client after remount', () => {
		const original = conversationsApi();
		window.HubSpotConversations = original;
		const scripts = [hubspot({ chat: true, portalId: '53' })];
		loadScripts(scripts, allConsents);
		clearAllScripts();
		const replacement = conversationsApi();
		window.HubSpotConversations = replacement;
		loadScripts(scripts, allConsents);
		expect(original.listeners.size).toBe(0);
		expect(replacement.listeners.size).toBe(1);
		updateScripts(scripts, grantedMarketingConsents);
		const originalRemovals = original.widget.remove.mock.calls.length;
		const replacementRemovals = replacement.widget.remove.mock.calls.length;
		original.emitWidgetLoaded();
		expect(original.widget.remove).toHaveBeenCalledTimes(originalRemovals);
		replacement.emitWidgetLoaded();
		expect(replacement.widget.remove).toHaveBeenCalledTimes(
			replacementRemovals + 1
		);
	});

	it('checks current consent when the conversations SDK becomes ready late', () => {
		const scripts = [hubspot({ chat: true, portalId: '53' })];
		loadScripts(scripts, allConsents);
		expect(window.hsConversationsOnReady).toHaveLength(1);
		updateScripts(scripts, grantedMarketingConsents);
		const api = conversationsApi();
		window.HubSpotConversations = api;
		for (const ready of window.hsConversationsOnReady ?? []) {
			ready();
		}
		expect(api.widget.load).not.toHaveBeenCalled();
		expect(api.widget.remove).toHaveBeenCalledOnce();
		expect(api.clear).toHaveBeenCalledWith({ resetWidget: false });
		updateScripts(scripts, allConsents);
		expect(api.widget.load).toHaveBeenCalledOnce();
	});

	it.each([false, undefined])('keeps chat manual when chat is %s', (chat) => {
		const api = conversationsApi();
		window.HubSpotConversations = api;
		loadScripts([hubspot({ chat, portalId: '53' })], allConsents);
		expect(window.hsConversationsSettings?.loadImmediately).toBe(false);
		expect(api.widget.load).not.toHaveBeenCalled();
	});

	it('removes pending chat callbacks when its provider is disposed', () => {
		loadScripts([hubspot({ chat: true, portalId: '53' })], allConsents);
		const ready = window.hsConversationsOnReady?.[0];
		clearAllScripts();
		expect(window.hsConversationsOnReady).toEqual([]);
		const api = conversationsApi();
		window.HubSpotConversations = api;
		ready?.();
		expect(api.widget.load).not.toHaveBeenCalled();
		expect(api.listeners.size).toBe(0);
	});
});
