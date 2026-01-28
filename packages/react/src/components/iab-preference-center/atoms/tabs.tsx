'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import {
	createContext,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useContext,
	useState,
} from 'react';
import { useGVLData } from '../hooks/use-gvl-data';
import { useIABTranslations } from '../use-iab-translations';

/**
 * Tab state context for managing active tab.
 */
interface TabsContextValue {
	activeTab: 'purposes' | 'vendors';
	setActiveTab: (tab: 'purposes' | 'vendors') => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Hook to access tabs context.
 */
export function useTabsContext() {
	const context = useContext(TabsContext);
	if (!context) {
		throw new Error(
			'Tab components must be used within IABPreferenceCenterTabs'
		);
	}
	return context;
}

interface IABPreferenceCenterTabsProps extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
	/**
	 * Default active tab.
	 * @default 'purposes'
	 */
	defaultTab?: 'purposes' | 'vendors';
}

/**
 * Tabs container component for the IAB Preference Center.
 *
 * @remarks
 * Provides tab state context and renders the tab list.
 *
 * @public
 */
const IABPreferenceCenterTabs = forwardRef<
	HTMLDivElement,
	IABPreferenceCenterTabsProps
>(({ children, defaultTab = 'purposes', className, ...props }, ref) => {
	const [activeTab, setActiveTab] = useState<'purposes' | 'vendors'>(
		defaultTab
	);
	const iabTranslations = useIABTranslations();
	const {
		purposes,
		specialPurposes,
		specialFeatures,
		totalVendors,
		isLoading,
	} = useGVLData();

	const containerClassName = className
		? `${styles.tabsContainer} ${className}`
		: styles.tabsContainer;

	return (
		<TabsContext.Provider value={{ activeTab, setActiveTab }}>
			{children ? (
				<div ref={ref} className={containerClassName} {...props}>
					{children}
				</div>
			) : (
				<div ref={ref} className={containerClassName} {...props}>
					<div className={styles.tabsList}>
						<button
							type="button"
							onClick={() => setActiveTab('purposes')}
							className={styles.tabButton}
							data-state={activeTab === 'purposes' ? 'active' : 'inactive'}
						>
							{iabTranslations.preferenceCenter.tabs.purposes}
							{!isLoading &&
								` (${purposes.length + specialPurposes.length + specialFeatures.length})`}
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('vendors')}
							className={styles.tabButton}
							data-state={activeTab === 'vendors' ? 'active' : 'inactive'}
						>
							{iabTranslations.preferenceCenter.tabs.vendors}
							{!isLoading && ` (${totalVendors})`}
						</button>
					</div>
				</div>
			)}
		</TabsContext.Provider>
	);
});

IABPreferenceCenterTabs.displayName = 'IABPreferenceCenterTabs';

/**
 * Tab button component.
 */
interface IABPreferenceCenterTabButtonProps
	extends HTMLAttributes<HTMLButtonElement> {
	tab: 'purposes' | 'vendors';
	children: ReactNode;
}

const IABPreferenceCenterTabButton = forwardRef<
	HTMLButtonElement,
	IABPreferenceCenterTabButtonProps
>(({ tab, children, className, ...props }, ref) => {
	const { activeTab, setActiveTab } = useTabsContext();

	const buttonClassName = className
		? `${styles.tabButton} ${className}`
		: styles.tabButton;

	return (
		<button
			ref={ref}
			type="button"
			onClick={() => setActiveTab(tab)}
			className={buttonClassName}
			data-state={activeTab === tab ? 'active' : 'inactive'}
			{...props}
		>
			{children}
		</button>
	);
});

IABPreferenceCenterTabButton.displayName = 'IABPreferenceCenterTabButton';

export { IABPreferenceCenterTabs, IABPreferenceCenterTabButton, TabsContext };
