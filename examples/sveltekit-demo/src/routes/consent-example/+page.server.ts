import { generateThemeCSS } from '@c15t/ui/theme';

import type { PageServerLoad } from './$types';

/**
 * Branded design tokens. The provider does not turn tokens into CSS in the
 * browser, so they are rendered here, on the server, and the first paint
 * already uses them.
 */
const brandedThemeCSS = generateThemeCSS({
	colors: { primary: '#146b56', primaryHover: '#105442' },
	radius: { lg: '1.25rem' },
});

export const load: PageServerLoad = ({ url }) => ({
	themeCSS:
		url.searchParams.get('theme') === 'branded' ? brandedThemeCSS : null,
});
