import { defineEventHandler, setResponseHeader } from 'h3';

import { DEVTOOLS_ICON_ROUTE } from '../devtools/constants';
import { DEVTOOLS_ICON_SVG, renderDevToolsPage } from '../devtools/page';

/** Serves the c15t Nuxt DevTools tab page and its icon. Development only. */
export default defineEventHandler((event) => {
	setResponseHeader(event, 'Cache-Control', 'no-store');
	if (event.path.split('?')[0]?.endsWith(DEVTOOLS_ICON_ROUTE)) {
		setResponseHeader(event, 'Content-Type', 'image/svg+xml');
		return DEVTOOLS_ICON_SVG;
	}
	setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
	return renderDevToolsPage();
});
