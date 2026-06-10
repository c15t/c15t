'use client';

import { useConsentManager } from '@c15t/react';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const LANGUAGE_OPTIONS = [
	{ label: 'Auto', value: undefined },
	{ label: 'English', value: 'en' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'Portuguese', value: 'pt' },
] as const;

const MODEL_LABELS: Record<string, string> = {
	'opt-in': 'Opt-in',
	'opt-out': 'Opt-out',
	iab: 'IAB TCF 2.3',
	none: 'No banner',
};

function StatusRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="border-border/70 border-b pb-2">
			<p className="label-pixel text-muted-foreground">{label}</p>
			<p className="mt-1 font-mono text-xs">{value}</p>
		</div>
	);
}

/**
 * Live view of what the consent manager resolved: active policy, model,
 * location, language, plus the current consent decisions. Must be rendered
 * inside a `ConsentManagerProvider`.
 */
export function LiveStatus({ mode }: { mode: 'offline' | 'hosted' }) {
	const [mounted, setMounted] = useState(false);
	const {
		activeUI,
		consentInfo,
		consents,
		iab,
		initConsentManager,
		lastBannerFetchData,
		locationInfo,
		model,
		policyCategories,
		resetConsents,
		setActiveUI,
		setLanguage,
		setOverrides,
		overrides,
		translationConfig,
	} = useConsentManager();

	useEffect(() => {
		setMounted(true);
	}, []);

	const policy = lastBannerFetchData?.policy;
	const policyDecision = lastBannerFetchData?.policyDecision;
	const requestedLanguage = overrides?.language;
	const messageProfile = policy?.i18n?.messageProfile ?? 'default';
	const resolvedLanguage =
		lastBannerFetchData?.translations.language ??
		translationConfig.defaultLanguage ??
		'en';

	const display = mounted
		? {
				policyId: policy?.id ?? 'none',
				model: MODEL_LABELS[model ?? 'none'] ?? (model || 'none'),
				iabEnabled: iab?.config.enabled ?? false,
				location: locationInfo?.countryCode
					? `${locationInfo.countryCode}${
							locationInfo.regionCode ? `-${locationInfo.regionCode}` : ''
						}`
					: '--',
				language: `${resolvedLanguage}${
					requestedLanguage ? ` (requested ${requestedLanguage})` : ' (auto)'
				}`,
				copy:
					messageProfile === 'default'
						? 'stock translations'
						: `custom ("${messageProfile}" profile)`,
				banner:
					policy?.ui?.mode === 'none' || !policy?.ui
						? (policy?.ui?.mode ?? 'default')
						: policy.ui.mode,
				hasSavedConsent: consentInfo != null,
				// IAB policies use a '*' wildcard — purposes replace categories there.
				categories: (policyCategories ?? []).filter(
					(category) => category !== '*'
				),
			}
		: {
				policyId: '…',
				model: '…',
				iabEnabled: false,
				location: '--',
				language: '…',
				copy: '…',
				banner: '…',
				hasSavedConsent: false,
				categories: [] as string[],
			};

	const rawState = mounted
		? {
				mode,
				policy: policy ?? null,
				policyDecision: policyDecision ?? null,
				activeUI,
				consents,
				iabEnabled: iab?.config.enabled ?? false,
				overrides: overrides ?? null,
			}
		: null;

	return (
		<div className="space-y-6">
			<div className="grid gap-3 text-sm sm:grid-cols-2">
				<StatusRow label="Policy" value={display.policyId} />
				<StatusRow label="Model" value={display.model} />
				<StatusRow label="Location" value={display.location} />
				<StatusRow label="Language" value={display.language} />
				<StatusRow label="Copy" value={display.copy} />
				<StatusRow
					label="IAB TCF"
					value={display.iabEnabled ? 'enabled' : 'off'}
				/>
				<StatusRow
					label="Consent"
					value={display.hasSavedConsent ? 'saved' : 'not saved yet'}
				/>
			</div>

			{display.categories.length > 0 && (
				<div className="space-y-2">
					<p className="label-pixel text-muted-foreground">Categories</p>
					<div className="flex flex-wrap gap-1.5">
						{display.categories.map((category) => {
							const granted = Boolean(
								consents?.[category as keyof typeof consents]
							);
							return (
								<Badge
									key={category}
									variant={granted ? 'default' : 'outline'}
									className="rounded-full font-normal"
								>
									{category}
									<span className="ml-1 opacity-70">
										{granted ? 'on' : 'off'}
									</span>
								</Badge>
							);
						})}
					</div>
				</div>
			)}

			<div className="space-y-2">
				<p className="label-pixel text-muted-foreground">Language</p>
				<div className="flex flex-wrap gap-2">
					{LANGUAGE_OPTIONS.map((option) => {
						const isActive = option.value === requestedLanguage;
						return (
							<Button
								key={option.label}
								variant={isActive ? 'default' : 'outline'}
								size="sm"
								className="rounded-full"
								onClick={() => {
									if (!option.value) {
										void setOverrides({ language: undefined });
										return;
									}
									void setLanguage(option.value);
								}}
							>
								{option.label}
							</Button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('banner', { force: true })}
				>
					Show banner
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="rounded-full"
					onClick={() => setActiveUI('dialog', { force: true })}
				>
					Open preferences
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="rounded-full"
					onClick={() => {
						resetConsents();
						void initConsentManager();
					}}
				>
					Reset consent
				</Button>
			</div>

			<details className="group">
				<summary className="cursor-pointer select-none text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline">
					Raw state (for developers)
				</summary>
				<pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-border/80 bg-muted/20 p-3 font-mono text-[12px] text-foreground/90 leading-5">
					{JSON.stringify(rawState, null, 2)}
				</pre>
			</details>
		</div>
	);
}
