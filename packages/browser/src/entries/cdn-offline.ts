/**
 * `dist/c15t.offline.js`, the old name for `dist/c15t.local.js`. c15t v4
 * removes it.
 *
 * @deprecated Load `c15t.local.js`.
 */

import { publishDevToolsLauncher } from '@c15t/ui/utils/devtools-launcher';

import { autoInit, installGlobal } from '../global-base';
import { isDevelopmentHost } from '../no-records-warning';
import { createOfflineGlobal } from '../offline-global';
import { mountConsentUI } from '../ui/mount';

if (typeof location !== 'undefined' && isDevelopmentHost(location.hostname)) {
	// oxlint-disable-next-line no-console -- Authoring-time diagnostic.
	console.warn(
		'[c15t] c15t.offline.js is now c15t.local.js. c15t v4 removes the old file name.'
	);
}

const api = installGlobal(
	createOfflineGlobal({ mountUI: mountConsentUI, publishDevToolsLauncher })
);
autoInit(api);
