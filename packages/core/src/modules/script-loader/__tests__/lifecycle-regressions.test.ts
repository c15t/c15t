/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import { choiceRecords } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { getScriptDiagnostics } from '../diagnostics';
import { createScriptLoader } from '../index';
import type { Script } from '../index';

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	document.head.replaceChildren();
	document.body.replaceChildren();
	delete document.body.dataset.runs;
	vi.restoreAllMocks();
});

const mount = (scripts: Script[]) => {
	const kernel = createConsentKernel({
		initialRecords: choiceRecords({ measurement: true }),
	});
	const loader = createScriptLoader({ kernel, scripts });
	disposers.push(kernel.dispose, loader.dispose);
	return { kernel, loader };
};

test('keeps a same-ID vendor mounted when a rerender recreates its callbacks', () => {
	const initialize = vi.fn();
	const consent = vi.fn();
	const config = (): Script => ({
		alwaysLoad: true,
		category: 'measurement',
		id: 'rerender',
		onBeforeLoad: () => initialize(),
		onConsentChange: ({ hasConsent }) => consent(hasConsent),
		src: 'https://example.com/vendor.js',
	});
	const { loader } = mount([config()]);
	const element = document.head.querySelector('script');
	loader.updateScripts([config()]);
	loader.updateScripts([config()]);
	expect(document.head.querySelector('script')).toBe(element);
	expect(initialize).toHaveBeenCalledOnce();
	expect(consent.mock.calls).toEqual([[true], [true]]);
});

test.each([false, true])(
	'does not execute a self-removing inline script again, batched=%s',
	(batched) => {
		const script: Script = {
			attributes: { 'data-self-remove': '' },
			category: 'necessary',
			id: 'self-remove',
			textContent: `document.body.dataset.runs = String(Number(document.body.dataset.runs ?? 0) + 1); document.currentScript.remove();`,
		};
		const scripts: Script[] = batched
			? [script, { category: 'necessary', id: 'other', textContent: 'void 0' }]
			: [script];
		const { loader } = mount(scripts);
		expect(document.body.dataset.runs).toBe('1');
		loader.updateScripts(scripts);
		expect(document.body.dataset.runs).toBe('1');
		expect(loader.getLoadedScriptIds()).toContain('self-remove');
	}
);

test.each(['replace', 'remove', 'dispose'] as const)(
	'%s removes an owned script retained after revocation',
	(action) => {
		const script: Script = {
			category: 'measurement',
			id: 'retained',
			persistAfterConsentRevoked: true,
			src: 'https://example.com/old.js',
		};
		const { kernel, loader } = mount([script]);
		const element = document.head.querySelector('script');
		void kernel.commands.save({ measurement: false });
		expect(element?.isConnected).toBe(true);
		if (action === 'dispose') {
			loader.dispose();
		} else {
			loader.updateScripts(
				action === 'remove'
					? []
					: [{ ...script, src: 'https://example.com/new.js' }]
			);
		}
		expect(element?.isConnected).toBe(false);
		void kernel.commands.save({ measurement: true });
		expect(Array.from(document.scripts, (node) => node.src)).toEqual(
			action === 'replace' ? ['https://example.com/new.js'] : []
		);
	}
);

test('stops a consent callback feedback loop and reports the failure', () => {
	const kernel = createConsentKernel();
	const cleanup = vi.fn();
	const debug = vi.fn();
	let calls = 0;
	let allowed = true;
	const loader = createScriptLoader({
		kernel,
		onDebug: debug,
		scripts: [
			{
				callbackOnly: true,
				category: 'necessary',
				id: 'feedback-loop',
				onConsentChange: () => {
					calls += 1;
					// Bound the reproduction so the unfixed implementation cannot
					// hang the test process indefinitely.
					if (calls < 1000) {
						allowed = !allowed;
						void kernel.commands.save({ measurement: allowed });
					}
				},
				onDispose: cleanup,
			},
		],
	});
	disposers.push(kernel.dispose, loader.dispose);
	void kernel.commands.save({ measurement: allowed });
	expect(calls).toBeLessThan(1000);
	expect(debug).toHaveBeenCalledWith(
		expect.objectContaining({
			action: 'error',
			message: expect.stringContaining('feedback loop'),
		})
	);
	expect(loader.getLoadedScriptIds()).toEqual([]);
	expect(cleanup).toHaveBeenCalledOnce();
});

test('configuration removal leaves a borrowed retained element in place', () => {
	const foreign = document.createElement('script');
	foreign.id = 'c15t-script-borrowed';
	foreign.src = 'https://example.com/foreign.js';
	document.head.appendChild(foreign);
	const { kernel, loader } = mount([
		{
			anonymizeId: false,
			category: 'measurement',
			id: 'borrowed',
			persistAfterConsentRevoked: true,
			src: foreign.src,
		},
	]);
	void kernel.commands.save({ measurement: false });
	loader.updateScripts([]);
	loader.dispose();
	expect(foreign.isConnected).toBe(true);
});

test.each(['revoke', 'replace'] as const)(
	'cancels callback-only onLoad when onBeforeLoad requests %s',
	(action) => {
		const { kernel, loader } = mount([]);
		const load = vi.fn();
		const replacementLoad = vi.fn();
		loader.updateScripts([
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'callback-interrupted',
				onBeforeLoad: () => {
					if (action === 'revoke') {
						void kernel.commands.save({ measurement: false });
					} else {
						loader.updateScripts([
							{
								callbackOnly: true,
								category: 'necessary',
								id: 'replacement',
								onLoad: replacementLoad,
							},
						]);
					}
				},
				onLoad: load,
			},
		]);
		expect(load).not.toHaveBeenCalled();
		expect(loader.getLoadedScriptIds()).toEqual(
			action === 'replace' ? ['replacement'] : []
		);
		expect(replacementLoad).toHaveBeenCalledTimes(action === 'replace' ? 1 : 0);
	}
);

test.each([
	['replace', false],
	['remove', false],
	['dispose', false],
	['replace', true],
	['remove', true],
	['dispose', true],
] as const)(
	'passes the original element to onDispose for %s, retained=%s',
	(action, retained) => {
		const cleanup = vi.fn();
		const script: Script = {
			category: 'measurement',
			id: 'dispose-element',
			onDispose: cleanup,
			persistAfterConsentRevoked: true,
			src: 'https://example.com/old.js',
		};
		const { kernel, loader } = mount([script]);
		const element = document.head.querySelector('script');
		if (retained) {
			void kernel.commands.save({ measurement: false });
		}
		if (action === 'dispose') {
			loader.dispose();
		} else {
			loader.updateScripts(
				action === 'remove'
					? []
					: [{ ...script, src: 'https://example.com/new.js' }]
			);
		}
		expect(cleanup).toHaveBeenCalledOnce();
		expect(cleanup).toHaveBeenCalledWith(expect.objectContaining({ element }));
	}
);

test('retries aborted preparation with the latest consent and a new element', () => {
	const { kernel, loader } = mount([]);
	const prepared: HTMLScriptElement[] = [];
	const permissions: boolean[] = [];
	loader.updateScripts([
		{
			alwaysLoad: true,
			category: 'measurement',
			id: 'retry-preparation',
			onBeforeLoad: ({ element, hasConsent }) => {
				if (!element) {
					throw new Error('Expected a prepared script element');
				}
				prepared.push(element);
				permissions.push(hasConsent);
				element.dataset.permission = String(hasConsent);
				if (hasConsent) {
					void kernel.commands.save({ measurement: false });
				}
			},
			textContent: 'void 0',
		},
	]);
	expect(permissions).toEqual([true, false]);
	expect(prepared[0]?.isConnected).toBe(false);
	expect(prepared[1]?.isConnected).toBe(true);
	expect(document.head.querySelector('script')?.dataset.permission).toBe(
		'false'
	);
});

test.each(['load', 'error'] as const)(
	'delivers delayed %s to the current same-resource configuration',
	(event) => {
		const oldCallback = vi.fn();
		const currentCallback = vi.fn();
		const script: Script = {
			alwaysLoad: true,
			category: 'measurement',
			id: 'latest-callback',
			onError: oldCallback,
			onLoad: oldCallback,
			src: 'https://example.com/vendor.js',
		};
		const { kernel, loader } = mount([script]);
		const element = document.head.querySelector('script');
		loader.updateScripts([
			{ ...script, onError: currentCallback, onLoad: currentCallback },
		]);
		void kernel.commands.save({ measurement: false });
		element?.dispatchEvent(new Event(event));
		expect(oldCallback).not.toHaveBeenCalled();
		expect(currentCallback).toHaveBeenCalledOnce();
		expect(currentCallback).toHaveBeenCalledWith(
			expect.objectContaining({ element, hasConsent: false })
		);
		expect(document.head.querySelector('script')).toBe(element);
	}
);

test('delivers deferred inline completion to callbacks added before completion', async () => {
	const script: Script = {
		category: 'necessary',
		id: 'latest-inline',
		textContent: 'void 0',
	};
	const { loader } = mount([script]);
	const currentCallback = vi.fn();
	loader.updateScripts([{ ...script, onLoad: currentCallback }]);
	await new Promise((resolve) => {
		setTimeout(resolve, 10);
	});
	expect(currentCallback).toHaveBeenCalledOnce();
});

test.each([false, true])(
	'disabling retention removes only owned elements, borrowed=%s',
	(borrowed) => {
		const script: Script = {
			anonymizeId: false,
			category: 'measurement',
			id: 'disable-retention',
			persistAfterConsentRevoked: true,
			src: 'https://example.com/vendor.js',
		};
		if (borrowed) {
			const foreign = document.createElement('script');
			foreign.id = 'c15t-script-disable-retention';
			foreign.src = script.src ?? '';
			document.head.appendChild(foreign);
		}
		const { kernel, loader } = mount([script]);
		const element = document.head.querySelector('script');
		void kernel.commands.save({ measurement: false });
		expect(element?.isConnected).toBe(true);
		loader.updateScripts([{ ...script, persistAfterConsentRevoked: false }]);
		expect(element?.isConnected).toBe(borrowed);
		loader.dispose();
		expect(element?.isConnected).toBe(borrowed);
	}
);

test.each(['load', 'error'] as const)(
	'does not apply an obsolete %s status after its callback replaces the resource',
	(event) => {
		const { kernel, loader } = mount([]);
		const replacement: Script = {
			category: 'necessary',
			id: 'completion-replaced',
			src: 'https://example.com/new.js',
		};
		const replace = () => loader.updateScripts([replacement]);
		loader.updateScripts([
			{
				...replacement,
				onError: replace,
				onLoad: replace,
				src: 'https://example.com/old.js',
			},
		]);
		const original = document.head.querySelector('script');
		original?.dispatchEvent(new Event(event));
		expect(getScriptDiagnostics(kernel)).toEqual([
			expect.objectContaining({
				src: replacement.src,
				status: 'loading',
			}),
		]);
		const current = document.head.querySelector('script');
		expect(current).not.toBe(original);
		current?.dispatchEvent(new Event('load'));
		expect(getScriptDiagnostics(kernel)[0]?.status).toBe('loaded');
	}
);

test('records completion when onLoad removes its own element without replacing the configuration', () => {
	const { kernel } = mount([
		{
			category: 'necessary',
			id: 'remove-on-load',
			onLoad: ({ element }) => element?.remove(),
			src: 'https://example.com/vendor.js',
		},
	]);
	document.head.querySelector('script')?.dispatchEvent(new Event('load'));
	expect(document.head.querySelector('script')).toBeNull();
	expect(getScriptDiagnostics(kernel)[0]?.status).toBe('loaded');
});
