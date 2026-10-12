'use client';

/**
 * Text component for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/consent-dialog-trigger';
import type { ReactNode } from 'react';

import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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
 * <ConsentDialogTrigger.Button>
 *   <ConsentDialogTrigger.Icon />
 *   <ConsentDialogTrigger.Text>Privacy Settings</ConsentDialogTrigger.Text>
 * </ConsentDialogTrigger.Button>
 * ```
 */
export const TriggerText = ({
	children,
	className,
	noStyle,
}: TriggerTextProps): ReactNode => {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const textProps = mergeSlotProps(components?.trigger?.text, {
		baseClassName: styles.text,
		className,
		noStyle: noStyle ?? contextNoStyle,
	});

	return <span {...textProps}>{children}</span>;
};

TriggerText.displayName = 'ConsentDialogTrigger.Text';
