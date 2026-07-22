'use client';

/**
 * Text component for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import type { ReactNode } from 'react';
import { useStyles } from '~/hooks/use-styles';
import type { ClassNameStyle } from '~/types/theme';

/**
 * Props for the Text component.
 */
export interface TriggerTextProps
	extends Omit<ClassNameStyle, 'baseClassName'> {
	children: ReactNode;
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
export function TriggerText({
	children,
	className,
	style,
	noStyle = false,
}: TriggerTextProps): ReactNode {
	const textStyle = useStyles('consentDialogTriggerText', {
		baseClassName: styles.text,
		className,
		style,
		noStyle,
	});
	const textDOMStyle = sanitizeDOMStyleProps(textStyle);

	return <span {...textDOMStyle}>{children}</span>;
}

TriggerText.displayName = 'ConsentDialogTrigger.Text';
