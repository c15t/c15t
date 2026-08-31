'use client';

import { useConsentManager } from 'c15t/react';
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
	iab: 'IAB TCF 2.3',
	none: 'No banner',
	'opt-in': 'Opt-in',
	'opt-out': 'Opt-out',
};

const StatusRow = ({ label, value }: { label: string; value: string }) => (
	<div className="border-border/70 border-b pb-2">
		<p className="label-pixel text-muted-foreground">{label}</p>
		<p className="mt-1 font-mono text-xs">{value}</p>
	</div>
);

type ConsentManagerValue = ReturnType<typeof useConsentManager>;

const formatLocation = function formatLocation(
	location: ConsentManagerValue['locationInfo']
): string {
	if (!location?.countryCode) {
		return '--';
	}
	const region = location.regionCode ? `-${location.regionCode}` : '';
	return `${location.countryCode}${region}`;
};

const formatBannerMode = function formatBannerMode(
	policy: NonNullable<ConsentManagerValue['lastBannerFetchData']>['policy']
): string {
	if (!policy?.ui || policy.ui.mode === 'none') {
		return policy?.ui?.mode ?? 'default';
	}
	return policy.ui.mode;
};

const displayModel = function displayModel(state: ConsentManagerValue): string {
	return MODEL_LABELS[state.model ?? 'none'] ?? (state.model || 'none');
};

const createDisplay = function createDisplay(
	mounted: boolean,
	state: ConsentManagerValue
) {
	if (!mounted) {
		return {
			banner: '…',
			categories: [] as string[],
			copy: '…',
			hasSavedConsent: false,
			iabEnabled: false,
			language: '…',
			location: '--',
			model: '…',
			policyId: '…',
		};
	}
	const policy = state.lastBannerFetchData?.policy;
	const requestedLanguage = state.overrides?.language;
	const messageProfile = policy?.i18n?.messageProfile ?? 'default';
	const resolvedLanguage =
		state.lastBannerFetchData?.translations.language ??
		state.translationConfig.defaultLanguage ??
		'en';
	return {
		banner: formatBannerMode(policy),
		categories: (state.policyCategories ?? []).filter(
			(category) => category !== '*'
		),
		copy:
			messageProfile === 'default'
				? 'stock translations'
				: `custom ("${messageProfile}" profile)`,
		hasSavedConsent:
			state.consentInfo !== null && state.consentInfo !== undefined,
		iabEnabled: state.iab?.config.enabled ?? false,
		language: `${resolvedLanguage}${
			requestedLanguage ? ` (requested ${requestedLanguage})` : ' (auto)'
		}`,
		location: formatLocation(state.locationInfo),
		model: displayModel(state),
		policyId: policy?.id ?? 'none',
	};
};

/**
 * Live view of what the consent manager resolved: active policy, model,
 * location, language, plus the current consent decisions. Must be rendered
 * inside a `ConsentManagerProvider`.
 */
export const LiveStatus = ({ mode }: { mode: 'offline' | 'hosted' }) => {
	const [mounted, setMounted] = useState(false);
	const manager = useConsentManager();
	const {
		activeUI,
		consents,
		iab,
		initConsentManager,
		lastBannerFetchData,
		resetConsents,
		setActiveUI,
		setLanguage,
		setOverrides,
		overrides,
	} = manager;

	useEffect(() => {
		const frame = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	const policy = lastBannerFetchData?.policy;
	const policyDecision = lastBannerFetchData?.policyDecision;
	const requestedLanguage = overrides?.language;
	const display = createDisplay(mounted, manager);

	const rawState = mounted
		? {
				activeUI,
				consents,
				iabEnabled: iab?.config.enabled ?? false,
				mode,
				overrides: overrides ?? null,
				policy: policy ?? null,
				policyDecision: policyDecision ?? null,
			}
		: null;

	return (
		<div className="space-y-6">
			<div className="grid gap-3 text-sm sm:grid-cols-2">
				<StatusRow
					label="Policy"
					value={display.policyId}
				/>
				<StatusRow
					label="Model"
					value={display.model}
				/>
				<StatusRow
					label="Location"
					value={display.location}
				/>
				<StatusRow
					label="Language"
					value={display.language}
				/>
				<StatusRow
					label="Copy"
					value={display.copy}
				/>
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
								aria-pressed={isActive}
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
				<summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline-offset-4 select-none hover:underline">
					Raw state (for developers)
				</summary>
				<pre className="border-border/80 bg-muted/20 text-foreground/90 mt-2 max-h-96 overflow-auto rounded-xl border p-3 font-mono text-[12px] leading-5">
					{JSON.stringify(rawState, null, 2)}
				</pre>
			</details>
		</div>
	);
};
