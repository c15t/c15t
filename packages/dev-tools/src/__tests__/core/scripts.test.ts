import { createConsentKernel } from '@c15t/core';
import {
	createScriptLoader,
	getScriptDiagnostics,
} from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDevTools } from '../../index';

const disposers: (() => void)[] = [];

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	document.body.replaceChildren();
});

describe('script inspection', () => {
	it.each(['load', 'error'] as const)(
		'tracks %s without callbacks or legacy debug forwarding',
		async (event) => {
			const kernel = createConsentKernel();
			const loader = createScriptLoader({
				emitToV2DebugListeners: false,
				kernel,
				scripts: [
					{
						category: 'necessary',
						id: 'quiet',
						src: 'https://example.test/quiet.js',
					},
				],
			});
			disposers.push(loader.dispose);
			const element = document.getElementById(
				getScriptDiagnostics(kernel)[0]?.elementId ?? ''
			);
			expect(element).not.toBeNull();
			element?.dispatchEvent(new Event(event));
			await vi.waitFor(() =>
				expect(getScriptDiagnostics(kernel)[0]?.status).toBe(
					event === 'load' ? 'loaded' : 'error'
				)
			);
		}
	);
	it('separates permission to load from actual consent for alwaysLoad scripts', () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{
					alwaysLoad: true,
					category: 'measurement',
					id: 'google',
					textContent: 'void 0;',
				},
			],
		});
		disposers.push(loader.dispose);
		const devTools = createDevTools({
			defaultOpen: true,
			defaultTab: 'scripts',
			kernel,
		});
		disposers.push(devTools.destroy);
		expect(devTools.getState().scripts[0]).toMatchObject({
			eligible: true,
			hasConsent: false,
		});
		expect(devTools.element?.textContent).toContain('"allowedToLoad": true');
		expect(devTools.element?.textContent).toContain('"consentGranted": false');
	});

	it('finds existing loaders and follows blocked, loading, loaded, and revoked scripts', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{
					category: 'measurement',
					id: 'analytics',
					src: 'https://example.test/analytics.js',
				},
			],
		});
		disposers.push(loader.dispose);
		const devTools = createDevTools({
			defaultOpen: true,
			defaultTab: 'scripts',
			kernel,
		});
		disposers.push(devTools.destroy);
		expect(devTools.getState().scripts[0]?.status).toBe('blocked');
		expect(devTools.element?.textContent).toContain('analytics');
		kernel.set.consent({ measurement: true });
		await vi.waitFor(() =>
			expect(devTools.getState().scripts[0]?.status).toBe('loading')
		);
		const element = document.getElementById(
			getScriptDiagnostics(kernel)[0]?.elementId ?? ''
		);
		expect(element).not.toBeNull();
		element?.dispatchEvent(new Event('load'));
		await vi.waitFor(() =>
			expect(devTools.getState().scripts[0]?.status).toBe('loaded')
		);
		expect(
			devTools
				.getState()
				.events.some((event) => event.type === 'script:load_completed')
		).toBe(true);
		kernel.set.consent({ measurement: false });
		await vi.waitFor(() =>
			expect(devTools.getState().scripts[0]?.status).toBe('blocked')
		);
		expect(element?.isConnected).toBe(false);
		kernel.set.consent({ measurement: true });
		element?.dispatchEvent(new Event('load'));
		element?.dispatchEvent(new Event('error'));
		await vi.waitFor(() =>
			expect(devTools.getState().scripts[0]?.status).toBe('loading')
		);
	});

	it('filters scripts and distinguishes unmanaged page resources', () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{
					category: 'measurement',
					id: 'analytics',
					src: 'https://example.test/analytics.js',
				},
				{
					category: 'marketing',
					id: 'pixel',
					src: 'https://example.test/pixel.js',
				},
			],
		});
		disposers.push(loader.dispose);
		const devTools = createDevTools({
			defaultOpen: true,
			defaultTab: 'scripts',
			kernel,
		});
		disposers.push(devTools.destroy);
		const input = devTools.element?.querySelector<HTMLInputElement>(
			'[data-focus-key="field:Filter scripts"]'
		);
		if (!input) {
			throw new Error('Missing script filter');
		}
		input.value = 'measurement';
		input.dispatchEvent(new Event('input'));
		expect(devTools.element?.querySelectorAll('details')).toHaveLength(1);
		expect(devTools.element?.querySelector('summary')?.textContent).toContain(
			'analytics'
		);
		const iframe = document.createElement('iframe');
		iframe.src = 'https://example.test/analytics.js';
		document.body.append(iframe);
		const scan = [...(devTools.element?.querySelectorAll('button') ?? [])].find(
			(button) => button.textContent === 'Scan page'
		);
		scan?.click();
		expect(devTools.element?.textContent).toContain(
			'iframe · Not managed by this provider'
		);
	});

	it('reports a network failure and keeps different providers isolated', async () => {
		const first = createConsentKernel({ initialConsents: { marketing: true } });
		const second = createConsentKernel();
		const devTools = createDevTools({ kernel: first });
		disposers.push(devTools.destroy);
		const loader = createScriptLoader({
			kernel: first,
			scripts: [
				{
					category: 'marketing',
					id: 'pixel',
					src: 'https://example.test/pixel.js',
				},
			],
		});
		disposers.push(loader.dispose);
		document
			.getElementById(getScriptDiagnostics(first)[0]?.elementId ?? '')
			?.dispatchEvent(new Event('error'));
		await vi.waitFor(() =>
			expect(devTools.getState().scripts[0]?.status).toBe('error')
		);
		expect(getScriptDiagnostics(second)).toEqual([]);
		loader.dispose();
		await vi.waitFor(() => expect(devTools.getState().scripts).toEqual([]));
	});

	it('tracks callback-only scripts, updates, and retained elements', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{ callbackOnly: true, category: 'marketing', id: 'callback' },
				{
					category: 'marketing',
					id: 'retained',
					persistAfterConsentRevoked: true,
					textContent: 'void 0',
				},
			],
		});
		disposers.push(loader.dispose);
		expect(getScriptDiagnostics(kernel).map((script) => script.status)).toEqual(
			['loaded', 'loaded']
		);
		kernel.set.consent({ marketing: false });
		expect(getScriptDiagnostics(kernel).map((script) => script.status)).toEqual(
			['blocked', 'retained']
		);
		const retainedElementId = getScriptDiagnostics(kernel)[1]?.elementId ?? '';
		loader.updateScripts([]);
		expect(getScriptDiagnostics(kernel)).toEqual([]);
		document.getElementById(retainedElementId)?.remove();
	});

	it('preserves a location draft while consent changes', () => {
		const kernel = createConsentKernel();
		const devTools = createDevTools({
			defaultOpen: true,
			defaultTab: 'location',
			kernel,
		});
		disposers.push(devTools.destroy);
		const country = devTools.element?.querySelector<HTMLInputElement>(
			'[data-focus-key="field:Country"]'
		);
		if (!country) {
			throw new Error('Missing country input');
		}
		country.value = 'GB';
		kernel.set.consent({ marketing: true });
		expect(
			devTools.element?.querySelector<HTMLInputElement>(
				'[data-focus-key="field:Country"]'
			)?.value
		).toBe('GB');
	});
});
