'use client';

import type { PrivacyConsentState } from 'c15t';
import { GanttChartSquare, ToggleLeft, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ExpandableTabs } from '../components/ui/expandable-tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { getStore } from '../dev-tool';
import styles from './router.module.css';
import { Actions, Compliance, Consents } from './sections';

type TabSection = 'Consents' | 'Compliance' | 'Actions';

const tabs = [
	{ title: 'Consents' as const, icon: ToggleLeft },
	{ title: 'Compliance' as const, icon: GanttChartSquare },
	{ title: 'Actions' as const, icon: Zap },
] as const;

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
