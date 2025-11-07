'use client';
import { type CSSProperties, useEffect, useLayoutEffect, useRef } from 'react';
import type { Corners } from '~/libs/draggable';
import { cn } from '~/libs/utils';
import { useWidthContext, WidthProvider } from '~/router/width-context';
import styles from './dev-menu.module.css';

const INDICATOR_PADDING = 20;

interface DevMenuProps {
	children: React.ReactNode;
	closeOnClickOutside?: boolean;
	isOpen: boolean;
	onClose: () => void;
	position: Corners;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Development tools menu component
 * Inspired by Next.js DevTools with glassmorphism styling and tabbed interface
 *
 * @param children - Custom content (tabbed interface)
 * @param closeOnClickOutside - Whether to close on outside clicks
 * @param isOpen - Whether the menu is currently open
 * @param onClose - Callback when menu should close
 * @param position - Corner position of the menu
 * @param triggerRef - Reference to the trigger button
 */
export function DevMenu({
	children,
	closeOnClickOutside = true,
	isOpen,
	onClose,
	position,
	triggerRef,
}: DevMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [vertical, horizontal] = position.split('-', 2) as [
		'top' | 'bottom',
		'left' | 'right',
	];

	// Close on escape key
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, onClose]);

	// Close on click outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as HTMLElement;

			// Don't close if clicking on select dropdown (Radix UI portals it outside)
			if (target.closest('[data-radix-select-content]')) {
				return;
			}

			if (
				closeOnClickOutside &&
				menuRef.current &&
				!menuRef.current.contains(target) &&
				triggerRef.current &&
				!triggerRef.current.contains(target)
			) {
				onClose();
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen, onClose, closeOnClickOutside, triggerRef]);

	// Focus menu on open
	useLayoutEffect(() => {
		if (isOpen) {
			menuRef.current?.focus();
		}
	}, [isOpen]);

	if (!isOpen) {
		return null;
	}

	const positionStyle = {
		[vertical]: `${INDICATOR_PADDING + 56}px`, // Offset for icon size
		[horizontal]: `${INDICATOR_PADDING}px`,
	} as CSSProperties;

	return (
		<WidthProvider>
			<DevMenuContent menuRef={menuRef} positionStyle={positionStyle}>
				{children}
			</DevMenuContent>
		</WidthProvider>
	);
}

function DevMenuContent({
	menuRef,
	positionStyle,
	children,
}: {
	menuRef: React.RefObject<HTMLDivElement | null>;
	positionStyle: CSSProperties;
	children: React.ReactNode;
}) {
	const { tabWidth, selectedTabIndex, tabWidths } = useWidthContext();

	// Update CSS variable when width changes
	// Use tab-specific width if configured, otherwise use measured width
	useEffect(() => {
		const menuElement = menuRef.current;
		if (menuElement && selectedTabIndex !== null) {
			const configuredWidth = tabWidths.get(selectedTabIndex);

			if (configuredWidth) {
				// Use configured width (either 'auto' or a pixel value like '450px')
				if (configuredWidth === 'auto') {
					menuElement.style.setProperty('--dev-menu-width', 'auto');
				} else {
					menuElement.style.setProperty('--dev-menu-width', configuredWidth);
				}
			} else if (tabWidth !== null) {
				// Fall back to measured width
				menuElement.style.setProperty('--dev-menu-width', `${tabWidth}px`);
			}
		}
	}, [tabWidth, selectedTabIndex, tabWidths, menuRef]);

	return (
		<div
			ref={menuRef}
			className={cn(styles.menu, styles.menuExpanded)}
			role="dialog"
			style={positionStyle}
			tabIndex={-1}
			aria-label="c15t Dev Tools"
		>
			{children}
		</div>
	);
}
