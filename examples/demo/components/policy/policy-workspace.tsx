'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { PolicyHeadlessExample } from './policy-headless-example';
import { PolicyPackBuilder } from './policy-pack-builder';
import { PolicyScenarioLab } from './policy-scenario-lab';

type PolicyWorkspaceTab = 'scenarios' | 'builder' | 'headless';

export function PolicyWorkspace({
	initialTab = 'scenarios',
}: {
	initialTab?: PolicyWorkspaceTab;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [activeTab, setActiveTab] = useState<PolicyWorkspaceTab>(initialTab);
	const title = useMemo(
		() =>
			activeTab === 'builder'
				? 'Policy Pack Builder'
				: activeTab === 'headless'
					? 'Headless Banner + Dialog'
					: 'Policy Scenario Selector',
		[activeTab]
	);

	return (
		<main className="min-h-screen bg-muted/30 py-12">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6">
					<h1 className="font-semibold text-3xl tracking-tight">
						Policy Workspace
					</h1>
					<p className="mt-2 text-muted-foreground">
						Build policy packs and validate behavior from one route.
					</p>
					<div className="mt-3">
						<Link
							href="/offline"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							Open Offline Policy Lab
						</Link>
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={(value) => {
						const next = value as PolicyWorkspaceTab;
						setActiveTab(next);
						if (next === 'builder') {
							router.replace(`${pathname}?tab=builder`, { scroll: false });
							return;
						}
						if (next === 'headless') {
							router.replace(`${pathname}?tab=headless`, { scroll: false });
							return;
						}
						router.replace(pathname, { scroll: false });
					}}
					className="mb-6"
				>
					<TabsList>
						<TabsTrigger value="scenarios">Scenario Selector</TabsTrigger>
						<TabsTrigger value="builder">Pack Builder</TabsTrigger>
						<TabsTrigger value="headless">Headless Example</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="mb-4">
					<h2 className="font-medium text-lg">{title}</h2>
				</div>

				{activeTab === 'scenarios' ? <PolicyScenarioLab /> : null}
				{activeTab === 'builder' ? <PolicyPackBuilder /> : null}
				{activeTab === 'headless' ? <PolicyHeadlessExample /> : null}
			</div>
		</main>
	);
}
