'use client';

import type { PrivacyConsentState } from 'c15t';
import { GanttChartSquare, ToggleLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { ExpandableTabs } from '../components/ui/expandable-tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { getStore } from '../dev-tool';
import styles from './router.module.css';

type TabSection = 'Consents' | 'Compliance' | 'Scripts' | 'Conditional';

const tabs = [
	{ title: 'Consents' as const, icon: ToggleLeft },
	{ title: 'Compliance' as const, icon: GanttChartSquare },
] as const;

interface ContentItem {
	title: string;
	status: string;
	details?: string;
}

interface RouterProps {
	onClose: () => void;
}

export function Router({ onClose: _onClose }: RouterProps) {
	const privacyConsent = getStore() as PrivacyConsentState;

	const [activeSection, setActiveSection] = useState<TabSection>('Consents');

	// Handle tab change locally
	const handleTabChange = useCallback((index: number | null) => {
		if (index !== null) {
			//@ts-expect-error
			setActiveSection(tabs[index].title);
		}
	}, []);

	// Compute rendering state without conditions
	const renderingState = [
		{ componentName: 'MarketingContent', consentType: 'marketing' as const },
		{ componentName: 'AnalyticsContent', consentType: 'measurement' as const },
		{
			componentName: 'PersonalizationComponent',
			consentType: 'ad_personalization' as const,
		},
	];

	// Compute content items based on active section
	const contentItems: ContentItem[] = (() => {
		switch (activeSection) {
			case 'Consents':
				return Object.entries(privacyConsent.consents).map(([name, value]) => ({
					title: name,
					status: value ? 'Enabled' : 'Disabled',
				}));
			case 'Compliance':
				return Object.entries(privacyConsent.complianceSettings).map(
					([region, settings]) => ({
						title: region,
						status: settings.enabled ? 'Active' : 'Inactive',
					})
				);
			case 'Conditional':
				return renderingState.map((item) => ({
					title: item.componentName,
					status: 'Rendered',
					details: `Requires: ${item.consentType}`,
				}));
			default:
				return [];
		}
	})();

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
			<ScrollArea className={styles.scrollContainer}>
				<motion.div
					className={styles.contentContainer}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					{contentItems.map((item, index) => (
						<motion.div
							key={`${activeSection}-${item.title}`}
							className={styles.itemCard}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
						>
							<div className={styles.itemContent}>
								<span className={styles.itemTitle}>{item.title}</span>
								{item.details && (
									<span className={styles.itemDetails}>{item.details}</span>
								)}
							</div>
							<Badge
								variant={
									item.status === 'Enabled' ||
									item.status === 'Active' ||
									item.status === 'active' ||
									item.status === 'Rendered'
										? 'default'
										: 'destructive'
								}
							>
								{item.status}
							</Badge>
						</motion.div>
					))}
				</motion.div>
			</ScrollArea>
		</>
	);
}
