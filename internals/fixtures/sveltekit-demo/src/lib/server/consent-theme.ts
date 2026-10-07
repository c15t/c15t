import { generateThemeCSS } from '@c15t/ui/theme';

// Modules in a `server` directory never reach the browser, so the theme
// generator stays on the server. The CSS is generated once, when the server
// starts.
export const themeCSS = generateThemeCSS({
	colors: {
		primary: '#6943a3',
		primaryHover: '#533285',
		textOnPrimary: '#ffffff',
	},
	radius: { lg: '18px' },
});
