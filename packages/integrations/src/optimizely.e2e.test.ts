/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMeasurementConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { optimizelyWeb } from './vendors/functional/optimizely';

const grantedExperienceConsents = { ...deniedConsents, experience: true };
const LOADER_SRC = 'https://cdn.optimizely.com/js/12345678.js';

const getLoaders = function getLoaders(): HTMLScriptElement[] {
	return [
		...document.head.querySelectorAll<HTMLScriptElement>('script'),
	].filter((element) => element.src === LOADER_SRC);
};

const getLoader = function getLoader(): HTMLScriptElement {
	const [element] = getLoaders();
	if (!element) {
		throw new Error('Expected an Optimizely loader.');
	}
	return element;
};

describe('Optimizely Web loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.optimizely;
	});

	it('waits for experience consent without globals or storage writes', () => {
		const append = vi.spyOn(document.head, 'appendChild');
		const store = vi.spyOn(Storage.prototype, 'setItem');
		const readStore = vi.spyOn(Storage.prototype, 'getItem');
		const removeStore = vi.spyOn(Storage.prototype, 'removeItem');
		const cookies = document.cookie;
		const writeCookie = vi.spyOn(document, 'cookie', 'set');
		const scripts = [optimizelyWeb({ projectId: '12345678' })];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);

		expect(append).not.toHaveBeenCalled();
		expect(getLoaders()).toHaveLength(0);
		expect(window.optimizely).toBeUndefined();
		expect(store).not.toHaveBeenCalled();
		expect(readStore).not.toHaveBeenCalled();
		expect(removeStore).not.toHaveBeenCalled();
		expect(writeCookie).not.toHaveBeenCalled();
		expect(document.cookie).toBe(cookies);

		expect(updateScripts(scripts, grantedExperienceConsents).loaded).toEqual([
			'optimizely',
		]);
		expect(getLoaders()).toHaveLength(1);
		expect(getLoader().async).toBe(false);
		expect(getLoader().id).not.toBe('optimizely');
		updateScripts(scripts, { ...grantedExperienceConsents, marketing: true });
		expect(getLoaders()).toHaveLength(1);
	});

	it('honours an overridden consent condition', () => {
		const scripts = [
			optimizelyWeb({
				category: { and: ['experience', 'measurement'] },
				projectId: '12345678',
			}),
		];
		loadScripts(scripts, grantedExperienceConsents);
		expect(getLoaders()).toHaveLength(0);
		updateScripts(scripts, {
			...grantedExperienceConsents,
			measurement: true,
		});
		expect(getLoaders()).toHaveLength(1);
	});

	it('removes the loader without permanently opting the visitor out', () => {
		const scripts = [optimizelyWeb({ projectId: '12345678' })];
		loadScripts(scripts, grantedExperienceConsents);
		const element = getLoader();
		const api = { push: vi.fn() };
		window.optimizely = api;
		element.dispatchEvent(new Event('load'));

		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual([
			'optimizely',
		]);
		expect(element.isConnected).toBe(false);
		expect(getLoaders()).toHaveLength(0);
		expect(window.optimizely).toBe(api);
		expect(api.push).not.toHaveBeenCalled();
	});

	it('sends no stale load commands after revocation and regrant', () => {
		const scripts = [optimizelyWeb({ projectId: '12345678' })];
		loadScripts(scripts, grantedExperienceConsents);
		const revoked = getLoader();
		updateScripts(scripts, deniedConsents);
		const api = { push: vi.fn() };
		window.optimizely = api;
		revoked.dispatchEvent(new Event('load'));
		expect(getLoaders()).toHaveLength(0);
		expect(api.push).not.toHaveBeenCalled();

		updateScripts(scripts, grantedExperienceConsents);
		const current = getLoader();
		expect(current).not.toBe(revoked);
		current.dispatchEvent(new Event('load'));
		revoked.dispatchEvent(new Event('load'));
		expect(getLoaders()).toEqual([current]);
		expect(window.optimizely).toBe(api);
		expect(api.push).not.toHaveBeenCalled();
	});

	it('keeps the snippet blocked when its vendor is switched off', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [optimizelyWeb({ projectId: '12345678' })],
		});
		try {
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { optimizely: false } }
			);
			expect(getLoaders()).toHaveLength(0);
			expect(window.optimizely).toBeUndefined();
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { optimizely: true } }
			);
			expect(getLoaders()).toHaveLength(1);
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { optimizely: false } }
			);
			expect(getLoaders()).toHaveLength(0);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('uses the subscribed core loader for a custom URL, revoke and regrant', async () => {
		const kernel = createConsentKernel();
		const scriptSrc = 'https://example.com/proxy/optimizely.js';
		const createScript = () =>
			optimizelyWeb({
				category: 'measurement',
				nonce: 'script-nonce',
				projectId: '12345678',
				scriptSrc,
			});
		const loader = createScriptLoader({
			kernel,
			nonce: 'provider-nonce',
			scripts: [createScript()],
		});
		const findLoaders = () =>
			[...document.head.querySelectorAll<HTMLScriptElement>('script')].filter(
				(element) => element.src === scriptSrc
			);
		try {
			await kernel.commands.save(deniedConsents);
			await kernel.commands.save(grantedExperienceConsents);
			expect(findLoaders()).toHaveLength(0);
			expect(window.optimizely).toBeUndefined();

			await kernel.commands.save(grantedMeasurementConsents);
			const [pending] = findLoaders();
			expect(pending).toBeDefined();
			expect(pending?.nonce).toBe('script-nonce');
			expect(pending?.async).toBe(false);
			expect(pending?.id).not.toBe('optimizely');
			expect(loader.getLoadedScriptIds()).toEqual(['optimizely']);
			loader.updateScripts([createScript()]);
			await kernel.commands.save(grantedMeasurementConsents);
			expect(findLoaders()).toEqual([pending]);

			await kernel.commands.save(deniedConsents);
			expect(findLoaders()).toHaveLength(0);
			expect(pending?.isConnected).toBe(false);
			pending?.dispatchEvent(new Event('load'));
			expect(window.optimizely).toBeUndefined();

			await kernel.commands.save(grantedMeasurementConsents);
			const [current] = findLoaders();
			expect(current).toBeDefined();
			expect(current).not.toBe(pending);
			current?.dispatchEvent(new Event('load'));
			pending?.dispatchEvent(new Event('load'));
			loader.updateScripts([createScript()]);
			expect(findLoaders()).toEqual([current]);
			expect(window.optimizely).toBeUndefined();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it.each([
		{ projectId: '' },
		{ projectId: '../123' },
		{
			projectId: Number.MAX_SAFE_INTEGER + 1,
			scriptSrc: 'https://example.com/proxy/optimizely.js',
		},
	])('keeps an invalid project blocked even with consent: %j', (options) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		loadScripts([optimizelyWeb(options)], grantedExperienceConsents);
		expect(document.head.querySelectorAll('script')).toHaveLength(0);
		expect(window.optimizely).toBeUndefined();
	});

	it('forwards the provider CSP nonce to the loader', () => {
		loadScripts(
			[optimizelyWeb({ projectId: '12345678' })],
			grantedExperienceConsents,
			{ nonce: 'provider-nonce' }
		);
		expect(getLoader().nonce).toBe('provider-nonce');
	});
});
