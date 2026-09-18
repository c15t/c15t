/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import { choiceRecords } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
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
