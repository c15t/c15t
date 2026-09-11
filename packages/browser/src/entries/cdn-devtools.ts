/**
 * `dist/c15t.devtools.js` — the DevTools panel as a second script tag.
 *
 * ```html
 * <script src=".../c15t.js" data-backend-url="..." defer></script>
 * <script src=".../c15t.devtools.js" data-open data-tab="location" defer></script>
 * ```
 *
 * Order does not matter: loaded first, it queues itself on `window.c15t`
 * the way any pre-load call does and mounts once the client initialises.
 * The panel lands on `window.c15t.devtools`.
 */

import type { DevToolsPosition, DevToolsTab } from '@c15t/dev-tools';

import { mountDevTools } from '../devtools';
import type { BrowserDevToolsOptions } from '../devtools';
import type { C15tGlobal, QueuedCall } from '../global';
import type { ConsentClient } from '../types';

const TABS: ReadonlySet<string> = new Set<DevToolsTab>([
	'consents',
	'scripts',
	'location',
	'policy',
	'iab',
	'events',
	'actions',
]);
const POSITIONS: ReadonlySet<string> = new Set<DevToolsPosition>([
	'bottom-right',
	'bottom-left',
	'top-right',
	'top-left',
]);

const readOptions = function readOptions(
	script: Element | null
): BrowserDevToolsOptions {
	const options: BrowserDevToolsOptions = {};
	if (!script) {
		return options;
	}
	if (script.hasAttribute('data-open')) {
		options.defaultOpen = script.getAttribute('data-open') !== 'false';
	}
	const tab = script.getAttribute('data-tab');
	if (tab && TABS.has(tab)) {
		options.defaultTab = tab as DevToolsTab;
	}
	const position = script.getAttribute('data-position');
	if (position && POSITIONS.has(position)) {
		options.position = position as DevToolsPosition;
	}
	return options;
};

type GlobalWindow = Window & { c15t?: C15tGlobal | QueuedCall[] };

const options = readOptions(document.currentScript);
const mount = function mount(client: ConsentClient): void {
	const instance = mountDevTools(client, options);
	const api = (window as GlobalWindow).c15t;
	if (api && !Array.isArray(api)) {
		api.devtools = instance;
	}
};

const existing = (window as GlobalWindow).c15t;
if (existing && !Array.isArray(existing)) {
	existing.onInit(mount);
} else {
	// The main tag has not run yet; it replays this once it installs.
	(window as GlobalWindow).c15t = [...(existing ?? []), ['onInit', mount]];
}
