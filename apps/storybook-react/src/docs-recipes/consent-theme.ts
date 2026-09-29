// #region docs:brand-theme title="src/consent-theme.ts"
import { defineTheme } from 'c15t/react';

export const brandTheme = defineTheme({
	colors: {
		border: '#e4dccf',
		primary: '#2f6f4e',
		primaryHover: '#24563c',
		surface: '#fbf8f3',
		textOnPrimary: '#ffffff',
	},
	consentActions: {
		primary: { mode: 'filled', variant: 'primary' },
	},
	radius: { lg: '4px', md: '4px' },
	typography: {
		fontFamily: 'Georgia, "Times New Roman", serif',
	},
});
// #endregion docs:brand-theme
