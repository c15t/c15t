'use client';

/**
 * Button component for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
import { forwardRef, type ReactNode } from 'react';
import type { CornerPosition, TriggerSize } from '../types';
import { useTriggerContext } from './root';

/**
 * Maps corner position to CSS class name.
 */
const cornerClassMap = {
	'bottom-right': styles.bottomRight,
	'bottom-left': styles.bottomLeft,
	'top-right': styles.topRight,
	'top-left': styles.topLeft,
} as const satisfies Record<CornerPosition, string | undefined>;

/**
 * Maps size to CSS class name.
 */
const sizeClassMap = {
	sm: styles.sm,
	md: styles.md,
	lg: styles.lg,
} as const;

/**
 * Props for the Button component.
 */
export interface TriggerButtonProps {
	children: ReactNode;

	/**
	 * Size of the trigger button.
	 * @default 'md'
	 */
	size?: TriggerSize;

	/**
	 * Accessible label for the button.
	 * @default 'Open privacy settings'
	 */
	ariaLabel?: string;

	/**
	 * Additional CSS class names.
	 */
	className?: string;

	/**
	 * When true, removes default styling.
	 * @default false
	 */
	noStyle?: boolean;
}

/**
 * The clickable button element for the trigger.
 *
 * @example
 * ```tsx
 * <ConsentDialogTrigger.Button>
 *   <ConsentDialogTrigger.Icon />
 *   <span>Privacy Settings</span>
 * </ConsentDialogTrigger.Button>
 * ```
 */
export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(
	(
		{
			children,
			size = 'md',
			ariaLabel = 'Open privacy settings',
			className,
			noStyle = false,
		},
		ref
	) => {
		const {
			corner,
			isDragging,
			isSnapping,
			wasDragged,
			handlers,
			dragStyle,
			openDialog,
		} = useTriggerContext();

		const handleClick = () => {
			// Don't open dialog if this was a drag interaction
			if (wasDragged()) {
				return;
			}
			openDialog();
		};

		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleClick();
			}
		};

		const buttonClasses = noStyle
			? className
			: [
					styles.trigger,
					cornerClassMap[corner],
					sizeClassMap[size],
					isDragging && styles.dragging,
					isSnapping && styles.snapping,
					className,
				]
					.filter(Boolean)
					.join(' ');

		return (
			<button
				ref={ref}
				type="button"
				className={buttonClasses}
				data-c15t-trigger="true"
				aria-label={ariaLabel}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				style={dragStyle}
				{...handlers}
			>
				{children}
			</button>
		);
	}
);

TriggerButton.displayName = 'ConsentDialogTrigger.Button';
