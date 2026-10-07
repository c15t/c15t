/**
 * `dist/c15t.hosted.js`, the hosted one-tag install.
 *
 * Installs `window.c15t`, then initialises from the tag's `data-*`
 * attributes and queued configuration unless the tag carries `data-manual`.
 */

import { autoInit, installGlobal } from '../global-base';
import { createHostedGlobal } from '../hosted-global';
import { mountConsentUI } from '../ui/mount';

const api = installGlobal(createHostedGlobal({ mountUI: mountConsentUI }));
autoInit(api);
