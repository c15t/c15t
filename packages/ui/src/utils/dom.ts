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
export const setupColorScheme = function setupColorScheme(
	colorScheme?: 'light' | 'dark' | 'system'
) {
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
};

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
export const getTextDirection = function getTextDirection(
	language?: string
): 'rtl' | 'ltr' {
	const normalizedLanguage = language
		? language.split('-')[0]?.toLowerCase()
		: 'en';
	return RTL_LANGUAGES.includes(normalizedLanguage || '') ? 'rtl' : 'ltr';
};

/**
 * Sets text direction class on document body.
 * @returns Cleanup function
 */
export const setupTextDirection = function setupTextDirection(
	language?: string
) {
	const direction = getTextDirection(language);
	if (direction === 'rtl') {
		document.body.classList.add('c15t-rtl');
	} else {
		document.body.classList.remove('c15t-rtl');
	}

	return () => {
		document.body.classList.remove('c15t-rtl');
	};
};

/**
 * Gets all focusable elements within a container.
 */
export const getFocusableElements = function getFocusableElements(
	container: HTMLElement
): HTMLElement[] {
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
			// A negative `tabindex` other than "-1" also leaves sequential focus.
			if (el.tabIndex < 0) {
				return false;
			}
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
};

let scrollLockCount = 0;
let scrollLockOriginal: { overflow: string; paddingRight: string } | null =
	null;

/**
 * Locks document scrolling.
 * @returns Cleanup function to restore scroll
 */
export const setupScrollLock = function setupScrollLock() {
	// Reference counted: a banner and a dialog can both hold the lock (the
	// banner's exit animation overlaps the dialog opening), and the page
	// must only get its original overflow back when the last one lets go.
	if (scrollLockCount === 0) {
		scrollLockOriginal = {
			overflow: document.body.style.overflow,
			paddingRight: document.body.style.paddingRight,
		};
		const scrollbarWidth =
			window.innerWidth - document.documentElement.clientWidth;
		document.body.style.overflow = 'hidden';
		if (scrollbarWidth > 0) {
			document.body.style.paddingRight = `${scrollbarWidth}px`;
		}
	}
	scrollLockCount += 1;

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		scrollLockCount -= 1;
		if (scrollLockCount === 0 && scrollLockOriginal) {
			document.body.style.overflow = scrollLockOriginal.overflow;
			document.body.style.paddingRight = scrollLockOriginal.paddingRight;
			scrollLockOriginal = null;
		}
	};
};

/**
 * Finds a rendered equivalent of an element that was unmounted while a focus
 * trap was active. Consent surfaces often unmount their opener while open
 * (e.g. the floating dialog trigger hides while the dialog is shown and
 * re-renders as a new node on close), so restoring focus to the original
 * node would silently no-op and drop keyboard users at `<body>`. Matching by
 * `id`, then by `data-testid`, re-targets the remounted opener instead.
 */
const findFocusRestoreEquivalent = function findFocusRestoreEquivalent(
	element: HTMLElement
): HTMLElement | null {
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
};

/** Read focus inside nested shadow roots as well as the document. */
/** Whether `node` is `target` or inside it, crossing shadow roots. */
const containsComposed = function containsComposed(
	target: Element,
	node: Element | null
): boolean {
	let current: Node | null = node;
	while (current) {
		if (current === target || target.contains(current)) {
			return true;
		}
		const root = current.getRootNode();
		current = root instanceof ShadowRoot ? root.host : null;
	}
	return false;
};

const readActiveElement = (): Element | null => {
	let active = document.activeElement;
	while (active?.shadowRoot?.activeElement) {
		active = active.shadowRoot.activeElement;
	}
	return active;
};

/**
 * The element sequential Tab would reach first inside `container`: the
 * lowest positive `tabindex` wins, then document order. Controls a browser
 * would refuse to focus, disabled through an ancestor `fieldset` or inside an
 * `inert` subtree, are skipped.
 *
 * @param container - The element to search inside.
 * @returns The first tabbable element, or `undefined` when there is none.
 */
export const firstTabbable = function firstTabbable(
	container: HTMLElement
): HTMLElement | undefined {
	const candidates = getFocusableElements(container).filter(
		(element) => !(element.matches(':disabled') || element.closest('[inert]'))
	);
	const positive = candidates
		.filter((element) => element.tabIndex > 0)
		.sort((left, right) => left.tabIndex - right.tabIndex);
	return positive[0] ?? candidates.find((element) => element.tabIndex === 0);
};

/** Where a focus trap puts focus when it starts. */
export interface FocusTrapOptions {
	/**
	 * `'first-tabbable'` focuses the first tabbable element inside the
	 * container, the way dialog libraries such as Base UI do, so a keyboard
	 * user sees the ring on a control. `'container'`, the default, focuses the
	 * container itself; a blocking banner uses it so no action button is
	 * favored. Both fall back to the container when nothing inside is
	 * tabbable.
	 */
	initialFocus?: 'container' | 'first-tabbable';
}

/**
 * Traps focus within a container.
 *
 * @param container - The element focus must stay inside. It is made
 * focusable when it is not already.
 * @param options - Where focus starts; see {@link FocusTrapOptions}.
 * @returns Cleanup function to remove listeners and restore focus
 */
export const setupFocusTrap = function setupFocusTrap(
	container: HTMLElement,
	options: FocusTrapOptions = {}
) {
	const activeElement = readActiveElement() as HTMLElement | null;
	const previousFocus =
		activeElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement
			? activeElement
			: lastFocusedElement;

	// The container stays focusable so the trap can land on it when nothing
	// inside is tabbable, and so a blocking banner can start there without
	// favoring an action button. `aria-labelledby` and `aria-describedby`
	// carry the title and description to a screen reader either way.
	if (container.tabIndex < 0) {
		container.tabIndex = -1;
	}
	const initialTarget = () =>
		(options.initialFocus === 'first-tabbable'
			? firstTabbable(container)
			: undefined) ?? container;
	const focusTimer = setTimeout(() => {
		try {
			const activeElementLocal = readActiveElement();
			if (
				activeElementLocal instanceof HTMLElement &&
				activeElementLocal !== document.body &&
				container.contains(activeElementLocal)
			) {
				return;
			}
			const target = initialTarget();
			target.focus({ preventScroll: true });
			// A control the browser would not focus after all leaves focus
			// outside the modal; the container is always focusable. A shadow
			// host that delegates focus reports the inner element as active,
			// so containment is checked across shadow boundaries.
			if (
				target !== container &&
				!containsComposed(target, readActiveElement())
			) {
				container.focus({ preventScroll: true });
			}
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

		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		const firstElement = elements[0];
		const lastElement = elements[elements.length - 1];
		const active = readActiveElement() as HTMLElement | null;
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
		clearTimeout(focusTimer);
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
};
