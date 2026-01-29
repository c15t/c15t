'use client';

/**
 * Text component for the PreferenceCenterTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/preference-center-trigger.module.css';
import type { ReactNode } from 'react';

/**
 * Props for the Text component.
 */
export interface TriggerTextProps {
	children: ReactNode;

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
 * Text component for adding labels to the trigger button.
 *
 * @example
 * ```tsx
 * <PreferenceCenterTrigger.Button>
 *   <PreferenceCenterTrigger.Icon />
 *   <PreferenceCenterTrigger.Text>Privacy Settings</PreferenceCenterTrigger.Text>
 * </PreferenceCenterTrigger.Button>
 * ```
 */
export function TriggerText({
	children,
	className,
	noStyle = false,
}: TriggerTextProps): ReactNode {
	const textClasses = noStyle
		? className
		: [styles.text, className].filter(Boolean).join(' ');

	return <span className={textClasses}>{children}</span>;
}

TriggerText.displayName = 'PreferenceCenterTrigger.Text';
