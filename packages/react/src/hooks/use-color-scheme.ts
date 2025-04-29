import { useEffect } from 'react';

export type ColorScheme = 'light' | 'dark' | 'system' | null;

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
export function useColorScheme(colorScheme?: ColorScheme) {
	useEffect(() => {
		const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const defaultDarkQuery =
			document.documentElement.classList.contains('dark');

		const updateSystemColorScheme = (e: MediaQueryListEvent) => {
			document.documentElement.classList.toggle('c15t-dark', e.matches);
		};

		const updateDefaultColorScheme = (mutationList: MutationRecord[]) => {
			for (const mutation of mutationList) {
				if (
					mutation.type === 'attributes' &&
					mutation.attributeName === 'class'
				) {
					const darkExists =
						document.documentElement.classList.contains('dark');
					document.documentElement.classList.toggle('c15t-dark', darkExists);
				}
			}
		};

		const observer = new MutationObserver(updateDefaultColorScheme);

		switch (colorScheme) {
			case 'light': {
				document.documentElement.classList.remove('c15t-dark');
				break;
			}
			case 'dark': {
				document.documentElement.classList.add('c15t-dark');
				break;
			}
			case 'system': {
				document.documentElement.classList.toggle(
					'c15t-dark',
					systemDarkQuery.matches
				);
				systemDarkQuery.addEventListener('change', updateSystemColorScheme);
				break;
			}
			default: {
				document.documentElement.classList.toggle(
					'c15t-dark',
					defaultDarkQuery
				);
				observer.observe(document.documentElement, { attributes: true });
				break;
			}
		}

		return () => {
			systemDarkQuery.removeEventListener('change', updateSystemColorScheme);
			observer.disconnect();
		};
	}, [colorScheme]);
}
