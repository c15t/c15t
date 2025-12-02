'use client';

import type { PrivacyConsentState } from 'c15t';
import { GanttChartSquare, ToggleLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { ExpandableTabs } from '../components/ui/expandable-tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { getStore } from '../dev-tool';

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
			<div className="border-b p-4">
				<ExpandableTabs
					tabs={Array.from(tabs)}
					activeColor="text-primary"
					className="border-muted"
					onChange={handleTabChange}
				/>
			</div>
			<ScrollArea className="h-[300px]">
				<motion.div
					className="space-y-2 p-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					{contentItems.map((item, index) => (
						<motion.div
							key={`${activeSection}-${item.title}`}
							className="flex items-center justify-between rounded-lg border bg-card p-3"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
						>
							<div className="flex flex-col">
								<span className="font-medium text-sm">{item.title}</span>
								{item.details && (
									<span className="text-muted-foreground text-xs">
										{item.details}
									</span>
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
			{/* <div className="border-t p-4">
				<div className="flex flex-col gap-2">
					<Button variant="outline" size="sm" onClick={handleResetConsent}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Reset Local Storage Consent
					</Button>
					<Button variant="outline" size="sm" onClick={handleOpenPrivacyModal}>
						<FileText className="mr-2 h-4 w-4" />
						Open Privacy Settings
					</Button>
					<Button variant="outline" size="sm" onClick={handleOpenCookiePopup}>
						<Cookie className="mr-2 h-4 w-4" />
						Open Cookie Popup
					</Button>
				</div>
			</div> */}
		</>
	);
}
