import { defineTheme } from 'c15t/next';

// No 'use client': the root layout renders these tokens on the server with
// ConsentTheme, and the consent wrapper passes the same theme to ConsentRoot
// so the action buttons pick up `consentActions`.
export const northwindTheme = defineTheme({
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
	radius: { lg: '6px', md: '4px' },
	typography: {
		fontFamily: 'Georgia, "Times New Roman", serif',
	},
});
