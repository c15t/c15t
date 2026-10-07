/**
 * `dist/c15t.js`, the default hosted one-tag install.
 *
 * Installs `window.c15t`, then initialises from the script tag's `data-*`
 * attributes and any queued `config` calls unless the tag carries
 * `data-manual`.
 */

import { publishDevToolsLauncher } from '@c15t/ui/utils/devtools-launcher';

import { autoInit, installGlobal } from '../global-base';
import { createHostedGlobal } from '../hosted-global';
import { mountConsentUI } from '../ui/mount';

const api = installGlobal(
	createHostedGlobal({
		mountUI: mountConsentUI,
		pkg: '@c15t/browser',
		publishDevToolsLauncher,
	})
);
autoInit(api);
