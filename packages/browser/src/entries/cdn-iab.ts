/** One-tag IAB install. Load instead of c15t.js. */
import { createIAB, initializeIABStub, destroyIABStub } from '@c15t/iab';
import { publishDevToolsLauncher } from '@c15t/ui/utils/devtools-launcher';

import { autoInit, createGlobal, installGlobal } from '../global';
import { mountIABConsentUI } from '../iab/mount';

const api = installGlobal(
	createGlobal({
		createIAB,
		mountUI: mountIABConsentUI,
		onStart: (options) => {
			if (options.iab !== false && options.iab?.enabled !== false) {
				initializeIABStub();
			}
			return destroyIABStub;
		},
		pkg: '@c15t/browser/iab',
		publishDevToolsLauncher,
	})
);
if (api.pkg !== '@c15t/browser/iab') {
	throw new Error('Load c15t.iab.js instead of c15t.js or c15t.headless.js.');
}
autoInit(api);
