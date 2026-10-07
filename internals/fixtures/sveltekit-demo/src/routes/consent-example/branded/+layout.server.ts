import { themeCSS } from '#lib/server/consent-theme.js';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({ themeCSS });
