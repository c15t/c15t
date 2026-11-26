import { defineEventHandler } from 'nuxt/server';

import { DEVTOOLS_ICON_ROUTE } from '../devtools/constants';
import { DEVTOOLS_ICON_SVG, renderDevToolsPage } from '../devtools/page';

/** Serves the c15t Nuxt DevTools tab page and its icon. Development only. */
export default defineEventHandler((event) => {
	const icon = event.url.pathname.endsWith(DEVTOOLS_ICON_ROUTE);
	return new Response(icon ? DEVTOOLS_ICON_SVG : renderDevToolsPage(), {
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': icon ? 'image/svg+xml' : 'text/html; charset=utf-8',
		},
	});
});
