'use client';

/**
 * Icon component for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/v3/consent-dialog-trigger';
import { isValidElement, type ReactNode } from 'react';
import { BrandingCompactLogo } from '~/v3/components/shared/ui/branding';
import { FingerprintIcon, SettingsIcon } from '~/v3/components/shared/ui/logo';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';
import type { TriggerIcon as TriggerIconType } from '../types';
import { useTriggerContext } from './root';

/**
 * Props for the Icon component.
 */
export interface TriggerIconProps {
	/**
	 * Icon to display.
	 * - 'branding' - c15t or INTH logo based on branding setting
	 * - 'fingerprint' - Generic fingerprint icon
	 * - 'settings' - Generic settings/gear icon
	 * - ReactNode - Custom icon element
	 *
	 * @default 'branding'
	 */
	icon?: TriggerIconType;

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
 * Icon component that renders the appropriate icon based on branding.
 *
 * @example
 * ```tsx
 * // Default branding icon
 * <ConsentDialogTrigger.Icon />
 *
 * // Fingerprint icon
 * <ConsentDialogTrigger.Icon icon="fingerprint" />
 *
 * // Custom icon
 * <ConsentDialogTrigger.Icon icon={<MyCustomIcon />} />
 * ```
 */
export function TriggerIcon({
	icon = 'branding',
	className,
	noStyle,
}: TriggerIconProps): ReactNode {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const { branding } = useTriggerContext();
	const iconProps = mergeSlotProps(components?.trigger?.icon, {
		baseClassName: styles.icon,
		className,
		noStyle: noStyle ?? contextNoStyle,
	});

	// Render custom ReactNode
	if (isValidElement(icon)) {
		return (
			<span
				{...iconProps}
				aria-hidden="true"
			>
				{icon}
			</span>
		);
	}

	// Render built-in icons
	let iconElement: ReactNode;
	switch (icon) {
		case 'fingerprint':
			iconElement = <FingerprintIcon />;
			break;
		case 'settings':
			iconElement = <SettingsIcon />;
			break;
		default:
			// Branding-based icon (using icon-only for compact display)
			iconElement = <BrandingCompactLogo branding={branding} />;
	}

	return (
		<span
			{...iconProps}
			aria-hidden="true"
		>
			{iconElement}
		</span>
	);
}

TriggerIcon.displayName = 'ConsentDialogTrigger.Icon';
