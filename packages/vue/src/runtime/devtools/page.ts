import { DEVTOOLS_BRIDGE_KEY } from './constants';

/** c15t brand mark in the DevTools accent colours. */
export const DEVTOOLS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 446 445"><style>path{fill:#335cff}@media (prefers-color-scheme:dark){path{fill:#6685ff}}</style><path d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z"/></svg>`;

/**
 * Runs in the tab iframe. Finds the app's bridge in a parent frame, mounts
 * the panel, and follows the DevTools light/dark class. Polling picks up a
 * bridge registered after hydration or replaced by HMR.
 *
 * Plain ES2017 in a string: it ships as-is, without transpiler helpers.
 */
const CONNECT_SCRIPT = `(function (key) {
	var container = document.getElementById('c15t-devtools');
	var waiting = document.getElementById('c15t-devtools-waiting');
	var bridge;
	var mounted;
	function findBridge() {
		var frame = window;
		while (frame.parent !== frame) {
			frame = frame.parent;
			try {
				if (frame[key]) {
					return frame[key];
				}
			} catch (error) {
				// A cross-origin ancestor ends the search.
				return undefined;
			}
		}
		return undefined;
	}
	function readScheme() {
		try {
			var classes = window.parent.document.documentElement.classList;
			if (classes.contains('dark')) {
				return 'dark';
			}
			if (classes.contains('light')) {
				return 'light';
			}
		} catch (error) {
			// Unknown host: keep the operating system preference.
		}
		return '';
	}
	function syncScheme() {
		var scheme = readScheme();
		document.documentElement.style.colorScheme = scheme;
		if (mounted && mounted.element) {
			mounted.element.style.colorScheme = scheme;
		}
	}
	function connect() {
		var next = findBridge();
		if (next === bridge) {
			return;
		}
		if (mounted) {
			mounted.destroy();
		}
		mounted = undefined;
		bridge = next;
		waiting.hidden = Boolean(bridge);
		if (bridge) {
			mounted = bridge.mount(container);
			syncScheme();
		}
	}
	connect();
	setInterval(connect, 1000);
	try {
		new MutationObserver(syncScheme).observe(
			window.parent.document.documentElement,
			{ attributeFilter: ['class'] }
		);
	} catch (error) {
		// No readable parent; the panel follows the operating system.
	}
	addEventListener('pagehide', function () {
		if (mounted) {
			mounted.destroy();
		}
	});
})`;

/**
 * HTML for the c15t DevTools tab. The page carries no panel code: the app
 * mounts the panel into it, so the panel shares the app's kernel.
 *
 * @returns A standalone HTML document.
 */
export const renderDevToolsPage = (): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>c15t DevTools</title>
<style>
html, body, #c15t-devtools { height: 100%; margin: 0; }
#c15t-devtools:empty { display: none; }
html { color-scheme: light dark; }
body { font-family: ui-sans-serif, system-ui, sans-serif; }
#c15t-devtools-waiting { margin: 0; padding: 1.5rem; color: GrayText; font-size: 0.875rem; }
</style>
</head>
<body>
<p id="c15t-devtools-waiting">Waiting for the c15t consent provider in the app…</p>
<div id="c15t-devtools"></div>
<script>${CONNECT_SCRIPT}(${JSON.stringify(DEVTOOLS_BRIDGE_KEY)});</script>
</body>
</html>`;
