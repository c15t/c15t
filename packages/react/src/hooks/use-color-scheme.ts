import { useEffect } from 'react';

export type ColorScheme = 'light' | 'dark' | 'system';

/**
 * Manage color scheme preferences for components
 *
 * @param colorScheme - 'light' | 'dark' | 'system'
 *
 * @example
 * ```tsx
 * function App() {
 *   useColorScheme('system');
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useColorScheme(colorScheme: ColorScheme) {
	useEffect(() => {
		// Function to update the theme based on system preference
		const updateSystemTheme = () => {
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			document.documentElement.classList.toggle('c15t-dark', isDark);
		};

		// Handle different color scheme settings
		switch (colorScheme) {
			case 'light': {
				localStorage.c15tTheme = 'light';
				document.documentElement.classList.remove('c15t-dark');
				break;
			}
			case 'dark': {
				localStorage.c15tTheme = 'dark';
				document.documentElement.classList.add('c15t-dark');
				break;
			}
			default: {
				localStorage.removeItem('c15tTheme');
				updateSystemTheme();
				break;
			}
		}

		// Set up system preference listener for 'system' mode
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (colorScheme === 'system') {
				updateSystemTheme();
			}
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [colorScheme]);
}
