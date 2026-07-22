'use client';

/**
 * Icon component for the ConsentDialogTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
import { isValidElement, type ReactNode } from 'react';
import { BrandingCompactLogo } from '~/components/shared/ui/branding';
import { FingerprintIcon, SettingsIcon } from '~/components/shared/ui/logo';
import type {
	TriggerIconPair,
	TriggerIconSource,
	TriggerIcon as TriggerIconType,
} from '../types';
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

function isTriggerIconPair(icon: TriggerIconType): icon is TriggerIconPair {
	return (
		typeof icon === 'object' &&
		icon !== null &&
		!isValidElement(icon) &&
		'light' in icon &&
		'dark' in icon
	);
}

function renderIconSource(
	icon: TriggerIconSource,
	branding: string
): ReactNode {
	if (isValidElement(icon)) {
		return icon;
	}

	switch (icon) {
		case 'fingerprint':
			return <FingerprintIcon />;
		case 'settings':
			return <SettingsIcon />;
		default:
			return <BrandingCompactLogo branding={branding} />;
	}
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
	noStyle = false,
}: TriggerIconProps): ReactNode {
	const { branding } = useTriggerContext();

	const iconClasses = noStyle
		? className
		: [styles.icon, className].filter(Boolean).join(' ');

	if (isTriggerIconPair(icon)) {
		return (
			<span className={iconClasses} aria-hidden="true">
				<span className={styles.lightIcon}>
					{renderIconSource(icon.light, branding)}
				</span>
				<span className={styles.darkIcon}>
					{renderIconSource(icon.dark, branding)}
				</span>
			</span>
		);
	}

	return (
		<span className={iconClasses} aria-hidden="true">
			{renderIconSource(icon, branding)}
		</span>
	);
}

TriggerIcon.displayName = 'ConsentDialogTrigger.Icon';
