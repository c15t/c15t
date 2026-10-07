/**
 * `dist/c15t.offline.js`, the offline one-tag install.
 *
 * Installs `window.c15t`, then initialises from the tag's `data-*`
 * attributes and queued configuration unless the tag carries `data-manual`.
 */

import { autoInit, installGlobal } from '../global-base';
import { createOfflineGlobal } from '../offline-global';
import { mountConsentUI } from '../ui/mount';

const api = installGlobal(createOfflineGlobal({ mountUI: mountConsentUI }));
autoInit(api);
