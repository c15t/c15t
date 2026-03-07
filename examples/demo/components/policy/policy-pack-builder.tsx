'use client';

import { useMemo, useState } from 'react';
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
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

type PolicyModel = 'opt-in' | 'opt-out' | 'none' | 'iab';
type UiMode = 'none' | 'banner' | 'dialog';
type UiAction = 'accept' | 'reject' | 'customize';
type UiActionLayout = 'split' | 'inline';
type UiProfile = 'balanced' | 'compact' | 'strict';
type PolicyScope = { country: string; region?: string };
type PolicyRegionScope = { country: string; region: string };

const UI_ACTIONS: UiAction[] = ['accept', 'reject', 'customize'];

const EU_COUNTRY_CODES = [
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
] as const;

const EEA_EXTRA_COUNTRY_CODES = ['IS', 'LI', 'NO'] as const;

const COUNTRY_OPTIONS = [
	{ code: 'AT', label: 'Austria' },
	{ code: 'AU', label: 'Australia' },
	{ code: 'BE', label: 'Belgium' },
	{ code: 'BG', label: 'Bulgaria' },
	{ code: 'BR', label: 'Brazil' },
	{ code: 'CA', label: 'Canada' },
	{ code: 'CH', label: 'Switzerland' },
	{ code: 'CY', label: 'Cyprus' },
	{ code: 'CZ', label: 'Czechia' },
	{ code: 'DE', label: 'Germany' },
	{ code: 'DK', label: 'Denmark' },
	{ code: 'EE', label: 'Estonia' },
	{ code: 'ES', label: 'Spain' },
	{ code: 'FI', label: 'Finland' },
	{ code: 'FR', label: 'France' },
	{ code: 'GB', label: 'United Kingdom' },
	{ code: 'GR', label: 'Greece' },
	{ code: 'HR', label: 'Croatia' },
	{ code: 'HU', label: 'Hungary' },
	{ code: 'IE', label: 'Ireland' },
	{ code: 'IS', label: 'Iceland' },
	{ code: 'IT', label: 'Italy' },
	{ code: 'JP', label: 'Japan' },
	{ code: 'LI', label: 'Liechtenstein' },
	{ code: 'LT', label: 'Lithuania' },
	{ code: 'LU', label: 'Luxembourg' },
	{ code: 'LV', label: 'Latvia' },
	{ code: 'MT', label: 'Malta' },
	{ code: 'NL', label: 'Netherlands' },
	{ code: 'NO', label: 'Norway' },
	{ code: 'PL', label: 'Poland' },
	{ code: 'PT', label: 'Portugal' },
	{ code: 'RO', label: 'Romania' },
	{ code: 'SE', label: 'Sweden' },
	{ code: 'SI', label: 'Slovenia' },
	{ code: 'SK', label: 'Slovakia' },
	{ code: 'US', label: 'United States' },
] as const;

const REGION_OPTIONS: Record<
	'US' | 'CA',
	Array<{ code: string; label: string }>
> = {
	US: [
		{ code: 'AL', label: 'Alabama' },
		{ code: 'AK', label: 'Alaska' },
		{ code: 'AZ', label: 'Arizona' },
		{ code: 'AR', label: 'Arkansas' },
		{ code: 'CA', label: 'California' },
		{ code: 'CO', label: 'Colorado' },
		{ code: 'CT', label: 'Connecticut' },
		{ code: 'DE', label: 'Delaware' },
		{ code: 'FL', label: 'Florida' },
		{ code: 'GA', label: 'Georgia' },
		{ code: 'HI', label: 'Hawaii' },
		{ code: 'ID', label: 'Idaho' },
		{ code: 'IL', label: 'Illinois' },
		{ code: 'IN', label: 'Indiana' },
		{ code: 'IA', label: 'Iowa' },
		{ code: 'KS', label: 'Kansas' },
		{ code: 'KY', label: 'Kentucky' },
		{ code: 'LA', label: 'Louisiana' },
		{ code: 'ME', label: 'Maine' },
		{ code: 'MD', label: 'Maryland' },
		{ code: 'MA', label: 'Massachusetts' },
		{ code: 'MI', label: 'Michigan' },
		{ code: 'MN', label: 'Minnesota' },
		{ code: 'MS', label: 'Mississippi' },
		{ code: 'MO', label: 'Missouri' },
		{ code: 'MT', label: 'Montana' },
		{ code: 'NE', label: 'Nebraska' },
		{ code: 'NV', label: 'Nevada' },
		{ code: 'NH', label: 'New Hampshire' },
		{ code: 'NJ', label: 'New Jersey' },
		{ code: 'NM', label: 'New Mexico' },
		{ code: 'NY', label: 'New York' },
		{ code: 'NC', label: 'North Carolina' },
		{ code: 'ND', label: 'North Dakota' },
		{ code: 'OH', label: 'Ohio' },
		{ code: 'OK', label: 'Oklahoma' },
		{ code: 'OR', label: 'Oregon' },
		{ code: 'PA', label: 'Pennsylvania' },
		{ code: 'RI', label: 'Rhode Island' },
		{ code: 'SC', label: 'South Carolina' },
		{ code: 'SD', label: 'South Dakota' },
		{ code: 'TN', label: 'Tennessee' },
		{ code: 'TX', label: 'Texas' },
		{ code: 'UT', label: 'Utah' },
		{ code: 'VT', label: 'Vermont' },
		{ code: 'VA', label: 'Virginia' },
		{ code: 'WA', label: 'Washington' },
		{ code: 'WV', label: 'West Virginia' },
		{ code: 'WI', label: 'Wisconsin' },
		{ code: 'WY', label: 'Wyoming' },
	],
	CA: [
		{ code: 'AB', label: 'Alberta' },
		{ code: 'BC', label: 'British Columbia' },
		{ code: 'MB', label: 'Manitoba' },
		{ code: 'NB', label: 'New Brunswick' },
		{ code: 'NL', label: 'Newfoundland and Labrador' },
		{ code: 'NS', label: 'Nova Scotia' },
		{ code: 'NT', label: 'Northwest Territories' },
		{ code: 'NU', label: 'Nunavut' },
		{ code: 'ON', label: 'Ontario' },
		{ code: 'PE', label: 'Prince Edward Island' },
		{ code: 'QC', label: 'Quebec' },
		{ code: 'SK', label: 'Saskatchewan' },
		{ code: 'YT', label: 'Yukon' },
	],
};

type PolicyUiSurface = {
	allowedActions: UiAction[];
	primaryAction: UiAction;
	actionOrder: UiAction[];
	actionLayout: UiActionLayout;
	uiProfile: UiProfile;
};

type PolicyEntry = {
	id: string;
	isDefault?: boolean;
	countries?: string[];
	regions?: PolicyRegionScope[];
	model: PolicyModel;
	expiryDays?: number;
	uiMode?: UiMode;
	banner?: PolicyUiSurface;
	dialog?: PolicyUiSurface;
	categories?: string[];
};

type BuilderInput = {
	scopes: PolicyScope[];
	model: PolicyModel;
	expiryDays: number;
	uiMode: UiMode;
	primaryAction: UiAction;
	allowedActions: UiAction[];
	actionOrder: string;
	actionLayout: UiActionLayout;
	uiProfile: UiProfile;
	categories: string;
};

function isRegionCountry(country: string): country is 'US' | 'CA' {
	return country === 'US' || country === 'CA';
}

function normalizeActions(actions: UiAction[]): UiAction[] {
	const ordered: UiAction[] = ['accept', 'reject', 'customize'];
	return ordered.filter((action) => actions.includes(action));
}

function normalizeActionOrder(
	value: string,
	allowedActions: UiAction[]
): UiAction[] {
	const allowedSet = new Set(allowedActions);
	const parsed = value
		.split(',')
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);

	const ordered: UiAction[] = [];

	for (const action of parsed) {
		if (
			(action === 'accept' || action === 'reject' || action === 'customize') &&
			allowedSet.has(action) &&
			!ordered.includes(action)
		) {
			ordered.push(action);
		}
	}

	for (const action of allowedActions) {
		if (!ordered.includes(action)) {
			ordered.push(action);
		}
	}

	return ordered;
}

function resolvePrimaryAction(
	primaryAction: UiAction,
	allowedActions: UiAction[]
): UiAction {
	return allowedActions.includes(primaryAction)
		? primaryAction
		: (allowedActions[0] ?? 'accept');
}

function parseList(value: string): string[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

function toActionLabel(action: UiAction): string {
	switch (action) {
		case 'accept':
			return 'Accept';
		case 'reject':
			return 'Reject';
		case 'customize':
			return 'Customize';
		default:
			return action;
	}
}

function serializeEntry(entry: Record<string, unknown>): string {
	return JSON.stringify(entry, null, 2)
		.replaceAll('\n', '\n  ')
		.replaceAll('"', "'");
}

function normalizeScope(scope: PolicyScope): PolicyScope | null {
	const country = scope.country.trim().toUpperCase();
	if (!country) {
		return null;
	}

	if (!isRegionCountry(country)) {
		return { country };
	}

	const region = scope.region?.trim().toUpperCase();
	if (!region) {
		return { country };
	}

	const validRegion = REGION_OPTIONS[country].some(
		(item) => item.code === region
	);
	return validRegion ? { country, region } : { country };
}

function normalizeScopes(scopes: PolicyScope[]): PolicyScope[] {
	const seen = new Set<string>();
	const normalized: PolicyScope[] = [];

	for (const scope of scopes) {
		const next = normalizeScope(scope);
		if (!next) {
			continue;
		}
		const key = `${next.country}:${next.region ?? ''}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		normalized.push(next);
	}

	return normalized;
}

function formatScopeCode(scope: PolicyScope): string {
	return scope.region ? `${scope.country}-${scope.region}` : scope.country;
}

function summarizeScopes(scopes: PolicyScope[]): string {
	const normalized = normalizeScopes(scopes);
	if (normalized.length === 0) {
		return 'none';
	}
	if (normalized.length <= 4) {
		return normalized.map(formatScopeCode).join(', ');
	}
	return `${normalized
		.slice(0, 4)
		.map(formatScopeCode)
		.join(', ')} +${normalized.length - 4} more`;
}

function scopesFromEntry(entry: PolicyEntry): PolicyScope[] {
	const countries = (entry.countries ?? []).map((country) => ({ country }));
	const regions = (entry.regions ?? []).map((region) => ({
		country: region.country,
		region: region.region,
	}));
	return normalizeScopes([...countries, ...regions]);
}

function buildPolicyEntry(input: BuilderInput): PolicyEntry {
	const allowedActions = normalizeActions(input.allowedActions);
	const actionOrder = normalizeActionOrder(input.actionOrder, allowedActions);
	const primaryAction = resolvePrimaryAction(
		input.primaryAction,
		allowedActions
	);
	const categories = parseList(input.categories);
	const normalizedScopes = normalizeScopes(input.scopes);
	const countries = normalizedScopes
		.filter((scope) => !scope.region)
		.map((scope) => scope.country);
	const regions: PolicyRegionScope[] = normalizedScopes
		.filter(
			(scope): scope is PolicyScope & { region: string } => !!scope.region
		)
		.map((scope) => ({ country: scope.country, region: scope.region }));
	const idPrefix = normalizedScopes
		.slice(0, 3)
		.map((scope) =>
			scope.region
				? `${scope.country}_${scope.region}`.toLowerCase()
				: scope.country.toLowerCase()
		)
		.join('_');
	const idSuffix =
		normalizedScopes.length > 3 ? `_${normalizedScopes.length}scopes` : '';

	const baseEntry: PolicyEntry = {
		id: `policy_generated_${idPrefix || 'scope'}${idSuffix}`,
		...(countries.length > 0 ? { countries } : {}),
		...(regions.length > 0 ? { regions } : {}),
		model: input.model,
		expiryDays: input.expiryDays,
		...(categories.length > 0 ? { categories } : {}),
	};

	if (input.model === 'iab') {
		return baseEntry;
	}

	if (input.model === 'none') {
		return {
			...baseEntry,
			uiMode: 'none',
		};
	}

	if (input.uiMode === 'none') {
		return {
			...baseEntry,
			uiMode: 'none',
		};
	}

	const surface: PolicyUiSurface = {
		allowedActions,
		primaryAction,
		actionOrder,
		actionLayout: input.actionLayout,
		uiProfile: input.uiProfile,
	};

	return {
		...baseEntry,
		uiMode: input.uiMode,
		...(input.uiMode === 'banner' ? { banner: surface } : { dialog: surface }),
	};
}

function buildPolicyPackCode(
	input: BuilderInput,
	includeDefaultFallback: boolean
): string {
	const entry = buildPolicyEntry(input);
	const helper = includeDefaultFallback
		? 'createPackWithDefault'
		: 'createPack';
	return `import { policyBuilder } from '@c15t/backend';

export const policies = policyBuilder.${helper}([
  ${serializeEntry(entry as Record<string, unknown>)}
]);
`;
}

function ActionToggle({
	label,
	checked,
	disabled,
	onChange,
}: {
	label: UiAction;
	checked: boolean;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="group flex items-center gap-2 rounded-md border px-3 py-2">
			<Checkbox
				checked={checked}
				disabled={disabled}
				onCheckedChange={(value) => onChange(Boolean(value))}
			/>
			<Label className="font-mono text-xs">{label}</Label>
		</div>
	);
}

function PolicySurfacePreview({
	entry,
	note,
}: {
	entry: PolicyEntry;
	note?: string;
}) {
	const surface =
		entry.uiMode === 'dialog'
			? entry.dialog
			: entry.uiMode === 'banner'
				? entry.banner
				: undefined;
	const activeSurface = entry.uiMode === 'dialog' ? 'dialog' : 'banner';
	const orderedActions = surface
		? normalizeActionOrder(
				surface.actionOrder.join(','),
				surface.allowedActions
			)
		: [];
	const actions = surface?.allowedActions ?? [];
	const hasVisibleUi =
		entry.model !== 'none' && entry.uiMode !== 'none' && surface;
	const regionText = summarizeScopes(scopesFromEntry(entry));

	return (
		<div className="space-y-3 rounded-xl border bg-card p-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h4 className="font-medium text-sm">Policy component preview</h4>
					<p className="text-muted-foreground text-xs">{entry.id}</p>
				</div>
				<div className="flex flex-wrap gap-1">
					<Badge variant="secondary" className="font-mono text-[10px]">
						{entry.model}
					</Badge>
					<Badge variant="outline" className="font-mono text-[10px]">
						{entry.uiMode ?? 'none'}
					</Badge>
				</div>
			</div>

			<p className="rounded-md border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
				Scope: {regionText}
			</p>

			{note ? (
				<p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
					{note}
				</p>
			) : null}

			{hasVisibleUi ? (
				<div className="space-y-3 rounded-lg border bg-muted/30 p-3">
					<div>
						<p className="font-medium text-sm">
							Your privacy settings ({activeSurface})
						</p>
						<p className="text-muted-foreground text-xs">
							This updates in real time from your selected policy values.
						</p>
					</div>
					<div
						className={cn(
							actions.length <= 1 || surface.actionLayout === 'inline'
								? 'flex flex-wrap gap-2'
								: 'grid gap-2 sm:grid-cols-2'
						)}
					>
						{orderedActions.map((action) => (
							<Button
								key={`${entry.id}-${action}`}
								type="button"
								size="sm"
								variant={
									surface.primaryAction === action ? 'default' : 'outline'
								}
								className={cn(
									'capitalize',
									surface.actionLayout === 'split' ? 'w-full' : ''
								)}
							>
								{toActionLabel(action)}
							</Button>
						))}
					</div>
					<div className="flex flex-wrap gap-1">
						<Badge variant="outline" className="font-mono text-[10px]">
							layout:{surface.actionLayout}
						</Badge>
						<Badge variant="outline" className="font-mono text-[10px]">
							profile:{surface.uiProfile}
						</Badge>
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-dashed bg-muted/20 p-3 text-muted-foreground text-xs">
					{entry.model === 'none' || entry.uiMode === 'none'
						? 'No banner or dialog will be shown for this policy.'
						: 'No UI surface configured.'}
				</div>
			)}

			<div className="grid gap-1 text-xs">
				<p className="text-muted-foreground">Categories</p>
				<p className="font-mono">
					{(entry.categories ?? []).join(', ') || 'none'}
				</p>
			</div>
		</div>
	);
}

export function PolicyPackBuilder() {
	const [scopes, setScopes] = useState<PolicyScope[]>([
		{ country: 'US', region: 'CA' },
	]);
	const [model, setModel] = useState<PolicyModel>('opt-in');
	const [uiMode, setUiMode] = useState<UiMode>('banner');
	const [primaryAction, setPrimaryAction] = useState<UiAction>('accept');
	const [expiryDays, setExpiryDays] = useState(365);
	const [categories, setCategories] = useState(
		'necessary, functionality, experience, measurement, marketing'
	);
	const [allowedActions, setAllowedActions] = useState<UiAction[]>([
		'accept',
		'reject',
		'customize',
	]);
	const [actionOrder, setActionOrder] = useState('accept, reject, customize');
	const [actionLayout, setActionLayout] = useState<UiActionLayout>('split');
	const [uiProfile, setUiProfile] = useState<UiProfile>('balanced');
	const [includeDefaultFallback, setIncludeDefaultFallback] = useState(true);
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
		'idle'
	);

	const isIabModel = model === 'iab';
	const isUiDisabled = model === 'none' || isIabModel;

	const builderInput = useMemo<BuilderInput>(
		() => ({
			scopes,
			model,
			expiryDays,
			uiMode,
			primaryAction,
			allowedActions,
			actionOrder,
			actionLayout,
			uiProfile,
			categories,
		}),
		[
			scopes,
			model,
			expiryDays,
			uiMode,
			primaryAction,
			allowedActions,
			actionOrder,
			actionLayout,
			uiProfile,
			categories,
		]
	);

	const previewEntry = useMemo(
		() => buildPolicyEntry(builderInput),
		[builderInput]
	);
	const generatedCode = useMemo(
		() => buildPolicyPackCode(builderInput, includeDefaultFallback),
		[builderInput, includeDefaultFallback]
	);

	const setScopeCountry = (index: number, nextCountry: string) => {
		setScopes((current) =>
			current.map((scope, idx) => {
				if (idx !== index) {
					return scope;
				}
				const country = nextCountry.toUpperCase();
				if (!isRegionCountry(country)) {
					return { country };
				}
				const region = scope.region?.toUpperCase();
				const valid =
					!!region &&
					REGION_OPTIONS[country].some((item) => item.code === region);
				return valid ? { country, region } : { country };
			})
		);
	};

	const setScopeRegion = (index: number, nextRegion: string) => {
		setScopes((current) =>
			current.map((scope, idx) => {
				if (idx !== index) {
					return scope;
				}
				const country = scope.country.toUpperCase();
				if (!isRegionCountry(country)) {
					return { country };
				}
				if (nextRegion === '__none') {
					return { country };
				}
				const region = nextRegion.toUpperCase();
				const valid = REGION_OPTIONS[country].some(
					(item) => item.code === region
				);
				return valid ? { country, region } : { country };
			})
		);
	};

	const addScope = () => {
		setScopes((current) => [...normalizeScopes(current), { country: 'US' }]);
	};

	const removeScope = (index: number) => {
		setScopes((current) => {
			if (current.length <= 1) {
				return current;
			}
			return current.filter((_, idx) => idx !== index);
		});
	};

	const applyPreset = (preset: 'eu' | 'eea' | 'eu_uk') => {
		if (preset === 'eu') {
			setScopes(EU_COUNTRY_CODES.map((country) => ({ country })));
			return;
		}
		if (preset === 'eea') {
			setScopes(
				[...EU_COUNTRY_CODES, ...EEA_EXTRA_COUNTRY_CODES].map((country) => ({
					country,
				}))
			);
			return;
		}
		setScopes([...EU_COUNTRY_CODES, 'GB'].map((country) => ({ country })));
	};

	const toggleAction = (action: UiAction, checked: boolean) => {
		setAllowedActions((current) => {
			if (checked) {
				return normalizeActions([...current, action]);
			}
			const next = current.filter((item) => item !== action);
			return normalizeActions(next.length ? next : ['accept']);
		});
	};

	return (
		<section className="space-y-6">
			<Card>
				<CardHeader className="pb-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<CardTitle>Policy Pack Builder</CardTitle>
							<CardDescription>
								Multi-scope builder: apply one policy to many countries/regions.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-1">
							<Badge variant="secondary">Single policy entry</Badge>
							<Badge variant="outline">EU/EEA presets</Badge>
						</div>
					</div>
				</CardHeader>
			</Card>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Policy scope</CardTitle>
							<CardDescription>
								Target multiple countries and optional region-level overrides.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => applyPreset('eu')}
								>
									Set EU (27)
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => applyPreset('eea')}
								>
									Set EEA (30)
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => applyPreset('eu_uk')}
								>
									Set EU + UK
								</Button>
								<Button type="button" size="sm" onClick={addScope}>
									Add location
								</Button>
							</div>

							<div className="space-y-3">
								{scopes.map((scope, index) => {
									const countryValue = scope.country || 'US';
									const regionCountry = isRegionCountry(countryValue)
										? countryValue
										: null;
									const regionOptions = regionCountry
										? REGION_OPTIONS[regionCountry]
										: [];
									return (
										<div
											key={`scope-${index}`}
											className="rounded-lg border p-3"
										>
											<div className="mb-3 flex items-center justify-between gap-2">
												<p className="font-medium text-xs">
													Location #{index + 1}
												</p>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={() => removeScope(index)}
													disabled={scopes.length <= 1}
												>
													Remove
												</Button>
											</div>
											<div className="grid gap-3 md:grid-cols-2">
												<div className="space-y-2">
													<Label>Country</Label>
													<Select
														value={countryValue}
														onValueChange={(value) =>
															setScopeCountry(index, value)
														}
													>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{COUNTRY_OPTIONS.map((option) => (
																<SelectItem
																	key={option.code}
																	value={option.code}
																>
																	{option.label} ({option.code})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-2">
													<Label>Region / Province / State</Label>
													<Select
														value={scope.region || '__none'}
														onValueChange={(value) =>
															setScopeRegion(index, value)
														}
														disabled={!regionCountry}
													>
														<SelectTrigger className="w-full">
															<SelectValue
																placeholder={
																	regionCountry
																		? 'No region (country-wide)'
																		: 'Regions available for US/CA only'
																}
															/>
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="__none">
																No region (country-wide)
															</SelectItem>
															{regionOptions.map((option) => (
																<SelectItem
																	key={option.code}
																	value={option.code}
																>
																	{option.label} ({option.code})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
								Match scope: {summarizeScopes(scopes)}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Policy behavior</CardTitle>
							<CardDescription>
								Configure model, UI controls, and consent category scope.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								<div className="space-y-2">
									<Label htmlFor="policy-model">Model</Label>
									<Select
										value={model}
										onValueChange={(value) => setModel(value as PolicyModel)}
									>
										<SelectTrigger id="policy-model" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="opt-in">opt-in</SelectItem>
											<SelectItem value="opt-out">opt-out</SelectItem>
											<SelectItem value="none">none</SelectItem>
											<SelectItem value="iab">iab</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="ui-mode">UI mode</Label>
									<Select
										value={uiMode}
										onValueChange={(value) => setUiMode(value as UiMode)}
										disabled={isUiDisabled}
									>
										<SelectTrigger id="ui-mode" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="banner">banner</SelectItem>
											<SelectItem value="dialog">dialog</SelectItem>
											<SelectItem value="none">none</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="primary-action">Primary action</Label>
									<Select
										value={primaryAction}
										onValueChange={(value) =>
											setPrimaryAction(value as UiAction)
										}
										disabled={isUiDisabled || uiMode === 'none'}
									>
										<SelectTrigger id="primary-action" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{UI_ACTIONS.map((action) => (
												<SelectItem key={action} value={action}>
													{action}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="expiry-days">Expiry days</Label>
									<Input
										id="expiry-days"
										type="number"
										min={1}
										value={expiryDays}
										onChange={(event) => {
											const parsed = Number(event.target.value);
											setExpiryDays(
												Number.isFinite(parsed) && parsed > 0 ? parsed : 1
											);
										}}
									/>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="action-layout">Action layout</Label>
									<Select
										value={actionLayout}
										onValueChange={(value) =>
											setActionLayout(value as UiActionLayout)
										}
										disabled={isUiDisabled || uiMode === 'none'}
									>
										<SelectTrigger id="action-layout" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="split">split</SelectItem>
											<SelectItem value="inline">inline</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="ui-profile">UI profile</Label>
									<Select
										value={uiProfile}
										onValueChange={(value) => setUiProfile(value as UiProfile)}
										disabled={isUiDisabled || uiMode === 'none'}
									>
										<SelectTrigger id="ui-profile" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="balanced">balanced</SelectItem>
											<SelectItem value="compact">compact</SelectItem>
											<SelectItem value="strict">strict</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="action-order">Action order</Label>
								<Input
									id="action-order"
									value={actionOrder}
									onChange={(event) => setActionOrder(event.target.value)}
									disabled={isUiDisabled || uiMode === 'none'}
									placeholder="accept, reject, customize"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="categories">Categories (comma-separated)</Label>
								<Textarea
									id="categories"
									rows={2}
									value={categories}
									onChange={(event) => setCategories(event.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label>Allowed actions</Label>
								<div className="grid gap-2 sm:grid-cols-3">
									{UI_ACTIONS.map((action) => (
										<ActionToggle
											key={`policy-${action}`}
											label={action}
											checked={allowedActions.includes(action)}
											disabled={isUiDisabled || uiMode === 'none'}
											onChange={(checked) => toggleAction(action, checked)}
										/>
									))}
								</div>
							</div>

							{isIabModel ? (
								<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-xs dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
									IAB mode is active. Policy-level <code>ui.*</code> overrides
									are ignored.
								</p>
							) : null}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="flex items-center justify-between gap-2">
								<div>
									<CardTitle className="text-base">Generated pack</CardTitle>
									<CardDescription>
										Generate a policy pack snippet ready to paste into backend
										config.
									</CardDescription>
								</div>
								<Button
									size="sm"
									variant="outline"
									onClick={async () => {
										try {
											await navigator.clipboard.writeText(generatedCode);
											setCopyState('copied');
										} catch {
											setCopyState('error');
										}
										setTimeout(() => setCopyState('idle'), 1500);
									}}
								>
									{copyState === 'copied'
										? 'Copied'
										: copyState === 'error'
											? 'Copy failed'
											: 'Copy code'}
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
								<Checkbox
									id="include-default-fallback"
									checked={includeDefaultFallback}
									onCheckedChange={(value) =>
										setIncludeDefaultFallback(Boolean(value))
									}
								/>
								<Label htmlFor="include-default-fallback" className="text-xs">
									Add automatic world fallback (recommended, via{' '}
									<code>policyBuilder.createPackWithDefault()</code>)
								</Label>
							</div>
							<pre className="max-h-[380px] overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
								<code>{generatedCode}</code>
							</pre>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Live preview</CardTitle>
							<CardDescription>
								Inspect the generated entry and component behavior in real time.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="entry" className="w-full">
								<TabsList className="w-full">
									<TabsTrigger value="entry" className="flex-1">
										Entry
									</TabsTrigger>
									<TabsTrigger value="component" className="flex-1">
										Component
									</TabsTrigger>
								</TabsList>

								<TabsContent value="entry" className="mt-4 space-y-3">
									<div className="rounded-lg border bg-muted/10 p-3">
										<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
											<p className="font-medium text-xs">{previewEntry.id}</p>
											<div className="flex gap-1">
												<Badge
													variant="secondary"
													className="font-mono text-[10px]"
												>
													{previewEntry.model}
												</Badge>
												<Badge
													variant="outline"
													className="font-mono text-[10px]"
												>
													{previewEntry.uiMode ?? 'none'}
												</Badge>
											</div>
										</div>
										<p className="text-[11px] text-muted-foreground">
											Scope: {summarizeScopes(scopesFromEntry(previewEntry))}
										</p>
									</div>
								</TabsContent>

								<TabsContent value="component" className="mt-4 space-y-3">
									<PolicySurfacePreview
										entry={previewEntry}
										note={
											isIabModel
												? 'IAB mode uses TCF defaults, so policy-level UI overrides are not previewed.'
												: undefined
										}
									/>
									<Separator />
									<p className="text-muted-foreground text-xs">
										Preview is simulated using pre-built dashboard components.
									</p>
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
