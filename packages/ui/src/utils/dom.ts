/**
 * Utility functions for DOM manipulation and browser-specific logic.
 * Framework-agnostic.
 */

/**
 * Manages color scheme preferences.
 *
 * @param colorScheme - 'light' | 'dark' | 'system'
 * @returns Cleanup function
 */
export function setupColorScheme(colorScheme?: 'light' | 'dark' | 'system') {
	const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const defaultDarkQuery = document.documentElement.classList.contains('dark');

	const updateSystemColorScheme = (e: MediaQueryListEvent | MediaQueryList) => {
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
				updateSystemColorScheme(systemDarkQuery);
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
	};

	apply();

	return () => {
		systemDarkQuery.removeEventListener('change', updateSystemColorScheme);
		observer.disconnect();
	};
}

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv'];

/**
 * Gets text direction based on the language.
 */
export function getTextDirection(language?: string): 'rtl' | 'ltr' {
	const normalizedLanguage = language
		? language.split('-')[0]?.toLowerCase()
		: 'en';
	return RTL_LANGUAGES.includes(normalizedLanguage || '') ? 'rtl' : 'ltr';
}

/**
 * Sets text direction class on document body.
 * @returns Cleanup function
 */
export function setupTextDirection(language?: string) {
	const direction = getTextDirection(language);
	if (direction === 'rtl') {
		document.body.classList.add('c15t-rtl');
	} else {
		document.body.classList.remove('c15t-rtl');
	}

	return () => {
		document.body.classList.remove('c15t-rtl');
	};
}

/**
 * Gets all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const selector = [
		'a[href]:not([disabled])',
		'button:not([disabled])',
		'textarea:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'[contenteditable]',
		'[tabindex]:not([tabindex="-1"])',
	].join(',');

	return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
		(el) => el.offsetWidth > 0 && el.offsetHeight > 0
	);
}

/**
 * Locks document scrolling.
 * @returns Cleanup function to restore scroll
 */
export function setupScrollLock() {
	const originalStyles = {
		overflow: document.body.style.overflow,
		paddingRight: document.body.style.paddingRight,
	};

	const scrollbarWidth =
		window.innerWidth - document.documentElement.clientWidth;

	document.body.style.overflow = 'hidden';
	if (scrollbarWidth > 0) {
		document.body.style.paddingRight = `${scrollbarWidth}px`;
	}

	return () => {
		document.body.style.overflow = originalStyles.overflow;
		document.body.style.paddingRight = originalStyles.paddingRight;
	};
}

/**
 * Traps focus within a container.
 * @returns Cleanup function to remove listeners and restore focus
 */
export function setupFocusTrap(container: HTMLElement) {
	const previousFocus = document.activeElement as HTMLElement;

	// Get all focusable elements within the container
	const focusableElements = getFocusableElements(container);

	// Focus the first element if available
	if (focusableElements.length > 0) {
		setTimeout(() => {
			focusableElements[0]?.focus();
		}, 0);
	} else if (container.tabIndex !== -1) {
		// If no focusable elements, focus the container itself
		try {
			container.focus();
		} catch {
			// Silently handle focus errors
		}
	}

	// Tab key event handler
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key !== 'Tab') {
			return;
		}

		const elements = getFocusableElements(container);
		if (elements.length === 0) {
			return;
		}

		const firstElement = elements[0];
		const lastElement = elements[elements.length - 1];

		// Shift+Tab on first element cycles to last element
		if (e.shiftKey && document.activeElement === firstElement) {
			e.preventDefault();
			lastElement?.focus();
		}
		// Tab on last element cycles to first element
		else if (!e.shiftKey && document.activeElement === lastElement) {
			e.preventDefault();
			firstElement?.focus();
		}
	};

	document.addEventListener('keydown', handleKeyDown);

	return () => {
		document.removeEventListener('keydown', handleKeyDown);

		// Restore focus when trap is disabled
		if (previousFocus && typeof previousFocus.focus === 'function') {
			setTimeout(() => previousFocus.focus(), 0);
		}
	};
}
