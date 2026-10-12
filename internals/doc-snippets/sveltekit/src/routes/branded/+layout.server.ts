// #region docs:theme-load title="src/routes/+layout.server.ts"
import { themeCSS } from '#lib/server/consent-theme.js';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({ themeCSS });
// #endregion docs:theme-load
