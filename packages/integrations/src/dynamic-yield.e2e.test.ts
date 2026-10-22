/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { dynamicYield } from './vendors/functional/dynamic-yield';

const grantedConsents = { ...deniedConsents, experience: true };

const loader = function loader(name: 'dynamic' | 'static'): HTMLScriptElement {
	const element = document.head.querySelector<HTMLScriptElement>(
		`script[src$="api_${name}.js"]`
	);
	if (!element) {
		throw new Error(`Expected the Dynamic Yield ${name} loader.`);
	}
	return element;
};

describe('Dynamic Yield real-core loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.DY;
	});

	it.each([
		{
			hostname: 'cdn.dynamicyield.com',
			region: 'us',
			sectionId: '7654321',
		},
		{
			hostname: 'cdn-eu.dynamicyield.com',
			region: 'eu',
			sectionId: '1234567',
		},
	] as const)(
		'requests separate loader sequences for $region section $sectionId',
		async ({ hostname, region, sectionId }) => {
			const requests: string[] = [];
			installHeadProbe((element) => requests.push(element.src));
			const firstKernel = createConsentKernel();
			const secondKernel = createConsentKernel();
			await firstKernel.commands.save(grantedConsents);
			await secondKernel.commands.save(grantedConsents);
			const first = createScriptLoader({
				kernel: firstKernel,
				scripts: [dynamicYield({ sectionId: '1234567' })],
			});
			const second = createScriptLoader({
				kernel: secondKernel,
				scripts: [dynamicYield({ region, sectionId })],
			});
			try {
				const firstBase = 'https://cdn.dynamicyield.com/api/1234567';
				const secondBase = `https://${hostname}/api/${sectionId}`;
				const elements = Array.from(
					document.head.querySelectorAll<HTMLScriptElement>('script')
				);
				expect(elements.map((element) => element.src)).toEqual([
					`${firstBase}/api_dynamic.js`,
					`${secondBase}/api_dynamic.js`,
				]);
				for (const element of elements) {
					element.dispatchEvent(new Event('load'));
				}
				expect(requests).toEqual([
					`${firstBase}/api_dynamic.js`,
					`${secondBase}/api_dynamic.js`,
					`${firstBase}/api_static.js`,
					`${secondBase}/api_static.js`,
				]);
				first.dispose();
				expect(
					Array.from(document.head.querySelectorAll('script')).map(
						(element) => element.src
					)
				).toEqual([
					`${secondBase}/api_dynamic.js`,
					`${secondBase}/api_static.js`,
				]);
				await secondKernel.commands.save(deniedConsents);
				expect(document.head.querySelector('script')).toBeNull();
			} finally {
				first.dispose();
				second.dispose();
				firstKernel.dispose();
				secondKernel.dispose();
			}
		}
	);

	it('leaves DY globals, loaders, and storage untouched until mapped consent', () => {
		const scripts = [dynamicYield({ sectionId: '1234567' })];
		const beforeCookies = document.cookie;
		const beforeLocal = { ...localStorage };
		const beforeSession = { ...sessionStorage };
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, marketing: true });
		clearAllScripts();
		expect(window.DY).toBeUndefined();
		expect(document.head.querySelector('script')).toBeNull();
		expect(document.head.querySelector('link[rel="preconnect"]')).toBeNull();
		expect(document.cookie).toBe(beforeCookies);
		expect({ ...localStorage }).toEqual(beforeLocal);
		expect({ ...sessionStorage }).toEqual(beforeSession);
		expect(fetch).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it('seeds consent and context before insertion, then loads static after dynamic', () => {
		const requests: string[] = [];
		installHeadProbe((element) => {
			requests.push(element.src);
			expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
			expect(window.DY?.recommendationContext).toEqual({ type: 'HOMEPAGE' });
		});
		const scripts = [
			dynamicYield({
				recommendationContext: { type: 'HOMEPAGE' },
				region: 'eu',
				sectionId: '1234567',
			}),
		];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedConsents);
		expect(requests).toEqual([
			'https://cdn-eu.dynamicyield.com/api/1234567/api_dynamic.js',
		]);
		loader('dynamic').dispatchEvent(new Event('load'));
		expect(requests).toEqual([
			'https://cdn-eu.dynamicyield.com/api/1234567/api_dynamic.js',
			'https://cdn-eu.dynamicyield.com/api/1234567/api_static.js',
		]);
		expect(loader('static').async).toBe(false);
		updateScripts(scripts, { ...grantedConsents, marketing: true });
		expect(requests).toHaveLength(2);
	});

	it('uses the documented consent setter and removes both loaders on revoke', () => {
		const scripts = [dynamicYield({ sectionId: '1234567' })];
		loadScripts(scripts, grantedConsents);
		loader('dynamic').dispatchEvent(new Event('load'));
		// Model the real SDK's documented property setter, not its network behavior.
		let consent = { accepted: true };
		const changed = vi.fn((next: { accepted: boolean }) => {
			consent = next;
		});
		Object.defineProperty(window.DY, 'userActiveConsent', {
			configurable: true,
			get: () => consent,
			set: changed,
		});
		updateScripts(scripts, deniedConsents);
		expect(changed).toHaveBeenCalledExactlyOnceWith({ accepted: false });
		expect(document.head.querySelector('script')).toBeNull();
	});

	it('does not start static after an in-flight dynamic load loses consent', () => {
		const scripts = [dynamicYield({ sectionId: '1234567' })];
		loadScripts(scripts, grantedConsents);
		const revoked = loader('dynamic');
		updateScripts(scripts, deniedConsents);
		revoked.dispatchEvent(new Event('load'));
		expect(document.head.querySelector('script')).toBeNull();
		expect(window.DY?.userActiveConsent).toEqual({ accepted: false });

		updateScripts(scripts, grantedConsents);
		const current = loader('dynamic');
		expect(current).not.toBe(revoked);
		current.dispatchEvent(new Event('load'));
		expect(loader('static')).toBeTruthy();
		expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
	});

	it('uses the category override for the production gate', () => {
		const scripts = [
			dynamicYield({ category: 'marketing', sectionId: '1234567' }),
		];
		loadScripts(scripts, grantedConsents);
		expect(window.DY).toBeUndefined();
		updateScripts(scripts, { ...deniedConsents, marketing: true });
		expect(loader('dynamic')).toBeTruthy();
	});

	it.each([false, true])(
		'preserves equivalent helper replacements with dynamic loaded=%s',
		async (loaded) => {
			const kernel = createConsentKernel();
			await kernel.commands.save({ experience: true });
			const handle = createScriptLoader({
				kernel,
				scripts: [dynamicYield({ sectionId: '1234567' })],
			});
			try {
				const dynamic = loader('dynamic');
				if (loaded) {
					dynamic.dispatchEvent(new Event('load'));
				}
				const staticElement = document.head.querySelector(
					'script[src$="api_static.js"]'
				);
				const appended = vi.spyOn(document.head, 'appendChild');
				handle.updateScripts([
					dynamicYield({
						category: 'experience',
						nonce: ' ',
						region: 'us',
						sectionId: ' 1234567 ',
					}),
				]);
				expect(loader('dynamic')).toBe(dynamic);
				expect(
					document.head.querySelector('script[src$="api_static.js"]')
				).toBe(staticElement);
				expect(appended).not.toHaveBeenCalled();
				expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
				if (!loaded) {
					dynamic.dispatchEvent(new Event('load'));
				}
				expect(loader('static')).toBeTruthy();
			} finally {
				handle.dispose();
				kernel.dispose();
			}
		}
	);

	it.each([false, true])(
		'keeps shared consent through revoke/regrant with peer=%s',
		async (withPeer) => {
			const kernel = createConsentKernel();
			await kernel.commands.save({ experience: true, marketing: true });
			const first = createScriptLoader({
				kernel,
				scripts: [dynamicYield({ sectionId: '1234567' })],
			});
			const second = createScriptLoader({
				kernel,
				scripts: [
					dynamicYield({ category: 'marketing', sectionId: '1234567' }),
				],
			});
			const peer = withPeer
				? createScriptLoader({
						kernel,
						scripts: [dynamicYield({ sectionId: '1234567' })],
					})
				: undefined;
			try {
				const dynamic = loader('dynamic');
				dynamic.dispatchEvent(new Event('load'));
				const staticElement = loader('static');
				await kernel.commands.save({ experience: false, marketing: true });
				expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
				expect(loader('dynamic')).toBe(dynamic);
				expect(loader('static')).toBe(staticElement);
				await kernel.commands.save({ experience: false, marketing: false });
				expect(window.DY?.userActiveConsent).toEqual({ accepted: false });
				expect(document.head.querySelector('script')).toBeNull();
				await kernel.commands.save({ experience: false, marketing: true });
				const regrantedDynamic = loader('dynamic');
				regrantedDynamic.dispatchEvent(new Event('load'));
				const regrantedStatic = loader('static');
				first.dispose();
				peer?.dispose();
				expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
				expect(loader('dynamic')).toBe(regrantedDynamic);
				expect(loader('static')).toBe(regrantedStatic);
			} finally {
				first.dispose();
				peer?.dispose();
				second.dispose();
				kernel.dispose();
			}
		}
	);

	it('keeps an equal registration granted when another kernel revokes', async () => {
		const firstKernel = createConsentKernel();
		const secondKernel = createConsentKernel();
		await firstKernel.commands.save({ experience: true });
		await secondKernel.commands.save({ experience: true });
		const first = createScriptLoader({
			kernel: firstKernel,
			scripts: [dynamicYield({ sectionId: '1234567' })],
		});
		const second = createScriptLoader({
			kernel: secondKernel,
			scripts: [dynamicYield({ sectionId: '1234567' })],
		});
		try {
			const dynamic = loader('dynamic');
			dynamic.dispatchEvent(new Event('load'));
			const staticElement = loader('static');
			await firstKernel.commands.save({ experience: false });
			expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
			expect(loader('dynamic')).toBe(dynamic);
			expect(loader('static')).toBe(staticElement);
			first.dispose();
			expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
			await secondKernel.commands.save({ experience: false });
			expect(window.DY?.userActiveConsent).toEqual({ accepted: false });
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			first.dispose();
			second.dispose();
			firstKernel.dispose();
			secondKernel.dispose();
		}
	});

	it('starts a fresh lifecycle after full disposal and ignores old load events', async () => {
		const kernel = createConsentKernel();
		await kernel.commands.save({ experience: true });
		const script = dynamicYield({ sectionId: '1234567' });
		const first = createScriptLoader({ kernel, scripts: [script] });
		const oldDynamic = loader('dynamic');
		first.dispose();
		expect(window.DY?.userActiveConsent).toEqual({ accepted: false });
		expect(document.head.querySelector('script')).toBeNull();
		await kernel.commands.save({ experience: false });
		const second = createScriptLoader({ kernel, scripts: [script] });
		try {
			expect(document.head.querySelector('script')).toBeNull();
			expect(window.DY?.userActiveConsent).toEqual({ accepted: false });
			await kernel.commands.save({ experience: true });
			const currentDynamic = loader('dynamic');
			expect(currentDynamic).not.toBe(oldDynamic);
			oldDynamic.dispatchEvent(new Event('load'));
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			currentDynamic.dispatchEvent(new Event('load'));
			expect(loader('static')).toBeTruthy();
			expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
		} finally {
			second.dispose();
			kernel.dispose();
		}
	});

	it('revokes both loaders through the vendor switch inside an allowed category', async () => {
		const kernel = createConsentKernel();
		const handle = createScriptLoader({
			kernel,
			scripts: [dynamicYield({ sectionId: '1234567' })],
		});
		try {
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { 'dynamic-yield': false } }
			);
			expect(window.DY).toBeUndefined();
			expect(document.head.querySelector('script')).toBeNull();
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { 'dynamic-yield': true } }
			);
			loader('dynamic').dispatchEvent(new Event('load'));
			expect(loader('static')).toBeTruthy();
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { 'dynamic-yield': false } }
			);
			expect(window.DY?.userActiveConsent).toEqual({ accepted: false });
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			handle.dispose();
			kernel.dispose();
		}
	});

	it.each([
		{ loaded: false, remove: false },
		{ loaded: true, remove: false },
		{ loaded: false, remove: true },
		{ loaded: true, remove: true },
	])(
		'retains shared consent with dynamic loaded=$loaded, remove=$remove',
		async ({ loaded, remove }) => {
			const kernel = createConsentKernel();
			await kernel.commands.save({ experience: true });
			const first = createScriptLoader({
				kernel,
				scripts: [dynamicYield({ sectionId: '1234567' })],
			});
			const second = createScriptLoader({
				kernel,
				scripts: [dynamicYield({ sectionId: '1234567' })],
			});
			try {
				expect(document.head.querySelectorAll('script')).toHaveLength(1);
				const dynamic = loader('dynamic');
				if (loaded) {
					dynamic.dispatchEvent(new Event('load'));
				}
				const sharedStatic = document.head.querySelector(
					'script[src$="api_static.js"]'
				);
				if (remove) {
					first.updateScripts([]);
				} else {
					first.dispose();
				}
				expect(loader('dynamic')).toBe(dynamic);
				expect(window.DY?.userActiveConsent).toEqual({ accepted: true });
				expect(
					document.head.querySelector('script[src$="api_static.js"]')
				).toBe(sharedStatic);
				if (!loaded) {
					dynamic.dispatchEvent(new Event('load'));
				}
				expect(document.head.querySelectorAll('script')).toHaveLength(2);
				second.dispose();
				expect(document.head.querySelector('script')).toBeNull();
				expect(window.DY?.userActiveConsent).toEqual({ accepted: false });
			} finally {
				first.dispose();
				second.dispose();
				kernel.dispose();
			}
		}
	);

	it('keeps the static loader while a late adopter awaits completion replay', async () => {
		const kernel = createConsentKernel();
		await kernel.commands.save({ experience: true });
		const first = createScriptLoader({
			kernel,
			scripts: [dynamicYield({ sectionId: '1234567' })],
		});
		loader('dynamic').dispatchEvent(new Event('load'));
		const sharedStatic = loader('static');
		const second = createScriptLoader({
			kernel,
			scripts: [dynamicYield({ sectionId: '1234567' })],
		});
		try {
			first.dispose();
			expect(loader('static')).toBe(sharedStatic);
			await Promise.resolve();
			expect(loader('static')).toBe(sharedStatic);
			expect(document.head.querySelectorAll('script')).toHaveLength(2);
			await kernel.commands.save({ experience: false });
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			first.dispose();
			second.dispose();
			kernel.dispose();
		}
	});

	it('forwards the provider nonce and removes the chained loader on disposal', () => {
		loadScripts([dynamicYield({ sectionId: '1234567' })], grantedConsents, {
			nonce: 'provider-nonce',
		});
		loader('dynamic').dispatchEvent(new Event('load'));
		expect(loader('static').nonce).toBe('provider-nonce');
		clearAllScripts();
		expect(document.head.querySelector('script')).toBeNull();
	});
});
