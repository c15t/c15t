import { defineTheme } from 'c15t/next';

// Northwind's colors for the stock banner and dialog. The experiment's arms
// change the banner's shape, not these tokens. No 'use client', so the
// server layout can render it as CSS.
export const brandTheme = defineTheme({
	colors: {
		border: '#e4dccf',
		primary: '#2f6f4e',
		primaryHover: '#24563c',
		surface: '#fbf8f3',
		text: '#1f2328',
		textMuted: '#5b6168',
		textOnPrimary: '#ffffff',
	},
	consentActions: {
		primary: { mode: 'filled', variant: 'primary' },
	},
	radius: { lg: '6px', md: '4px' },
	typography: {
		fontFamily: 'Georgia, "Times New Roman", serif',
	},
});
