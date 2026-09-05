import { createConsentKernel } from '@c15t/core';
import {
	createScriptLoader,
	getScriptDiagnostics,
	subscribeScriptDiagnostics,
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
	it.each(['initially blocked', 'replaced after revocation'])(
		'does not report a foreign element as retained when %s',
		(scenario) => {
			const kernel = createConsentKernel({
				initialConsents: {
					marketing: scenario === 'replaced after revocation',
				},
			});
			const foreign = document.createElement('div');
			foreign.id = 'c15t-script-retained-identity';
			if (scenario === 'initially blocked') {
				document.body.append(foreign);
			}
			const loader = createScriptLoader({
				kernel,
				scripts: [
					{
						anonymizeId: false,
						category: 'marketing',
						id: 'retained-identity',
						persistAfterConsentRevoked: true,
						textContent: 'void 0;',
					},
				],
			});
			disposers.push(loader.dispose);
			if (scenario === 'replaced after revocation') {
				kernel.set.consent({ marketing: false });
				expect(getScriptDiagnostics(kernel)[0]?.status).toBe('retained');
				document.getElementById(foreign.id)?.replaceWith(foreign);
			}
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe('blocked');
		}
	);
	it.each([false, true])(
		'records script reuse without legacy forwarding, existing DOM=%s',
		(existingDOM) => {
			const kernel = createConsentKernel();
			const script = {
				anonymizeId: false,
				category: 'necessary' as const,
				id: 'reuse-event',
				textContent: 'void 0;',
			};
			if (existingDOM) {
				const element = document.createElement('script');
				element.id = 'c15t-script-reuse-event';
				document.body.append(element);
			}
			const devTools = createDevTools({ kernel });
			disposers.push(devTools.destroy);
			const listener = vi.fn();
			disposers.push(subscribeScriptDiagnostics(kernel, listener));
			const loader = createScriptLoader({
				emitToV2DebugListeners: false,
				kernel,
				scripts: [script],
			});
			disposers.push(loader.dispose);
			if (!existingDOM) {
				loader.updateScripts([script]);
			}
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					action: 'already_loaded',
					scriptId: script.id,
				})
			);
			expect(
				devTools
					.getState()
					.events.some((event) => event.type === 'script:already_loaded')
			).toBe(true);
		}
	);
	it.each(['load', 'error'] as const)(
		'observes a retained script finishing with %s while consent is revoked',
		(event) => {
			const kernel = createConsentKernel({
				initialConsents: { marketing: true },
			});
			const callback = vi.fn();
			const loader = createScriptLoader({
				kernel,
				scripts: [
					{
						category: 'marketing',
						id: 'late-retained',
						onError: callback,
						onLoad: callback,
						persistAfterConsentRevoked: true,
						src: 'https://example.test/pixel.js',
					},
				],
			});
			disposers.push(loader.dispose);
			const element = document.getElementById(
				getScriptDiagnostics(kernel)[0]?.elementId ?? ''
			);
			kernel.set.consent({ marketing: false });
			element?.dispatchEvent(new Event(event));
			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: expect.objectContaining({ marketing: false }),
					hasConsent: false,
				})
			);
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe('retained');
			kernel.set.consent({ marketing: true });
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe(
				event === 'load' ? 'loaded' : 'error'
			);
			element?.remove();
		}
	);
	it.each(['removed', 'replaced', 'disposed', 'unregistered'] as const)(
		'ignores late completion when a retained script is %s',
		(state) => {
			const kernel = createConsentKernel({
				initialConsents: { marketing: true },
			});
			const onLoad = vi.fn();
			const loader = createScriptLoader({
				kernel,
				scripts: [
					{
						category: 'marketing',
						id: 'stale-retained',
						onLoad,
						persistAfterConsentRevoked: true,
						src: 'https://example.test/pixel.js',
					},
				],
			});
			disposers.push(loader.dispose);
			const element = document.getElementById(
				getScriptDiagnostics(kernel)[0]?.elementId ?? ''
			);
			kernel.set.consent({ marketing: false });
			if (state === 'removed') {
				element?.remove();
			}
			if (state === 'replaced') {
				element?.replaceWith(element.cloneNode());
			}
			if (state === 'disposed') {
				loader.dispose();
			}
			if (state === 'unregistered') {
				loader.updateScripts([]);
			}
			element?.dispatchEvent(new Event('load'));
			expect(onLoad).not.toHaveBeenCalled();
			if (element) {
				document.getElementById(element.id)?.remove();
			}
		}
	);
	it('cleans up diagnostics and subscriptions when initial mounting fails', () => {
		const kernel = createConsentKernel();
		expect(() =>
			createScriptLoader({
				kernel,
				scripts: [
					{
						category: 'necessary',
						id: 'invalid',
						src: 'https://example.test/pixel.js',
						textContent: 'void 0;',
					},
				],
			})
		).toThrow();
		expect(getScriptDiagnostics(kernel)).toEqual([]);
		expect(() => kernel.set.consent({ marketing: true })).not.toThrow();
	});
	it.each([false, true])(
		'records initial script mounts with callbackOnly=%s',
		(callbackOnly) => {
			const kernel = createConsentKernel();
			const devTools = createDevTools({ kernel });
			disposers.push(devTools.destroy);
			const listener = vi.fn();
			disposers.push(subscribeScriptDiagnostics(kernel, listener));
			const loader = createScriptLoader({
				emitToV2DebugListeners: false,
				kernel,
				scripts: [
					{
						callbackOnly,
						category: 'necessary',
						id: 'initial-mount',
						textContent: 'void 0;',
					},
				],
			});
			disposers.push(loader.dispose);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'loaded', scriptId: 'initial-mount' })
			);
			expect(
				devTools
					.getState()
					.events.some((event) => event.type === 'script:loaded')
			).toBe(true);
		}
	);
	it('records retained revocations without legacy forwarding', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		const devTools = createDevTools({ kernel });
		disposers.push(devTools.destroy);
		const listener = vi.fn();
		disposers.push(subscribeScriptDiagnostics(kernel, listener));
		const loader = createScriptLoader({
			emitToV2DebugListeners: false,
			kernel,
			scripts: [
				{
					category: 'marketing',
					id: 'quiet-retained',
					persistAfterConsentRevoked: true,
					textContent: 'void 0;',
				},
			],
		});
		disposers.push(loader.dispose);
		kernel.set.consent({ marketing: false });
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'unloaded',
				data: { retained: true },
				scriptId: 'quiet-retained',
			})
		);
		expect(
			devTools
				.getState()
				.events.some((event) => event.type === 'script:unloaded')
		).toBe(true);
		document
			.getElementById(getScriptDiagnostics(kernel)[0]?.elementId ?? '')
			?.remove();
	});
	it.each(['load', 'error'] as const)(
		"preserves a retained script's observed %s result after consent is granted again",
		(event) => {
			const kernel = createConsentKernel({
				initialConsents: { marketing: true },
			});
			const loader = createScriptLoader({
				kernel,
				scripts: [
					{
						category: 'marketing',
						id: 'retained-result',
						persistAfterConsentRevoked: true,
						src: 'https://example.test/pixel.js',
					},
				],
			});
			disposers.push(loader.dispose);
			const element = document.getElementById(
				getScriptDiagnostics(kernel)[0]?.elementId ?? ''
			);
			element?.dispatchEvent(new Event(event));
			const status = event === 'load' ? 'loaded' : 'error';
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe(status);
			kernel.set.consent({ marketing: false });
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe('retained');
			kernel.set.consent({ marketing: true });
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe(status);
			expect(element?.isConnected).toBe(true);
			element?.remove();
		}
	);
	it('does not insert a later target after synchronous consent revocation', () => {
		const kernel = createConsentKernel();
		const append = document.head.appendChild.bind(document.head);
		const headProbe = vi
			.spyOn(document.head, 'appendChild')
			.mockImplementation((node) => {
				const result = append(node);
				kernel.set.consent({ marketing: false });
				return result;
			});
		const bodyProbe = vi.spyOn(document.body, 'appendChild');
		const onBodyLoad = vi.fn();
		try {
			const loader = createScriptLoader({
				kernel,
				scripts: [
					{ category: 'marketing', id: 'head-revokes', textContent: 'void 0;' },
					{
						category: 'marketing',
						id: 'body-pixel',
						onLoad: onBodyLoad,
						target: 'body',
						textContent: 'void 0;',
					},
				],
			});
			disposers.push(loader.dispose);
			kernel.set.consent({ marketing: true });
			expect(headProbe).toHaveBeenCalledOnce();
			expect(bodyProbe).not.toHaveBeenCalled();
			expect(onBodyLoad).not.toHaveBeenCalled();
			expect(getScriptDiagnostics(kernel).map(({ status }) => status)).toEqual([
				'blocked',
				'blocked',
			]);
			expect(document.querySelectorAll('script')).toHaveLength(0);
		} finally {
			headProbe.mockRestore();
			bodyProbe.mockRestore();
		}
	});
	it.each([false, true])(
		'distinguishes mounted and reused inline scripts without debug forwarding, reused=%s',
		(reused) => {
			if (reused) {
				const existing = document.createElement('script');
				existing.id = 'c15t-script-quiet-inline';
				document.body.append(existing);
			}
			const kernel = createConsentKernel();
			const loader = createScriptLoader({
				emitToV2DebugListeners: false,
				kernel,
				scripts: [
					{
						anonymizeId: false,
						category: 'necessary',
						id: 'quiet-inline',
						textContent: 'void 0;',
					},
				],
			});
			disposers.push(loader.dispose);
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe(
				reused ? 'present' : 'loaded'
			);
		}
	);
	it('observes synchronous load events during insertion', () => {
		const append = document.head.appendChild.bind(document.head);
		const probe = vi
			.spyOn(document.head, 'appendChild')
			.mockImplementation((node) => {
				const result = append(node);
				node.dispatchEvent(new Event('load'));
				return result;
			});
		try {
			const kernel = createConsentKernel();
			const onLoad = vi.fn();
			const loader = createScriptLoader({
				kernel,
				scripts: [
					{
						category: 'necessary',
						id: 'sync',
						onLoad,
						src: 'https://example.test/sync.js',
					},
				],
			});
			disposers.push(loader.dispose);
			expect(onLoad).toHaveBeenCalledOnce();
			expect(getScriptDiagnostics(kernel)[0]?.status).toBe('loaded');
		} finally {
			probe.mockRestore();
		}
	});
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
