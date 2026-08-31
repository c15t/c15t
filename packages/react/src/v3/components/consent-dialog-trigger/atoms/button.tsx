'use client';

/**
 * Button component for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/v3/consent-dialog-trigger';
import { forwardRef } from 'react';
import type { ReactNode } from 'react';

import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

import type { CornerPosition, TriggerSize } from '../types';
import { useTriggerContext } from './root';

/**
 * Maps corner position to CSS class name.
 */
const cornerClassMap = {
	'bottom-left': styles.bottomLeft,
	'bottom-right': styles.bottomRight,
	'top-left': styles.topLeft,
	'top-right': styles.topRight,
} as const satisfies Record<CornerPosition, string | undefined>;

/**
 * Maps size to CSS class name.
 */
const sizeClassMap = {
	lg: styles.lg,
	md: styles.md,
	sm: styles.sm,
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

	'data-testid'?: string;
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
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function TriggerButton(
		{
			children,
			size = 'md',
			ariaLabel = 'Open privacy settings',
			className,
			'data-testid': dataTestId = 'consent-dialog-trigger',
			noStyle,
		},
		ref
	) {
		const { components } = useUIConfig();
		const { noStyle: contextNoStyle } = useTheme();
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

		const finalNoStyle = noStyle ?? contextNoStyle;
		const buttonStyle = mergeSlotProps(components?.trigger?.root, {
			baseClassName: [
				styles.trigger,
				cornerClassMap[corner],
				sizeClassMap[size],
				isDragging && styles.dragging,
				isSnapping && styles.snapping,
			],
			className,
			'data-testid': dataTestId,
			noStyle: finalNoStyle,
			style: dragStyle,
			...handlers,
		});

		return (
			<button
				{...buttonStyle}
				ref={ref}
				type="button"
				data-c15t-trigger="true"
				aria-label={ariaLabel}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
			>
				{children}
			</button>
		);
	}
);

TriggerButton.displayName = 'ConsentDialogTrigger.Button';
