'use client';

import type { PolicyRule } from '@c15t/schema/types';
import { policyRulePresets } from 'c15t';
import type { PresentationAction } from 'c15t';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	ConsentWidget,
	offline,
	useConsentDraft,
	useSnapshot,
} from 'c15t/react';
import { useHeadlessConsentUI, useTranslations } from 'c15t/react/headless';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { getScenarioById } from '../../lib/scenarios';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type DemoVariant = 'default' | 'stock' | 'custom';

interface Snapshot {
	isVisible: boolean;
	allowedActions: string[];
	orderedActions: string[];
	actionGroups: string[][];
	primaryActions: string[];
	direction: string;
	uiProfile?: string;
	shouldFillActions: boolean;
}

const locationPresets = [
	{
		description: 'Strict opt-in, compact split row',
		href: '/policy-actions?country=DE',
		label: 'Germany',
	},
	{
		description: 'Column layout with customize on its own row',
		href: '/policy-actions?country=ES',
		label: 'Spain',
	},
	{
		description: 'US California behavior',
		href: '/policy-actions?country=US&region=CA',
		label: 'California',
	},
	{
		description: 'No-banner fallback comparison',
		href: '/policy-actions?country=AU',
		label: 'World',
	},
];

const renderJson = function renderJson(snapshot: Snapshot) {
	return JSON.stringify(snapshot, null, 2);
};

const actionLabel = function actionLabel(
	action: PresentationAction,
	labels: Record<PresentationAction, string>
): string {
	return labels[action];
};

const buildSurfaceSnapshot = function buildSurfaceSnapshot(
	surface: Omit<Snapshot, 'uiProfile'> & { uiProfile?: string }
): Snapshot {
	return {
		actionGroups: surface.actionGroups,
		allowedActions: surface.allowedActions,
		direction: surface.direction,
		isVisible: surface.isVisible,
		orderedActions: surface.orderedActions,
		primaryActions: surface.primaryActions,
		shouldFillActions: surface.shouldFillActions,
		uiProfile: surface.uiProfile,
	};
};

const DemoSurface = ({ variant }: { variant: DemoVariant }) => {
	const [openItem, setOpenItem] = React.useState('');
	const {
		openDialog,
		performBannerAction,
		performDialogAction,
		saveCustomPreferences,
	} = useHeadlessConsentUI();
	const { common } = useTranslations();

	return (
		<>
			<ConsentBanner.Root>
				<ConsentBanner.Card>
					<ConsentBanner.Header>
						<ConsentBanner.Title />
						<ConsentBanner.Description
							legalLinks={['privacyPolicy', 'termsOfService']}
						/>
					</ConsentBanner.Header>
					{variant === 'default' && <ConsentBanner.PolicyActions />}
					{variant === 'stock' && (
						<ConsentBanner.PolicyActions
							renderAction={(action, props) => {
								const { key, ...buttonProps } = props;
								const className = props.isPrimary
									? 'ring-2 ring-emerald-400/60 ring-offset-2'
									: 'opacity-90';

								switch (action) {
									case 'accept':
										return (
											<ConsentBanner.AcceptButton
												key={key}
												{...buttonProps}
												className={className}
											/>
										);
									case 'reject':
										return (
											<ConsentBanner.RejectButton
												key={key}
												{...buttonProps}
												className={className}
											/>
										);
									case 'customize':
										return (
											<ConsentBanner.CustomizeButton
												key={key}
												{...buttonProps}
												className={className}
											/>
										);
									case 'dismiss':
										return (
											<Button
												key={key}
												className={className}
												onClick={() => performBannerAction('dismiss')}
											>
												Dismiss notice
											</Button>
										);
									default:
										return null;
								}
							}}
						/>
					)}
					{variant === 'custom' && (
						<ConsentBanner.PolicyActions
							renderAction={(action, props) => (
								<Button
									key={props.key}
									type="button"
									variant={props.isPrimary ? 'default' : 'outline'}
									className="justify-center"
									style={props.style}
									onClick={() => {
										if (action === 'customize') {
											openDialog();
											return;
										}

										void performBannerAction(action);
									}}
								>
									{actionLabel(action, {
										accept: common.acceptAll,
										customize: common.customize,
										dismiss: 'Dismiss notice',
										reject: common.rejectAll,
										save: common.save,
									})}
								</Button>
							)}
						/>
					)}
				</ConsentBanner.Card>
			</ConsentBanner.Root>

			<ConsentDialog.Root>
				<ConsentDialog.Overlay />
				<ConsentDialog.Card>
					<ConsentDialog.Header>
						<ConsentDialog.HeaderTitle />
						<ConsentDialog.HeaderDescription />
					</ConsentDialog.Header>
					<ConsentDialog.Content>
						<ConsentWidget.Root>
							<ConsentWidget.Accordion
								type="single"
								value={openItem}
								onValueChange={(value) => {
									setOpenItem(
										Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
									);
								}}
							>
								<ConsentWidget.AccordionItems />
							</ConsentWidget.Accordion>
							{variant === 'default' && <ConsentWidget.PolicyActions />}
							{variant === 'stock' && (
								<ConsentWidget.PolicyActions
									renderAction={(action, props) => {
										const { key, ...buttonProps } = props;
										const className = props.isPrimary
											? 'ring-2 ring-sky-400/60 ring-offset-2'
											: 'opacity-90';

										switch (action) {
											case 'accept':
												return (
													<ConsentWidget.AcceptAllButton
														key={key}
														{...buttonProps}
														className={className}
													/>
												);
											case 'reject':
												return (
													<ConsentWidget.RejectButton
														key={key}
														{...buttonProps}
														className={className}
													/>
												);
											case 'save':
												return (
													<ConsentWidget.SaveButton
														key={key}
														{...buttonProps}
														className={className}
													/>
												);
											default:
												return null;
										}
									}}
								/>
							)}
							{variant === 'custom' && (
								<ConsentWidget.PolicyActions
									renderAction={(action, props) => (
										<Button
											key={props.key}
											type="button"
											variant={props.isPrimary ? 'default' : 'outline'}
											className="justify-center"
											style={props.style}
											onClick={() => {
												if (action === 'save') {
													void saveCustomPreferences();
													return;
												}

												void performDialogAction(action);
											}}
										>
											{actionLabel(action, {
												accept: common.acceptAll,
												customize: common.save,
												dismiss: 'Dismiss notice',
												reject: common.rejectAll,
												save: common.save,
											})}
										</Button>
									)}
								/>
							)}
						</ConsentWidget.Root>
					</ConsentDialog.Content>
					<ConsentDialog.Footer />
				</ConsentDialog.Card>
			</ConsentDialog.Root>
		</>
	);
};

const PolicyActionsDemoContent = () => {
	const [variant, setVariant] = React.useState<DemoVariant>('default');
	const draft = useConsentDraft();
	const snapshot = useSnapshot();
	const { banner, dialog, openBanner, openDialog } = useHeadlessConsentUI();

	const resetDraft = () => {
		draft.reset();
	};

	const bannerSnapshot = React.useMemo(
		() =>
			buildSurfaceSnapshot({
				actionGroups: banner.actionGroups,
				allowedActions: banner.allowedActions,
				direction: banner.direction,
				isVisible: banner.isVisible,
				orderedActions: banner.orderedActions,
				primaryActions: banner.primaryActions,
				shouldFillActions: banner.shouldFillActions,
				uiProfile: banner.uiProfile,
			}),
		[banner]
	);

	const dialogSnapshot = React.useMemo(
		() =>
			buildSurfaceSnapshot({
				actionGroups: dialog.actionGroups,
				allowedActions: dialog.allowedActions,
				direction: dialog.direction,
				isVisible: dialog.isVisible,
				orderedActions: dialog.orderedActions,
				primaryActions: dialog.primaryActions,
				shouldFillActions: dialog.shouldFillActions,
				uiProfile: dialog.uiProfile,
			}),
		[dialog]
	);

	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] px-4 py-10 text-slate-950 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,1),_rgba(15,23,42,1))] dark:text-slate-50">
			<div className="mx-auto flex max-w-7xl flex-col gap-8">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl space-y-3">
						<Badge
							variant="outline"
							className="rounded-full px-3 py-1"
						>
							Examples / Demo
						</Badge>
						<h1 className="text-4xl font-semibold tracking-tight">
							PolicyActions compound DX playground
						</h1>
						<p className="max-w-2xl text-base text-slate-600 dark:text-slate-300">
							Test the new compound helpers against live policy resolution. This
							page suppresses the stock provider-mounted banner/dialog so you
							can compare the default helper, stock-button overrides, and fully
							custom DOM with base c15t translations.
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<Button
							variant="outline"
							onClick={() => {
								resetDraft();
								openBanner();
							}}
						>
							Reset + show banner
						</Button>
						<Button
							variant="outline"
							onClick={() => openBanner()}
						>
							Force banner
						</Button>
						<Button onClick={() => openDialog()}>Open dialog</Button>
					</div>
				</div>

				<div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
					<Card className="border-emerald-200/60 bg-white/80 shadow-lg backdrop-blur dark:border-emerald-900/50 dark:bg-slate-900/70">
						<CardHeader>
							<CardTitle>Preset routes</CardTitle>
							<CardDescription>
								The demo provider already reads `country` and `region` from the
								URL. Use these links to test different policy-driven action
								groups and primary actions.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-3">
							{locationPresets.map((preset) => (
								<Button
									key={preset.href}
									variant="outline"
									asChild
								>
									<a
										href={preset.href}
										title={preset.description}
									>
										{preset.label}
									</a>
								</Button>
							))}
						</CardContent>
					</Card>

					<Card className="border-slate-200/70 bg-white/80 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
						<CardHeader>
							<CardTitle>Current behavior</CardTitle>
							<CardDescription>
								Resolved policy hints are shown below. If you accept or reject,
								use reset to reopen the flow.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2">
							<Badge variant="secondary">activeUI: {snapshot.activeUI}</Badge>
							<Badge variant="secondary">
								banner: {banner.isVisible ? 'visible' : 'hidden'}
							</Badge>
							<Badge variant="secondary">
								dialog: {dialog.isVisible ? 'visible' : 'hidden'}
							</Badge>
							<Badge variant="secondary">variant: {variant}</Badge>
						</CardContent>
					</Card>
				</div>

				<Tabs
					value={variant}
					onValueChange={(value) => setVariant(value as DemoVariant)}
					className="gap-6"
				>
					<TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-slate-200/70 p-2 dark:bg-slate-800/70">
						<TabsTrigger
							value="default"
							className="rounded-xl px-4 py-2"
						>
							Default helpers
						</TabsTrigger>
						<TabsTrigger
							value="stock"
							className="rounded-xl px-4 py-2"
						>
							renderAction + stock buttons
						</TabsTrigger>
						<TabsTrigger
							value="custom"
							className="rounded-xl px-4 py-2"
						>
							renderAction + custom DOM
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="default"
						className="space-y-6"
					>
						<Card className="border-slate-200/70 bg-white/80 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
							<CardHeader>
								<CardTitle>Default helper rendering</CardTitle>
								<CardDescription>
									`PolicyActions` owns the footer/groups and renders stock c15t
									button compounds with built-in translations.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DemoSurface variant="default" />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						value="stock"
						className="space-y-6"
					>
						<Card className="border-slate-200/70 bg-white/80 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
							<CardHeader>
								<CardTitle>Custom mapping with stock c15t buttons</CardTitle>
								<CardDescription>
									This path keeps built-in consent behavior and copy while
									letting you intercept the mapping seam with `renderAction`.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DemoSurface variant="stock" />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						value="custom"
						className="space-y-6"
					>
						<Card className="border-slate-200/70 bg-white/80 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
							<CardHeader>
								<CardTitle>Custom DOM with base c15t translations</CardTitle>
								<CardDescription>
									This is the advanced path. `renderAction` returns local app
									buttons, while `useTranslations()` and headless action
									handlers restore the behavior.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DemoSurface variant="custom" />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				<div className="grid gap-4 xl:grid-cols-2">
					<Card className="border-slate-200/70 bg-white/80 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
						<CardHeader>
							<CardTitle>Resolved banner state</CardTitle>
							<CardDescription>
								Use this to confirm grouped layout, direction, and primary
								actions are flowing through the helper.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-200">
								{renderJson(bannerSnapshot)}
							</pre>
						</CardContent>
					</Card>

					<Card className="border-slate-200/70 bg-white/80 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
						<CardHeader>
							<CardTitle>Resolved dialog state</CardTitle>
							<CardDescription>
								The dialog helper should mirror the same policy-aware behavior
								through `ConsentWidget.PolicyActions`.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-6 text-sky-200">
								{renderJson(dialogSnapshot)}
							</pre>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
};

const spainSplitStackPolicy = getScenarioById('custom-es-split-stack').policy;

const offlinePolicies = [
	spainSplitStackPolicy,
	policyRulePresets.europeOptIn(),
	policyRulePresets.californiaOptIn(),
	policyRulePresets.worldOptOutNoPrompt(),
] satisfies PolicyRule[];

export const PolicyActionsDemo = () => {
	const searchParams = useSearchParams();
	const country = searchParams.get('country')?.toUpperCase() ?? 'DE';
	const region = searchParams.get('region')?.toUpperCase() ?? undefined;
	const providerKey = `${country}:${region ?? 'none'}`;

	return (
		<ConsentProvider
			key={providerKey}
			options={{
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy-policy',
					},
					termsOfService: {
						href: '/legal/terms-of-service',
					},
				},
				mode: offline({ policyRules: offlinePolicies }),
				overrides: {
					country,
					region,
				},
				presentation: getScenarioById(
					country === 'ES' ? 'custom-es-split-stack' : 'custom-de-strict'
				).presentation,
			}}
		>
			<PolicyActionsDemoContent />
		</ConsentProvider>
	);
};
