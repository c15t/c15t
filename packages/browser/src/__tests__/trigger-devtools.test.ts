/**
 * With DevTools mounted for the same client, the stock trigger carries the
 * DevTools launcher and docks the panel, so one control sits in the corner.
 */
import type { DevToolsInstance } from '@c15t/dev-tools';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { mountDevTools } from '../devtools';
import type { C15tGlobalBase } from '../global-base';
import type {
	ConsentClient,
	ConsentClientOptions,
	ConsentUIHandle,
	ConsentUIOptions,
} from '../types';
import { mountConsentUI } from '../ui/mount';

const testWindow = window as Window & { c15t?: unknown };
const clients: ConsentClient[] = [];
const panels: DevToolsInstance[] = [];

// jsdom cannot parse the modern CSS in the sheet.
const ui: ConsentUIOptions = {
	banner: false,
	disableAnimation: true,
	styles: false,
	trigger: true,
};
// No banner, so the trigger shows as soon as the policy resolves.
const options: ConsentClientOptions = { policyRules: ['worldNone'], ui };

const start = async function start(): Promise<{
	client: ConsentClient;
	root: ParentNode;
}> {
	const client = createConsentClient(options, {
		mountUI: mountConsentUI,
		pkg: '@c15t/browser/test',
	});
	clients.push(client);
	client.start();
	await client.ready();
	return { client, root: (client.ui as ConsentUIHandle).root };
};

const devTools = function devTools(client: ConsentClient): DevToolsInstance {
	const panel = mountDevTools(client);
	panels.push(panel);
	return panel;
};

const action = function action(
	root: ParentNode,
	name: 'preferences' | 'devtools'
): HTMLButtonElement | null {
	return root.querySelector(`[data-c15t-trigger-action="${name}"]`);
};

const order = function order(root: ParentNode): (string | undefined)[] {
	return [...root.querySelectorAll<HTMLElement>('[role="toolbar"] button')].map(
		(button) => button.dataset.c15tTriggerAction
	);
};

afterEach(() => {
	for (const panel of panels.splice(0)) {
		panel.destroy();
	}
	(testWindow.c15t as C15tGlobalBase | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	document.body.replaceChildren();
});

describe('trigger with DevTools', () => {
	it('stays a single button without DevTools', async () => {
		const { root } = await start();

		const trigger = root.querySelector<HTMLElement>('[data-c15t-trigger]');
		expect(trigger?.getAttribute('data-testid')).toBe('consent-dialog-trigger');
		expect(trigger?.hidden).toBe(false);
		expect(root.querySelector('[role="toolbar"]')).toBeNull();
	});

	it('draws the whole c15t mark on the button and the toolbar', async () => {
		const { client, root } = await start();
		const mark = (scope: Element | null) =>
			scope?.querySelector('svg')?.getAttribute('viewBox');

		expect(mark(root.querySelector('[data-c15t-trigger]'))).toBe('0 0 446 445');
		devTools(client);
		expect(mark(action(root, 'preferences'))).toBe('0 0 446 445');
	});

	it('becomes a toolbar that docks DevTools mounted after it', async () => {
		const { root } = await start();
		const panel = devTools(clients[0] as ConsentClient);

		// Bottom-right: preferences in the corner, DevTools farthest from it.
		expect(order(root)).toEqual(['devtools', 'preferences']);
		expect(action(root, 'preferences')?.getAttribute('aria-label')).toBe(
			'Open privacy settings'
		);
		expect(root.querySelector('[data-testid="consent-dialog-trigger"]')).toBe(
			null
		);
		expect(panel.getState().dock?.position).toBe('bottom-right');
	});

	it('docks DevTools mounted before it', async () => {
		const client = createConsentClient(
			{ ...options, ui: false },
			{ mountUI: mountConsentUI, pkg: '@c15t/browser/test' }
		);
		clients.push(client);
		client.start();
		await client.ready();
		const panel = devTools(client);
		expect(panel.getState().dock).toBeNull();

		const handle = client.mountUI(ui);

		expect(order(handle.root)).toEqual(['devtools', 'preferences']);
		expect(panel.getState().dock?.position).toBe('bottom-right');
	});

	it('toggles DevTools and opens preferences from its items', async () => {
		const { client, root } = await start();
		const panel = devTools(client);
		const item = action(root, 'devtools');

		item?.click();
		expect(panel.getState().isOpen).toBe(true);
		expect(item?.getAttribute('aria-expanded')).toBe('true');
		item?.click();
		expect(panel.getState().isOpen).toBe(false);
		expect(item?.getAttribute('aria-expanded')).toBe('false');

		action(root, 'preferences')?.click();
		expect(client.getSnapshot().activeUI).toBe('dialog');
	});

	it('hands the launcher back while hidden and on teardown', async () => {
		const { client, root } = await start();
		const panel = devTools(client);
		expect(panel.getState().dock).not.toBeNull();

		client.openDialog();
		expect(root.querySelector('[role="toolbar"]')).toBeNull();
		expect(panel.getState().dock).toBeNull();

		client.closeDialog();
		expect(order(root)).toEqual(['devtools', 'preferences']);
		expect(panel.getState().dock).not.toBeNull();

		client.ui?.destroy();
		expect(panel.getState().dock).toBeNull();
	});

	it('turns back into the button when DevTools is destroyed', async () => {
		const { client, root } = await start();
		devTools(client).destroy();

		expect(root.querySelector('[role="toolbar"]')).toBeNull();
		expect(
			root.querySelector('[data-testid="consent-dialog-trigger"]')
		).not.toBeNull();
	});
});

describe('c15t.devtools.js', () => {
	/** Load a script-tag entry as its own bundle, with its own modules. */
	const loadTag = async function loadTag(
		entry: 'cdn-offline' | 'cdn-devtools'
	): Promise<void> {
		vi.resetModules();
		await (entry === 'cdn-offline'
			? import('../entries/cdn-offline')
			: import('../entries/cdn-devtools'));
	};

	it.each(['main tag first', 'DevTools tag first'])(
		'docks to the main tag trigger, %s',
		async (sequence) => {
			testWindow.c15t = [['config', options]];
			const [first, second] =
				sequence === 'main tag first'
					? (['cdn-offline', 'cdn-devtools'] as const)
					: (['cdn-devtools', 'cdn-offline'] as const);
			await loadTag(first);
			await loadTag(second);
			const api = testWindow.c15t as C15tGlobalBase;
			const client = api.client as ConsentClient;
			await client.ready();

			await vi.waitFor(() => {
				expect(api.devtools?.getState().dock?.position).toBe('bottom-right');
			});
			expect(order(client.ui?.root as ParentNode)).toEqual([
				'devtools',
				'preferences',
			]);
		}
	);
});
