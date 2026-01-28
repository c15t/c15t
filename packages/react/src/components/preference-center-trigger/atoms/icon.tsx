'use client';

/**
 * Icon component for the PreferenceCenterTrigger compound component.
 *
 * @packageDocumentation
 */

import styles from '@c15t/ui/styles/components/preference-center-trigger.module.css';
import { isValidElement, type ReactNode } from 'react';
import {
	C15TIconOnly,
	ConsentIconOnly,
	FingerprintIcon,
	SettingsIcon,
} from '~/components/shared/ui/logo';
import type { TriggerIcon as TriggerIconType } from '../types';
import { useTriggerContext } from './root';

/**
 * Props for the Icon component.
 */
export interface TriggerIconProps {
	/**
	 * Icon to display.
	 * - 'branding' - c15t or consent.io logo based on branding setting
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
 * <PreferenceCenterTrigger.Icon />
 *
 * // Fingerprint icon
 * <PreferenceCenterTrigger.Icon icon="fingerprint" />
 *
 * // Custom icon
 * <PreferenceCenterTrigger.Icon icon={<MyCustomIcon />} />
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

	// Render custom ReactNode
	if (isValidElement(icon)) {
		return <span className={iconClasses}>{icon}</span>;
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
			iconElement =
				branding === 'consent' ? <ConsentIconOnly /> : <C15TIconOnly />;
	}

	return <span className={iconClasses}>{iconElement}</span>;
}

TriggerIcon.displayName = 'PreferenceCenterTrigger.Icon';
