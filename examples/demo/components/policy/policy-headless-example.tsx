'use client';

import {
	type HeadlessConsentBannerAction,
	type HeadlessConsentDialogAction,
	useConsentManager,
	useHeadlessConsentUI,
	useTranslations,
} from '@c15t/react/headless';
import Link from 'next/link';
import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { Switch } from '../ui/switch';

type PolicyUiSurfaceAction =
	| HeadlessConsentBannerAction
	| HeadlessConsentDialogAction;

const SCENARIO_LINKS = [
	{
		label: 'US-CA banner (opt-in)',
		href: '/policy?tab=headless&country=US&region=CA',
	},
	{
		label: 'US-NY dialog (opt-out)',
		href: '/policy?tab=headless&country=US&region=NY',
	},
	{
		label: 'UK banner (no reject action)',
		href: '/policy?tab=headless&country=GB',
	},
	{
		label: 'Brazil dialog (opt-out strict)',
		href: '/policy?tab=headless&country=BR',
	},
	{
		label: 'Japan restricted purposes',
		href: '/policy?tab=headless&country=JP',
	},
];

function actionLabel(
	action: PolicyUiSurfaceAction,
	source: 'banner' | 'dialog',
	translations: ReturnType<typeof useTranslations>
) {
	switch (action) {
		case 'accept':
			return translations.common.acceptAll;
		case 'reject':
			return translations.common.rejectAll;
		case 'customize':
			return source === 'banner'
				? translations.common.customize
				: translations.common.save;
	}
}

export function PolicyHeadlessExample() {
	const translations = useTranslations();
	const {
		activeUI,
		model,
		locationInfo,
		consents,
		selectedConsents,
		consentTypes,
		consentCategories,
		policyCategories,
		policyScopeMode,
		setSelectedConsent,
		resetConsents,
		initConsentManager,
	} = useConsentManager();
	const {
		banner,
		dialog,
		openBanner,
		openDialog,
		closeUI,
		performAction,
		saveCustomPreferences,
	} = useHeadlessConsentUI();

	const displayedTypes = useMemo(
		() =>
			consentTypes.filter(
				(type) => type.display && consentCategories.includes(type.name)
			),
		[consentCategories, consentTypes]
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Headless Policy Pack Renderer</CardTitle>
					<CardDescription>
						This tab disables prebuilt c15t components and renders banner +
						dialog using `useHeadlessConsentUI()`, `useConsentManager()`, and
						`useTranslations()`.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">model: {model ?? 'none'}</Badge>
						<Badge variant="secondary">activeUI: {activeUI}</Badge>
						<Badge variant="secondary">
							location:{' '}
							{locationInfo
								? `${locationInfo.countryCode ?? '--'}-${locationInfo.regionCode ?? '--'}`
								: 'unknown'}
						</Badge>
						<Badge variant="secondary">
							scopeMode: {policyScopeMode ?? 'permissive'}
						</Badge>
						<Badge variant="secondary">
							categories:{' '}
							{policyCategories?.length ? policyCategories.join(', ') : 'all'}
						</Badge>
						<Badge variant="secondary">
							scrollLock:{' '}
							{activeUI === 'dialog'
								? dialog.scrollLock === undefined
									? 'default'
									: dialog.scrollLock
										? 'on'
										: 'off'
								: banner.scrollLock === undefined
									? 'default'
									: banner.scrollLock
										? 'on'
										: 'off'}
						</Badge>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							onClick={() => openBanner({ force: true })}
						>
							Force Banner
						</Button>
						<Button variant="outline" onClick={() => openDialog()}>
							Open Dialog
						</Button>
						<Button variant="outline" onClick={() => closeUI()}>
							Hide UI
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								resetConsents();
								void initConsentManager();
							}}
						>
							Reset + Reload Policy
						</Button>
					</div>

					<div className="flex flex-wrap gap-2 text-sm">
						{SCENARIO_LINKS.map((scenario) => (
							<Link
								key={scenario.href}
								href={scenario.href}
								className="rounded-md border px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
							>
								{scenario.label}
							</Link>
						))}
					</div>
				</CardContent>
			</Card>

			{activeUI === 'banner' ? (
				<aside className="fixed right-4 bottom-4 left-4 z-[80] mx-auto max-w-2xl rounded-xl border bg-background shadow-xl">
					<div className="space-y-3 p-5">
						<div className="flex items-center justify-between gap-2">
							<h3 className="font-semibold text-lg">
								{translations.cookieBanner.title}
							</h3>
							<Badge variant="outline">
								{banner.uiProfile ?? 'compact'} /{' '}
								{banner.actionLayout ?? 'split'}
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							{translations.cookieBanner.description}
						</p>
						<div className="space-y-2">
							{banner.actionGroups.map((group, index) => (
								<div
									key={`banner-group-${group.join('-') || index}`}
									className={cn(
										'flex gap-2',
										banner.actionLayout === 'inline' && 'flex-wrap'
									)}
								>
									{group.map((action) => {
										const isPrimary = action === banner.primaryAction;
										return (
											<Button
												key={`banner-${action}`}
												variant={isPrimary ? 'default' : 'outline'}
												className={cn(
													'min-w-[9rem]',
													banner.shouldFillActions && 'flex-1'
												)}
												onClick={() => {
													if (action === 'customize') {
														openDialog();
														return;
													}
													void performAction(action, { surface: 'banner' });
												}}
											>
												{actionLabel(action, 'banner', translations)}
											</Button>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</aside>
			) : null}

			{activeUI === 'dialog' ? (
				<div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 bg-black/40"
						onClick={() => closeUI()}
					/>
					<section className="relative w-full max-w-2xl rounded-xl border bg-background shadow-2xl">
						<div className="border-b p-5">
							<div className="flex items-center justify-between gap-2">
								<h3 className="font-semibold text-lg">
									{translations.consentManagerDialog.title}
								</h3>
								<Badge variant="outline">
									{dialog.uiProfile ?? 'compact'} /{' '}
									{dialog.actionLayout ?? 'split'}
								</Badge>
							</div>
							<p className="mt-1 text-muted-foreground text-sm">
								{translations.consentManagerDialog.description}
							</p>
						</div>

						<div className="max-h-[45vh] space-y-3 overflow-auto p-5">
							{displayedTypes.map((type) => (
								<div
									key={type.name}
									className="flex items-start justify-between gap-4 rounded-lg border p-3"
								>
									<div className="space-y-1">
										<p className="font-medium">
											{translations.consentTypes[type.name]?.title ?? type.name}
										</p>
										<p className="text-muted-foreground text-sm">
											{type.description}
										</p>
									</div>
									<Switch
										checked={selectedConsents[type.name] ?? consents[type.name]}
										disabled={type.disabled}
										onCheckedChange={(checked) =>
											setSelectedConsent(type.name, Boolean(checked))
										}
									/>
								</div>
							))}
						</div>

						<div className="space-y-2 border-t p-5">
							{dialog.actionGroups.map((group, index) => (
								<div
									key={`dialog-group-${group.join('-') || index}`}
									className={cn(
										'flex gap-2',
										dialog.actionLayout === 'inline' && 'flex-wrap'
									)}
								>
									{group.map((action) => {
										const isPrimary = action === dialog.primaryAction;
										return (
											<Button
												key={`dialog-${action}`}
												variant={isPrimary ? 'default' : 'outline'}
												className={cn(
													'min-w-[9rem]',
													dialog.shouldFillActions && 'flex-1'
												)}
												onClick={() => {
													if (action === 'customize') {
														void saveCustomPreferences();
														return;
													}
													void performAction(action, { surface: 'dialog' });
												}}
											>
												{actionLabel(action, 'dialog', translations)}
											</Button>
										);
									})}
								</div>
							))}
						</div>
					</section>
				</div>
			) : null}
		</div>
	);
}
