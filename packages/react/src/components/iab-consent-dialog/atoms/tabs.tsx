'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import * as Tabs from '~/components/shared/ui/tabs';

import { useIABDisplayModel } from '../hooks/use-display-model';
import { useIABTranslations } from '../use-iab-translations';

interface IABConsentDialogTabsProps extends Omit<
	HTMLAttributes<HTMLDivElement>,
	'defaultValue' | 'onChange'
> {
	children?: ReactNode;
	defaultTab?: 'purposes' | 'vendors';
}

const IABConsentDialogTabs = createForwardRef<
	HTMLDivElement,
	IABConsentDialogTabsProps
>(({ children, defaultTab = 'purposes', className, ...props }, ref) => {
	const iabTranslations = useIABTranslations();
	const {
		purposeTabCount: purposeCount,
		vendorTabCount: totalVendors,
		isLoading,
	} = useIABDisplayModel();

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
				<Tabs.List
					className={styles.tabsList}
					noStyle
				>
					<Tabs.Trigger
						className={styles.tabButton}
						noStyle
						value="purposes"
					>
						{iabTranslations.preferenceCenter.tabs.purposes}
						{!isLoading && ` (${purposeCount})`}
					</Tabs.Trigger>
					<Tabs.Trigger
						className={styles.tabButton}
						noStyle
						value="vendors"
					>
						{iabTranslations.preferenceCenter.tabs.vendors}
						{!isLoading && ` (${totalVendors})`}
					</Tabs.Trigger>
				</Tabs.List>
			)}
		</Tabs.Root>
	);
});

IABConsentDialogTabs.displayName = 'IABConsentDialogTabs';

interface IABConsentDialogTabButtonProps extends HTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	tab: 'purposes' | 'vendors';
}

const IABConsentDialogTabButton = createForwardRef<
	HTMLButtonElement,
	IABConsentDialogTabButtonProps
>(({ tab, children, className, ...props }, ref) => (
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
));

IABConsentDialogTabButton.displayName = 'IABConsentDialogTabButton';

export { IABConsentDialogTabButton, IABConsentDialogTabs };
