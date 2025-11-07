'use client';

import type { PrivacyConsentState } from 'c15t';
import { useCallback, useState } from 'react';
import type { IconName } from '~/components/icons';
import { ExpandableTabs } from '../components/ui/expandable-tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { getStore } from '../dev-tool';
import styles from './router.module.css';
import {
	Actions,
	Compliance,
	Consents,
	GeoI18n,
	Misc,
	Scripts,
} from './sections';

type TabSection =
	| 'Consents'
	| 'Geo & i18n'
	| 'Scripts'
	| 'Misc'
	| 'Compliance'
	| 'Actions';

const tabs = [
	{
		title: 'Consents' as const,
		icon: 'radio-button' as IconName,
		iconType: 'optin' as const,
		width: '500px' as const,
	},
	{
		title: 'Geo & i18n' as const,
		icon: 'GB' as IconName,
		iconType: 'flags' as const,
		width: '500px' as const,
	},
	{
		title: 'Scripts' as const,
		icon: 'refresh' as IconName,
		iconType: 'optin' as const,
		width: '500px' as const,
	},
	{
		title: 'Misc' as const,
		icon: 'external-link' as IconName,
		iconType: 'optin' as const,
		width: '500px' as const,
	},
] as const satisfies Array<{
	title: TabSection;
	icon: IconName;
	iconType?: 'optin' | 'flags';
	width?: '450px' | '500px' | '550px';
}>;

interface RouterProps {
	onClose: () => void;
}

export function Router({ onClose: _onClose }: RouterProps) {
	const state = getStore() as PrivacyConsentState;

	const [activeSection, setActiveSection] = useState<TabSection>('Consents');

	// Handle tab change locally
	const handleTabChange = useCallback((index: number | null) => {
		if (index !== null) {
			//@ts-expect-error - tabs array is const and index is valid
			setActiveSection(tabs[index].title);
		}
	}, []);

	// Render active section
	const renderSection = () => {
		switch (activeSection) {
			case 'Consents':
				return <Consents state={state} />;
			case 'Geo & i18n':
				return <GeoI18n state={state} />;
			case 'Scripts':
				return <Scripts state={state} />;
			case 'Misc':
				return <Misc state={state} />;
			case 'Compliance':
				return <Compliance state={state} />;
			case 'Actions':
				return <Actions />;
			default:
				return null;
		}
	};

	return (
		<>
			<div className={styles.tabsContainer}>
				<ScrollArea orientation="horizontal" className={styles.tabsScrollArea}>
					<ExpandableTabs
						tabs={Array.from(tabs)}
						activeColor="primary"
						onChange={handleTabChange}
					/>
				</ScrollArea>
			</div>
			{renderSection()}
		</>
	);
}
