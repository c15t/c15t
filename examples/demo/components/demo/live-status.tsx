'use client';

import {
	useInit,
	useSetActiveUI,
	useClear,
	useSetLanguage,
	useSetOverrides,
	useSnapshot,
} from 'c15t/react';
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
	'opt-in': 'Opt-in',
	'opt-out': 'Opt-out',
};

const StatusRow = ({ label, value }: { label: string; value: string }) => (
	<div className="border-border/70 border-b pb-2">
		<p className="label-pixel text-muted-foreground">{label}</p>
		<p className="mt-1 font-mono text-xs">{value}</p>
	</div>
);

/** Shows the policy and consent state resolved by the current kernel. */
// oxlint-disable-next-line complexity -- This demo renders a compact matrix of every kernel status field.
export const LiveStatus = ({ mode }: { mode: 'offline' | 'hosted' }) => {
	const [mounted, setMounted] = useState(false);
	const snapshot = useSnapshot();
	const init = useInit();
	const setActiveUI = useSetActiveUI();
	const clear = useClear();
	const setLanguage = useSetLanguage();
	const setOverrides = useSetOverrides();

	useEffect(() => {
		const frame = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	const policy = mounted ? snapshot.policyRule : null;
	const categories = mounted ? snapshot.policyRule.scope : [];
	const requestedLanguage = snapshot.overrides.language;
	const resolvedLanguage = snapshot.translations?.language ?? 'en';
	const messageProfile = policy?.i18n?.messageProfile ?? 'default';
	const location = snapshot.location?.countryCode
		? `${snapshot.location.countryCode}${
				snapshot.location.regionCode ? `-${snapshot.location.regionCode}` : ''
			}`
		: '--';

	const rawState = mounted
		? {
				activeUI: snapshot.activeUI,
				effectivePermissions: snapshot.effectivePermissions,
				explicitChoice: snapshot.explicitChoice,
				iabEnabled: snapshot.iab?.enabled ?? false,
				mode,
				noticeDismissal: snapshot.noticeDismissal,
				optOutDirectives: snapshot.optOutDirectives,
				overrides: snapshot.overrides,
				policy,
				policyDecision: snapshot.policyDecision,
				policyPending: snapshot.policyPending,
				privacySignals: snapshot.privacySignals,
				promptRequirement: snapshot.promptRequirement,
				resolution: snapshot.resolution,
			}
		: null;

	return (
		<div className="space-y-6">
			<div className="grid gap-3 text-sm sm:grid-cols-2">
				<StatusRow
					label="Policy"
					value={mounted ? (policy?.id ?? 'none') : '…'}
				/>
				<StatusRow
					label="Model"
					value={
						mounted
							? (MODEL_LABELS[snapshot.model ?? 'none'] ??
								snapshot.model ??
								'none')
							: '…'
					}
				/>
				<StatusRow
					label="Location"
					value={mounted ? location : '--'}
				/>
				<StatusRow
					label="Language"
					value={
						mounted
							? `${resolvedLanguage}${
									requestedLanguage
										? ` (requested ${requestedLanguage})`
										: ' (auto)'
								}`
							: '…'
					}
				/>
				<StatusRow
					label="Copy"
					value={
						messageProfile === 'default'
							? 'stock translations'
							: `custom ("${messageProfile}" profile)`
					}
				/>
				<StatusRow
					label="IAB TCF"
					value={snapshot.iab?.enabled ? 'enabled' : 'off'}
				/>
				<StatusRow
					label="Consent"
					value={snapshot.explicitChoice === null ? 'not saved yet' : 'saved'}
				/>
			</div>

			{categories.length > 0 && (
				<div className="space-y-2">
					<p className="label-pixel text-muted-foreground">Categories</p>
					<div className="flex flex-wrap gap-1.5">
						{categories.map((category) => {
							const granted = snapshot.effectivePermissions[category];
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
								aria-pressed={isActive}
								className="rounded-full"
								onClick={() => {
									if (option.value) {
										setLanguage(option.value);
									} else {
										setOverrides({
											...snapshot.overrides,
											language: undefined,
										});
									}
									void init();
								}}
								size="sm"
								variant={isActive ? 'default' : 'outline'}
							>
								{option.label}
							</Button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button
					className="rounded-full"
					onClick={() => setActiveUI('banner')}
					size="sm"
					variant="outline"
				>
					Show banner
				</Button>
				<Button
					className="rounded-full"
					onClick={() => setActiveUI('dialog')}
					size="sm"
					variant="outline"
				>
					Open preferences
				</Button>
				<Button
					className="rounded-full"
					onClick={() => {
						clear();
						void init();
					}}
					size="sm"
					variant="ghost"
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
