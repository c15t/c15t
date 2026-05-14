'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useMemo,
} from 'react';
import * as Tabs from '~/v3/components/shared/ui/tabs';
import { useGVLData } from '../hooks/use-gvl-data';
import { useIABTranslations } from '../use-iab-translations';

interface IABConsentDialogTabsProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
	children?: ReactNode;
	defaultTab?: 'purposes' | 'vendors';
}

const IABConsentDialogTabs = forwardRef<
	HTMLDivElement,
	IABConsentDialogTabsProps
>(({ children, defaultTab = 'purposes', className, ...props }, ref) => {
	const iabTranslations = useIABTranslations();
	const {
		purposes,
		specialPurposes,
		specialFeatures,
		features,
		totalVendors,
		isLoading,
	} = useGVLData();
	const purposeCount = useMemo(
		() =>
			purposes.length +
			specialPurposes.length +
			specialFeatures.length +
			features.length,
		[
			features.length,
			purposes.length,
			specialFeatures.length,
			specialPurposes.length,
		]
	);

	return (
		<Tabs.Root
			ref={ref}
			className={
				className
					? `${styles.tabsContainer} ${className}`
					: styles.tabsContainer
			}
			defaultValue={defaultTab}
			{...props}
		>
			{children ? (
				children
			) : (
				<Tabs.List className={styles.tabsList} noStyle>
					<Tabs.Trigger className={styles.tabButton} noStyle value="purposes">
						{iabTranslations.preferenceCenter.tabs.purposes}
						{!isLoading && ` (${purposeCount})`}
					</Tabs.Trigger>
					<Tabs.Trigger className={styles.tabButton} noStyle value="vendors">
						{iabTranslations.preferenceCenter.tabs.vendors}
						{!isLoading && ` (${totalVendors})`}
					</Tabs.Trigger>
				</Tabs.List>
			)}
		</Tabs.Root>
	);
});

IABConsentDialogTabs.displayName = 'IABConsentDialogTabs';

interface IABConsentDialogTabButtonProps
	extends HTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	tab: 'purposes' | 'vendors';
}

const IABConsentDialogTabButton = forwardRef<
	HTMLButtonElement,
	IABConsentDialogTabButtonProps
>(({ tab, children, className, ...props }, ref) => {
	return (
		<Tabs.Trigger
			ref={ref}
			className={
				className ? `${styles.tabButton} ${className}` : styles.tabButton
			}
			noStyle
			value={tab}
			{...(props as Omit<IABConsentDialogTabButtonProps, 'tab'>)}
		>
			{children}
		</Tabs.Trigger>
	);
});

IABConsentDialogTabButton.displayName = 'IABConsentDialogTabButton';

export { IABConsentDialogTabButton, IABConsentDialogTabs };
