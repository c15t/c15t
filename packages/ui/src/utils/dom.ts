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

let lastFocusedElement: HTMLElement | null = null;

if (typeof document !== 'undefined') {
	document.addEventListener(
		'focusin',
		(event) => {
			if (
				event.target instanceof HTMLElement &&
				event.target !== document.body &&
				event.target !== document.documentElement
			) {
				lastFocusedElement = event.target;
			}
		},
		true
	);
}

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
		'a[href]:not([disabled]):not([tabindex="-1"])',
		'button:not([disabled]):not([tabindex="-1"])',
		'textarea:not([disabled]):not([tabindex="-1"])',
		'input:not([disabled]):not([tabindex="-1"])',
		'select:not([disabled]):not([tabindex="-1"])',
		'[contenteditable]:not([tabindex="-1"])',
		'[tabindex]:not([tabindex="-1"])',
	].join(',');

	return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
		(el) => {
			if (typeof el.checkVisibility === 'function') {
				return el.checkVisibility({ checkVisibilityCSS: true });
			}
			// Fallback for browsers without checkVisibility: rendered elements
			// have at least one layout box.
			if (el.getClientRects().length > 0) {
				return true;
			}
			// No layout box. In a real browser that means the element is not
			// rendered — but jsdom (used by the conformance suites) never
			// produces layout boxes, so detect layout-less environments and use
			// an attribute-based visibility heuristic there instead.
			const environmentHasLayout =
				document.documentElement.getClientRects().length > 0;
			if (environmentHasLayout) {
				return false;
			}
			for (let node: HTMLElement | null = el; node; node = node.parentElement) {
				if (node.hidden || node.style.display === 'none') {
					return false;
				}
			}
			return true;
		}
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
 * Finds a rendered equivalent of an element that was unmounted while a focus
 * trap was active. Consent surfaces often unmount their opener while open
 * (e.g. the floating dialog trigger hides while the dialog is shown and
 * re-renders as a new node on close), so restoring focus to the original
 * node would silently no-op and drop keyboard users at `<body>`. Matching by
 * `id`, then by `data-testid`, re-targets the remounted opener instead.
 */
function findFocusRestoreEquivalent(element: HTMLElement): HTMLElement | null {
	if (element.id) {
		const byId = document.getElementById(element.id);
		if (byId) {
			return byId;
		}
	}

	const testId = element.getAttribute('data-testid');
	if (testId) {
		const escaped =
			typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
				? CSS.escape(testId)
				: testId;
		return document.querySelector<HTMLElement>(`[data-testid="${escaped}"]`);
	}

	return null;
}

/**
 * Traps focus within a container.
 * @returns Cleanup function to remove listeners and restore focus
 */
export function setupFocusTrap(container: HTMLElement) {
	const activeElement = document.activeElement as HTMLElement | null;
	const previousFocus =
		activeElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement
			? activeElement
			: lastFocusedElement;

	// Focus the container itself so the user can read the content first,
	// then Tab into interactive elements (links, then buttons).
	// This avoids biasing initial focus toward a specific action button.
	if (container.tabIndex < 0) {
		container.tabIndex = -1;
	}
	setTimeout(() => {
		try {
			const activeElement = document.activeElement;
			if (
				activeElement instanceof HTMLElement &&
				activeElement !== document.body &&
				container.contains(activeElement)
			) {
				return;
			}
			container.focus({ preventScroll: true });
		} catch {
			// Silently handle focus errors
		}
	}, 0);

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
		const active = document.activeElement as HTMLElement | null;
		const inside = active
			? active === container || container.contains(active)
			: false;

		// Shift+Tab wraps to the last focusable when focus would otherwise
		// escape: from the first focusable, from the focused container itself
		// (its previous sibling in tab order is outside the trap), or when
		// focus already ended up outside the trap.
		if (
			e.shiftKey &&
			(!inside || active === container || active === firstElement)
		) {
			e.preventDefault();
			lastElement?.focus({ preventScroll: true });
		}
		// Tab wraps to the first focusable from the last one, or pulls focus
		// back in when it escaped. Tab from the focused container proceeds
		// natively into the first focusable descendant.
		else if (!e.shiftKey && (!inside || active === lastElement)) {
			e.preventDefault();
			firstElement?.focus({ preventScroll: true });
		}
	};

	document.addEventListener('keydown', handleKeyDown);

	return () => {
		document.removeEventListener('keydown', handleKeyDown);

		// Restore focus when trap is disabled. If the previously-focused
		// element was unmounted while the trap was active, fall back to its
		// re-rendered equivalent (matched by id/data-testid) when one exists.
		if (previousFocus && typeof previousFocus.focus === 'function') {
			setTimeout(() => {
				const target = previousFocus.isConnected
					? previousFocus
					: findFocusRestoreEquivalent(previousFocus);
				target?.focus({ preventScroll: true });
			}, 0);
		}
	};
}
