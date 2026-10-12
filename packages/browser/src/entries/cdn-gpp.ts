/**
 * `dist/c15t.gpp.js` — IAB GPP as a second script tag.
 *
 * ```html
 * <script src=".../c15t.gpp.js"></script>
 * <script src=".../c15t.js" data-backend-url="..." defer></script>
 * ```
 *
 * Works with `c15t.js`, `c15t.headless.js` and `c15t.iab.js`, in either
 * order. It installs the `__gpp` stub as soon as it runs, so load it before
 * ad tags that call `__gpp`, then hands `createGPP` to the client, which
 * mounts the API with the page's `gpp` options. `gpp: false` turns it off.
 */

import { createGPP, destroyGPPStub, initializeGPPStub } from '@c15t/iab/gpp';

import type { C15tGlobal, QueuedCall } from '../global';
import type { ConsentClient } from '../types';

type GlobalWindow = Window & { c15t?: C15tGlobal | QueuedCall[] };

initializeGPPStub();

const provided = { createGPP };
const removeStubWhenOff = function removeStubWhenOff(
	client: ConsentClient
): void {
	if (client.options.gpp === false) {
		destroyGPPStub();
	}
};

const existing = (window as GlobalWindow).c15t;
if (existing && !Array.isArray(existing)) {
	if (typeof existing.provideGPP === 'function') {
		existing.provideGPP(provided);
		existing.onInit(removeStubWhenOff);
	} else {
		// oxlint-disable-next-line no-console -- Authoring-time diagnostic.
		console.warn(
			'@c15t/browser: c15t.gpp.js needs a newer c15t.js. Load both from the same version.'
		);
	}
} else {
	// The main tag has not run yet; it replays these once it installs.
	(window as GlobalWindow).c15t = [
		...(existing ?? []),
		['provideGPP', provided],
		['onInit', removeStubWhenOff],
	];
}
