import { type RefObject, useEffect, useRef } from 'preact/compat';

/**
 * Hook that manages focus trapping within a container.
 *
 * @remarks
 * This hook ensures keyboard navigation stays within the container
 * while it's active, improving accessibility for modal dialogs.
 *
 * @param shouldTrap - Boolean indicating whether focus should be trapped
 * @param containerRef - Reference to the container element
 *
 * @public
 */
export function useFocusTrap(
	shouldTrap: boolean,
	containerRef: RefObject<HTMLElement> | null
): void {
	const previousFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!shouldTrap || !containerRef || !containerRef.current) {
			return;
		}

		// Store current active element to restore focus later
		previousFocusRef.current = document.activeElement as HTMLElement;

		// Get all focusable elements within the container
		const focusableElements = getFocusableElements(containerRef.current);

		// Focus the first element if available
		if (focusableElements.length > 0) {
			setTimeout(() => {
				focusableElements[0]?.focus();
			}, 0);
		} else if (containerRef.current.tabIndex !== -1) {
			// If no focusable elements, focus the container itself
			try {
				containerRef.current.focus();
			} catch {
				// Silently handle focus errors
			}
		}

		// Tab key event handler
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab' || !containerRef.current) {
				return;
			}

			const focusableElements = getFocusableElements(containerRef.current);
			if (focusableElements.length === 0) {
				return;
			}

			const firstElement = focusableElements[0];
			const lastElement = focusableElements.at(-1);

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
			if (previousFocusRef.current && 'focus' in previousFocusRef.current) {
				setTimeout(() => previousFocusRef.current?.focus(), 0);
			}
		};
	}, [shouldTrap, containerRef]);
}

/**
 * Gets all focusable elements within a container
 * @internal
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
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
