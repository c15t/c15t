/**
 * Utility functions for DOM manipulation and browser-specific logic.
 * Framework-agnostic.
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
		// Native sequential stops that are not form controls or links. An
		// iframe is left out on purpose: focus inside a frame's document
		// never reaches this document's key listener, so the trap could not
		// hold it.
		'summary:not([tabindex="-1"])',
		'audio[controls]:not([tabindex="-1"])',
		'video[controls]:not([tabindex="-1"])',
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
let scrollLockRestore: (() => void) | null = null;

/** Whether an element's computed overflow is `visible` on both axes. */
const hasVisibleOverflow = (style: CSSStyleDeclaration): boolean =>
	[style.overflowX, style.overflowY].every(
		(value) => value === '' || value === 'visible'
	);

const supportsScrollbarGutter = (): boolean =>
	typeof CSS !== 'undefined' &&
	typeof CSS.supports === 'function' &&
	CSS.supports('scrollbar-gutter', 'stable');

/**
 * Locks document scrolling.
 *
 * Hides overflow on whichever element scrolls the page: `<body>` when its
 * overflow reaches the viewport (the default), otherwise `<html>`, plus
 * `<body>` when it is its own scroll container. When the page was showing a
 * classic scrollbar, `scrollbar-gutter: stable` on `<html>` keeps the
 * viewport width constant so neither in-flow content nor fixed-position
 * elements move. Where no gutter holds (browsers without `scrollbar-gutter`,
 * and scrollbars styled with `::-webkit-scrollbar`), `<body>` gets
 * `padding-right` instead, which keeps in-flow content still.
 *
 * @returns Cleanup function to restore scroll
 */
export const setupScrollLock = function setupScrollLock() {
	// Reference counted: a banner and a dialog can both hold the lock (the
	// banner's exit animation overlaps the dialog opening), and the page
	// must only get its original styles back when the last one lets go.
	if (scrollLockCount === 0) {
		const root = document.documentElement;
		const { body } = document;
		const rootStyle = window.getComputedStyle(root);
		// Only a classic scrollbar takes space. Measure it before hiding
		// overflow: reserving a gutter on a page without one would narrow it.
		const scrollbarWidth = window.innerWidth - root.clientWidth;
		const rootWidth = root.getBoundingClientRect().width;
		const restores: (() => void)[] = [];
		// Saves the inline values of `property` and any `related` longhands.
		// A page that set only `overflow-x` reads back an empty `overflow`,
		// so the longhands are what let the restore keep it.
		const setStyle = (
			element: HTMLElement,
			property: string,
			value: string,
			related: string[] = []
		) => {
			const saved = [property, ...related].map((name) => ({
				name,
				priority: element.style.getPropertyPriority(name),
				value: element.style.getPropertyValue(name),
			}));
			element.style.setProperty(property, value);
			restores.push(() => {
				for (const { name } of saved) {
					element.style.removeProperty(name);
				}
				for (const { name, priority, value: previous } of saved) {
					if (previous) {
						element.style.setProperty(name, previous, priority);
					}
				}
			});
		};
		const hideOverflow = (element: HTMLElement) => {
			setStyle(element, 'overflow', 'hidden', ['overflow-x', 'overflow-y']);
		};

		// While <html> has visible overflow, <body>'s overflow is what the
		// viewport uses. Hiding it there, rather than on <html>, leaves <body>
		// out of the scroll-container chain, so sticky elements and margin
		// collapsing behave as they did before the lock.
		if (hasVisibleOverflow(rootStyle)) {
			hideOverflow(body);
		} else {
			hideOverflow(root);
			// Pages that scroll <body> instead of the viewport.
			if (!hasVisibleOverflow(window.getComputedStyle(body))) {
				hideOverflow(body);
			}
		}

		if (scrollbarWidth > 0) {
			if (supportsScrollbarGutter()) {
				if (
					!rootStyle.getPropertyValue('scrollbar-gutter').includes('stable')
				) {
					setStyle(root, 'scrollbar-gutter', 'stable');
				}
				// The gutter only holds for native scrollbars: Chromium reserves
				// none for one styled with `::-webkit-scrollbar`. When the page
				// still widened, pad <body> by the difference instead, which keeps
				// in-flow content still (fixed elements still move).
				const growth = root.getBoundingClientRect().width - rootWidth;
				if (growth > 0.5) {
					setStyle(body, 'padding-right', `${growth}px`);
				}
			} else {
				setStyle(body, 'padding-right', `${scrollbarWidth}px`);
			}
		}

		scrollLockRestore = () => {
			for (const restore of restores.reverse()) {
				restore();
			}
		};
	}
	scrollLockCount += 1;

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		scrollLockCount -= 1;
		if (scrollLockCount === 0 && scrollLockRestore) {
			scrollLockRestore();
			scrollLockRestore = null;
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

/** Read focus inside nested shadow roots as well as the document. */
const readActiveElement = (): Element | null => {
	let active = document.activeElement;
	while (active?.shadowRoot?.activeElement) {
		active = active.shadowRoot.activeElement;
	}
	return active;
};

/**
 * The elements sequential Tab reaches inside `container`, in the order it
 * reaches them: the lowest positive `tabindex` first, then document order.
 * Controls a browser would refuse to focus, disabled through an ancestor
 * `fieldset` or inside an `inert` subtree, are left out.
 *
 * @param container - The element to search inside.
 * @returns The tabbable elements in sequential focus order.
 */
export const tabbableElements = function tabbableElements(
	container: HTMLElement
): HTMLElement[] {
	const candidates = getFocusableElements(container).filter(
		(element) => !(element.matches(':disabled') || element.closest('[inert]'))
	);
	const positive = candidates
		.filter((element) => element.tabIndex > 0)
		.sort((left, right) => left.tabIndex - right.tabIndex);
	return [
		...positive,
		...candidates.filter((element) => element.tabIndex === 0),
	];
};

/**
 * The element sequential Tab would reach first inside `container`.
 *
 * @param container - The element to search inside.
 * @returns The first tabbable element, or `undefined` when there is none.
 */
export const firstTabbable = function firstTabbable(
	container: HTMLElement
): HTMLElement | undefined {
	return tabbableElements(container)[0];
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

		// The same list and order as the initial focus, so the wrap points
		// are the real first and last sequential stops.
		const elements = tabbableElements(container);
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

		// A positive `tabindex` puts the browser's next stop anywhere in the
		// page, so with one present the trap steps through its own list
		// instead of letting the browser choose.
		const index = active ? elements.indexOf(active) : -1;
		if (index !== -1 && elements.some((element) => element.tabIndex > 0)) {
			e.preventDefault();
			const step = e.shiftKey ? -1 : 1;
			const next = elements[(index + step + elements.length) % elements.length];
			next?.focus({ preventScroll: true });
			return;
		}

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
