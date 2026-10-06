/**
 * The `c15t-dark` class, kept in its own module so a page that only sets
 * the color scheme does not load the dialog's focus-trap and scroll-lock
 * helpers.
 */

/**
 * Manages color scheme preferences.
 *
 * Where `matchMedia` is missing, as in jsdom and a few embedded webviews,
 * `'system'` is light.
 *
 * @param colorScheme - 'light' | 'dark' | 'system'. Unset mirrors a `dark`
 * class on `<html>` into `c15t-dark` as it changes.
 * @returns Cleanup function
 */
export const setupColorScheme = function setupColorScheme(
	colorScheme?: 'light' | 'dark' | 'system'
) {
	const systemDarkQuery =
		typeof window.matchMedia === 'function'
			? window.matchMedia('(prefers-color-scheme: dark)')
			: undefined;
	const defaultDarkQuery = document.documentElement.classList.contains('dark');

	const updateSystemColorScheme = (e: { matches: boolean }) => {
		document.documentElement.classList.toggle('c15t-dark', e.matches);
	};

	const updateDefaultColorScheme = (mutationList: MutationRecord[]) => {
		for (const mutation of mutationList) {
			if (
				mutation.type === 'attributes' &&
				mutation.attributeName === 'class'
			) {
				const darkExists = document.documentElement.classList.contains('dark');
				document.documentElement.classList.toggle('c15t-dark', darkExists);
			}
		}
	};

	const observer = new MutationObserver(updateDefaultColorScheme);

	const apply = () => {
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
				updateSystemColorScheme(systemDarkQuery ?? { matches: false });
				systemDarkQuery?.addEventListener('change', updateSystemColorScheme);
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
	};

	apply();

	return () => {
		systemDarkQuery?.removeEventListener('change', updateSystemColorScheme);
		observer.disconnect();
	};
};
