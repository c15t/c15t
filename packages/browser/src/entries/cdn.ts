/**
 * `dist/c15t.js` — the one-tag install.
 *
 * Installs `window.c15t`, then initialises from the script tag's `data-*`
 * attributes and `window.c15tConfig` unless the tag carries
 * `data-manual`.
 */

import { autoInit, createGlobal, installGlobal } from '../global';
import { mountConsentUI } from '../ui/mount';

const api = createGlobal({ mountUI: mountConsentUI, pkg: '@c15t/browser' });
installGlobal(api);
autoInit(api);
