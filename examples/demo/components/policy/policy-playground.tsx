'use client';

import type {
	PolicyOptionalCategory,
	PolicyPrompt,
	PolicyRuleModel,
} from '@c15t/schema/types';
import { POLICY_OPTIONAL_CATEGORIES } from '@c15t/schema/types';
import type {
	ConsentSnapshot,
	KernelEvent,
	PromptPosition,
	PromptVariant,
} from 'c15t';
import { readStoredRecords } from 'c15t/modules/persistence';
import type { StoredRecords } from 'c15t/modules/persistence';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	offline,
	useSnapshot,
} from 'c15t/react';
import { KernelContext, ProviderServicesContext } from 'c15t/react/context';
import { useHeadlessConsentUI } from 'c15t/react/headless';
import {
	IABConsentBanner,
	IABConsentDialog,
	IABProvider,
} from 'c15t/react/iab';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import {
	buildBackendSnippet,
	buildProviderSnippet,
	DEFAULT_PRESENTATION_FORM,
	defaultPositionFor,
	defaultVariantFor,
	describeMatch,
	fromPolicyRule,
	getPlaygroundPreset,
	inspectPlaygroundRule,
	playgroundPresets,
	positionOptionsFor,
	PROMPT_VARIANTS,
	promptsForModel,
	setPresentationVariant,
	toConsentPresentation,
	toPolicyRule,
	VARIANT_HINTS,
} from '../../lib/policy-playground';
import type {
	PlaygroundPresentationForm,
	PlaygroundPreset,
	PlaygroundRuleForm,
} from '../../lib/policy-playground';
import {
	DEMO_CMP_ID,
	DEMO_CUSTOM_VENDORS,
	DEMO_IAB_VENDOR_IDS,
} from '../../lib/scenarios';
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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

/** Keeps playground records apart from the consent the main demo stores. */
const STORAGE_CONFIG = { storageKey: 'c15t-policy-playground' } as const;

const MODEL_OPTIONS: { value: PolicyRuleModel; label: string; hint: string }[] =
	[
		{
			hint: 'Optional categories stay denied until a valid explicit grant.',
			label: 'opt-in',
			value: 'opt-in',
		},
		{
			hint: 'Optional categories are allowed until the visitor denies them.',
			label: 'opt-out',
			value: 'opt-out',
		},
		{
			hint: 'IAB TCF 2.3. The playground mounts the IAB addon and fetches the Global Vendor List for this model.',
			label: 'iab',
			value: 'iab',
		},
	];

const PROMPT_HINTS: Record<PolicyPrompt, string> = {
	choice: 'First layer offers accept and reject (and optionally customize).',
	none: 'No first layer. Preferences and disclosures stay reachable.',
	notice:
		'Non-blocking notice with one dismiss action. Dismissal never creates a choice.',
};

const EVENT_TYPES: KernelEvent['type'][] = [
	'init:applied',
	'choice:recorded',
	'permissions:changed',
	'notice:dismissed',
	'privacy:opt-out',
	'records:cleared',
	'command:save:completed',
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="label-pixel text-muted-foreground">{children}</p>
);

const JsonBlock = ({ value }: { value: unknown }) => (
	<pre className="border-border/80 bg-muted/20 text-foreground/90 max-h-96 overflow-auto rounded-xl border p-3 font-mono text-[12px] leading-5">
		{JSON.stringify(value, null, 2)}
	</pre>
);

const CodeBlock = ({ value }: { value: string }) => (
	<pre className="border-border/80 bg-muted/20 text-foreground/90 overflow-auto rounded-xl border p-3 font-mono text-[12px] leading-5">
		{value}
	</pre>
);

const Field = ({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}) => (
	<div className="space-y-1.5">
		<Label className="text-xs">{label}</Label>
		{children}
		{hint ? (
			<p className="text-muted-foreground text-[11px] leading-4">{hint}</p>
		) : null}
	</div>
);

const Select = ({
	value,
	onChange,
	options,
	testId,
}: {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	testId?: string;
}) => (
	<select
		data-testid={testId}
		value={value}
		onChange={(event) => onChange(event.target.value)}
		className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
	>
		{options.map((option) => (
			<option
				key={option.value}
				value={option.value}
			>
				{option.label}
			</option>
		))}
	</select>
);

const Checkbox = ({
	checked,
	onChange,
	label,
	disabled,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	disabled?: boolean;
}) => (
	<label
		className={cn(
			'flex items-center gap-2 text-sm',
			disabled && 'text-muted-foreground'
		)}
	>
		<input
			type="checkbox"
			checked={checked}
			disabled={disabled}
			onChange={(event) => onChange(event.target.checked)}
			className="size-4"
		/>
		{label}
	</label>
);

const CategoryPicker = ({
	value,
	onChange,
	disabled,
	allowed,
}: {
	value: PolicyOptionalCategory[];
	onChange: (next: PolicyOptionalCategory[]) => void;
	disabled?: boolean;
	allowed?: readonly PolicyOptionalCategory[];
}) => (
	<div className="flex flex-wrap gap-x-4 gap-y-1.5">
		{POLICY_OPTIONAL_CATEGORIES.map((category) => (
			<Checkbox
				key={category}
				label={category}
				disabled={disabled || (allowed ? !allowed.includes(category) : false)}
				checked={value.includes(category)}
				onChange={(checked) =>
					onChange(
						checked
							? [...value, category]
							: value.filter((item) => item !== category)
					)
				}
			/>
		))}
	</div>
);

/** Fire a kernel command from a click. Failures surface as kernel events. */
const run = async function run(task: Promise<unknown>): Promise<void> {
	try {
		await task;
	} catch {
		// Reported through `command:error`; nothing to do here.
	}
};

const formatAge = function formatAge(from: number, to: number): string {
	const seconds = Math.max(0, Math.round((to - from) / 1000));
	if (seconds < 60) {
		return `${seconds}s ago`;
	}
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m ago`;
	}
	const hours = Math.round(minutes / 60);
	if (hours < 48) {
		return `${hours}h ago`;
	}
	return `${Math.round(hours / 24)}d ago`;
};

// ---------------------------------------------------------------------------
// Preset gallery
// ---------------------------------------------------------------------------

const PresetCard = ({
	preset,
	active,
	onLoad,
}: {
	preset: PlaygroundPreset;
	active: boolean;
	onLoad: () => void;
}) => {
	const { rule } = preset;
	const gpc = rule.privacySignals?.gpc?.denyCategories ?? [];
	return (
		<Card
			className={cn(
				'gap-3 py-4',
				active ? 'border-foreground' : 'border-border/80'
			)}
		>
			<CardHeader className="px-4">
				<CardTitle className="flex flex-wrap items-center gap-2 text-sm">
					{preset.label}
					<code className="text-muted-foreground font-mono text-[11px]">
						{rule.id}
					</code>
				</CardTitle>
				<CardDescription className="text-xs">
					{describeMatch(rule.match)}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 px-4">
				<div className="flex flex-wrap gap-1.5">
					<Badge variant="secondary">{rule.model}</Badge>
					<Badge variant="secondary">prompt: {rule.prompt}</Badge>
					<Badge variant="outline">
						choice {rule.validity?.choiceDays ?? 365}d
					</Badge>
					{rule.validity?.noticeDays ? (
						<Badge variant="outline">notice {rule.validity.noticeDays}d</Badge>
					) : null}
					{gpc.length > 0 ? (
						<Badge variant="outline">GPC denies {gpc.join(', ')}</Badge>
					) : null}
					{rule.rights?.length ? (
						<Badge variant="outline">rights +{rule.rights.join(', ')}</Badge>
					) : null}
				</div>
				{rule.review ? (
					<details>
						<summary className="text-muted-foreground cursor-pointer text-xs select-none">
							Review: {rule.review.status}
							{rule.review.reviewedOn ? ` on ${rule.review.reviewedOn}` : ''}
							{rule.review.reviewBy ? `, next by ${rule.review.reviewBy}` : ''}
						</summary>
						<ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-xs leading-5">
							{rule.review.assumptions?.map((assumption) => (
								<li key={assumption}>{assumption}</li>
							))}
						</ul>
						{rule.review.sources?.length ? (
							<p className="text-muted-foreground mt-2 text-xs">
								Sources:{' '}
								{rule.review.sources.map((source, index) => (
									<React.Fragment key={source}>
										{index > 0 ? ', ' : ''}
										<a
											href={source}
											target="_blank"
											rel="noreferrer"
											className="underline underline-offset-4"
										>
											{new URL(source).hostname}
										</a>
									</React.Fragment>
								))}
							</p>
						) : null}
					</details>
				) : null}
				<Button
					size="sm"
					variant={active ? 'default' : 'outline'}
					className="rounded-full"
					onClick={onLoad}
				>
					{active ? 'Loaded' : 'Load into editor'}
				</Button>
			</CardContent>
		</Card>
	);
};

// ---------------------------------------------------------------------------
// Rule editor
// ---------------------------------------------------------------------------

const RuleEditor = ({
	form,
	onChange,
}: {
	form: PlaygroundRuleForm;
	onChange: (next: PlaygroundRuleForm) => void;
}) => {
	const update = function update(patch: Partial<PlaygroundRuleForm>) {
		onChange({ ...form, ...patch });
	};
	const prompts = promptsForModel(form.model);
	const scoped = form.allCategories
		? POLICY_OPTIONAL_CATEGORIES
		: form.categories;

	return (
		<div className="grid gap-5 sm:grid-cols-2">
			<Field
				label="Rule id"
				hint="Stored with every choice so you can tell which rule a visitor answered."
			>
				<Input
					value={form.id}
					onChange={(event) => update({ id: event.target.value })}
				/>
			</Field>
			<Field
				label="Permission model"
				hint={MODEL_OPTIONS.find((option) => option.value === form.model)?.hint}
			>
				<Select
					testId="playground-model"
					value={form.model}
					onChange={(value) => {
						const model = value as PolicyRuleModel;
						const allowed = promptsForModel(model);
						update({
							model,
							prompt: allowed.includes(form.prompt)
								? form.prompt
								: (allowed[0] as PolicyPrompt),
						});
					}}
					options={MODEL_OPTIONS}
				/>
			</Field>
			<Field
				label="Prompt"
				hint={PROMPT_HINTS[form.prompt]}
			>
				<Select
					testId="playground-prompt-select"
					value={form.prompt}
					onChange={(value) => update({ prompt: value as PolicyPrompt })}
					options={prompts.map((prompt) => ({ label: prompt, value: prompt }))}
				/>
			</Field>
			<Field
				label="Choice prompt actions"
				hint="Accept and reject are always required and must be equally prominent."
			>
				<Checkbox
					label="Offer customize"
					checked={form.customize}
					disabled={form.prompt !== 'choice'}
					onChange={(customize) => update({ customize })}
				/>
			</Field>
			<Field
				label="Match countries"
				hint="Comma-separated ISO codes. Region matches win over country matches."
			>
				<Input
					value={form.matchCountries}
					placeholder="GB, DE, FR"
					onChange={(event) => update({ matchCountries: event.target.value })}
				/>
			</Field>
			<Field
				label="Match regions"
				hint="Country-region pairs, e.g. US-CA, CA-QC."
			>
				<Input
					value={form.matchRegions}
					placeholder="US-CA"
					onChange={(event) => update({ matchRegions: event.target.value })}
				/>
			</Field>
			<Field label="Match everywhere else">
				<div className="space-y-1.5">
					<Checkbox
						label="Fallback when the location is unknown"
						checked={form.matchFallback}
						onChange={(matchFallback) => update({ matchFallback })}
					/>
					<Checkbox
						label="Default when nothing else matches"
						checked={form.matchDefault}
						onChange={(matchDefault) => update({ matchDefault })}
					/>
				</div>
			</Field>
			<Field
				label="Scope mode"
				hint={
					form.scopeMode === 'strict'
						? 'Categories outside scope are denied.'
						: 'Categories outside scope keep the model default.'
				}
			>
				<Select
					value={form.scopeMode}
					onChange={(value) =>
						update({ scopeMode: value as PlaygroundRuleForm['scopeMode'] })
					}
					options={[
						{ label: 'permissive', value: 'permissive' },
						{ label: 'strict', value: 'strict' },
					]}
				/>
			</Field>
			<Field
				label="Categories in scope"
				hint="Necessary is never a choice and is always on."
			>
				<div className="space-y-2">
					<Checkbox
						label="Every optional category (*)"
						checked={form.allCategories}
						onChange={(allCategories) => update({ allCategories })}
					/>
					<CategoryPicker
						value={form.categories}
						disabled={form.allCategories}
						onChange={(categories) => update({ categories })}
					/>
				</div>
			</Field>
			<Field
				label="Preselected in preferences"
				hint="Pre-checked in the preference form only. Never a grant."
			>
				<CategoryPicker
					value={form.preselected}
					allowed={scoped}
					disabled={form.model === 'iab'}
					onChange={(preselected) => update({ preselected })}
				/>
			</Field>
			<Field
				label="Choice validity (days)"
				hint="Positive grants expire. Denials never age into grants."
			>
				<Input
					type="number"
					min={1}
					value={form.choiceDays}
					onChange={(event) =>
						update({ choiceDays: Number(event.target.value) })
					}
				/>
			</Field>
			<Field
				label="Notice validity (days)"
				hint="How long a notice dismissal keeps the notice hidden."
			>
				<Input
					type="number"
					min={1}
					value={form.noticeDays}
					onChange={(event) =>
						update({ noticeDays: Number(event.target.value) })
					}
				/>
			</Field>
			<Field
				label="Global Privacy Control"
				hint="An active GPC signal denies these categories. It is an opt-out, never consent."
			>
				<div className="space-y-2">
					<Checkbox
						label="Honor the GPC signal"
						checked={form.gpcEnabled}
						onChange={(gpcEnabled) => update({ gpcEnabled })}
					/>
					<CategoryPicker
						value={form.gpcDeny}
						allowed={scoped}
						disabled={!form.gpcEnabled}
						onChange={(gpcDeny) => update({ gpcDeny })}
					/>
				</div>
			</Field>
			<Field
				label="Extra rights"
				hint="Disclosure and preferences are always required."
			>
				<Checkbox
					label="opt-out"
					checked={form.optOutRight}
					onChange={(optOutRight) => update({ optOutRight })}
				/>
			</Field>
			<Field
				label="Copy revision"
				hint="Bump when the legal wording changes materially. Returning visitors are asked again."
			>
				<Input
					value={form.copyRevision}
					placeholder="2026-09"
					onChange={(event) => update({ copyRevision: event.target.value })}
				/>
			</Field>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Presentation editor
// ---------------------------------------------------------------------------

const PresentationEditor = ({
	form,
	prompt,
	onChange,
}: {
	form: PlaygroundPresentationForm;
	prompt: PolicyPrompt;
	onChange: (next: PlaygroundPresentationForm) => void;
}) => {
	const positions = positionOptionsFor(form.variant, prompt);
	const variantHint =
		form.variant === 'auto'
			? `Auto picks ${defaultVariantFor(prompt)} for a ${prompt} prompt.`
			: VARIANT_HINTS[form.variant];
	return (
		<div className="grid gap-5 sm:grid-cols-3">
			<Field
				label="Variant"
				hint={variantHint}
			>
				<Select
					testId="playground-variant"
					value={form.variant}
					onChange={(value) =>
						onChange(
							setPresentationVariant(
								form,
								value as PromptVariant | 'auto',
								prompt
							)
						)
					}
					options={[
						{ label: 'auto', value: 'auto' },
						...PROMPT_VARIANTS.map((variant) => ({
							label: variant,
							value: variant,
						})),
					]}
				/>
			</Field>
			<Field
				label="Position"
				hint={`Auto is ${defaultPositionFor(form.variant, prompt)}. Only positions the variant accepts are listed.`}
			>
				<Select
					testId="playground-position"
					value={form.position}
					onChange={(value) =>
						onChange({ ...form, position: value as PromptPosition | 'auto' })
					}
					options={[
						{ label: 'auto', value: 'auto' },
						...positions.map((position) => ({
							label: position,
							value: position,
						})),
					]}
				/>
			</Field>
			<Field
				label="Blocking"
				hint="Backdrop, scroll lock, focus trap and no outside dismissal. A wall always blocks; a notice never does."
			>
				<Checkbox
					label="Block the page"
					checked={form.blocking}
					onChange={(blocking) => onChange({ ...form, blocking })}
				/>
			</Field>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Runtime inspector (lives inside the ConsentProvider)
// ---------------------------------------------------------------------------

interface LogEntry {
	at: number;
	type: string;
	detail: string;
}

const summarizeEvent = function summarizeEvent(event: KernelEvent): string {
	switch (event.type) {
		case 'choice:recorded':
		case 'permissions:changed':
		case 'init:applied': {
			const snapshot = event.snapshot as ConsentSnapshot;
			const on = Object.entries(snapshot.effectivePermissions)
				.filter(([, value]) => value)
				.map(([name]) => name);
			return `permissions on: ${on.join(', ') || 'none'}; prompt: ${snapshot.promptRequirement.kind}`;
		}
		case 'command:save:completed':
			return event.result.ok ? 'ok' : 'rejected or failed';
		default:
			return '';
	}
};

const PROMPT_REASON_COPY: Record<string, string> = {
	expired: 'the stored record is older than the configured validity',
	missing: 'no valid record exists for this prompt',
	'policy-changed':
		'the stored record was made under a different prompt fingerprint',
};

// oxlint-disable-next-line complexity -- This inspector renders every consent-record field side by side.
const RuntimeInspector = ({
	storedRecords,
	loadedAt,
	now,
}: {
	storedRecords: StoredRecords | null;
	loadedAt: number;
	now: number;
}) => {
	const kernel = React.useContext(KernelContext);
	const services = React.useContext(ProviderServicesContext);
	const snapshot = useSnapshot();
	const { banner } = useHeadlessConsentUI();
	const [log, setLog] = React.useState<LogEntry[]>([]);

	React.useEffect(() => {
		if (!kernel) {
			return;
		}
		const unsubscribers = EVENT_TYPES.map((type) =>
			kernel.events.on(type, (event) => {
				setLog((entries) =>
					[
						{
							at: Date.now(),
							detail: summarizeEvent(event as KernelEvent),
							type: event.type,
						},
						...entries,
					].slice(0, 12)
				);
			})
		);
		return () => {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}, [kernel]);

	if (!kernel) {
		return null;
	}

	const { promptRequirement, resolution, explicitChoice } = snapshot;
	const { scope } = snapshot.policyRule;
	const storedChoice = storedRecords?.records.choice ?? null;
	const storedTimes = storedChoice
		? Object.values(storedChoice.categories).map(
				(decision) => decision.confirmedAt
			)
		: [];
	const newestStored = storedTimes.length ? Math.max(...storedTimes) : null;

	const requirementCopy =
		promptRequirement.kind === 'none'
			? 'Nothing is owed. No first-layer surface renders.'
			: `A ${promptRequirement.kind} prompt is owed because ${PROMPT_REASON_COPY[promptRequirement.reason]}.`;

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1">
					<SectionLabel>Resolution</SectionLabel>
					<p
						className="font-mono text-xs"
						data-testid="playground-resolution"
						data-model={snapshot.model}
					>
						{resolution.status}
						{resolution.status === 'matched'
							? ` · ${resolution.policyId} by ${resolution.matchedBy}`
							: ''}
						{resolution.status === 'failed' ? ` · ${resolution.reason}` : ''}
						{` · model ${snapshot.model}`}
					</p>
					{resolution.status === 'matched' ? null : (
						<p className="text-muted-foreground text-xs leading-5">
							The runtime is on the safe opt-in fallback: optional categories
							stay denied and a choice prompt is owed.
						</p>
					)}
				</div>
				<div className="space-y-1">
					<SectionLabel>Prompt requirement</SectionLabel>
					<p
						className="font-mono text-xs"
						data-testid="playground-prompt"
						data-kind={promptRequirement.kind}
					>
						{promptRequirement.kind}
						{promptRequirement.kind === 'none'
							? ''
							: ` · ${promptRequirement.reason}`}
						{` · activeUI ${snapshot.activeUI}`}
					</p>
					<p className="text-muted-foreground text-xs leading-5">
						{requirementCopy}
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<SectionLabel>Effective permissions vs explicit choice</SectionLabel>
				<table className="w-full text-left text-xs">
					<thead className="text-muted-foreground">
						<tr>
							<th className="py-1 font-medium">Category</th>
							<th className="py-1 font-medium">Effective</th>
							<th className="py-1 font-medium">Explicit choice</th>
							<th className="py-1 font-medium">Restrictions</th>
						</tr>
					</thead>
					<tbody className="font-mono">
						{scope.map((category) => {
							const decision = explicitChoice?.categories[category];
							const restrictions = snapshot.restrictions[category] ?? [];
							return (
								<tr
									key={category}
									className="border-border/60 border-t"
									data-testid={`playground-permission-${category}`}
									data-effective={
										snapshot.effectivePermissions[category] ? 'on' : 'off'
									}
									data-restrictions={restrictions.join(',')}
								>
									<td className="py-1.5">{category}</td>
									<td className="py-1.5">
										<Badge
											variant={
												snapshot.effectivePermissions[category]
													? 'default'
													: 'outline'
											}
											className="rounded-full font-normal"
										>
											{snapshot.effectivePermissions[category] ? 'on' : 'off'}
										</Badge>
									</td>
									<td className="py-1.5">
										{decision
											? `${decision.value ? 'granted' : 'denied'} ${formatAge(decision.confirmedAt, now)} (${decision.basis.kind})`
											: 'undecided'}
									</td>
									<td className="text-muted-foreground py-1.5">
										{restrictions.join(', ') || '—'}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div className="space-y-1">
					<SectionLabel>Privacy signals</SectionLabel>
					<p className="font-mono text-xs">
						GPC {snapshot.privacySignals.gpc.active ? 'active' : 'inactive'}
						{snapshot.privacySignals.gpc.override === undefined
							? ' (detected)'
							: ' (override)'}
					</p>
					<p className="font-mono text-xs">
						directives: {snapshot.optOutDirectives.length}
					</p>
				</div>
				<div className="space-y-1">
					<SectionLabel>Notice</SectionLabel>
					<p className="font-mono text-xs">
						{snapshot.noticeDismissal
							? `dismissed ${formatAge(snapshot.noticeDismissal.dismissedAt, now)}`
							: 'not dismissed'}
					</p>
				</div>
				<div className="space-y-1">
					<SectionLabel>Next deadline</SectionLabel>
					<p className="font-mono text-xs">
						{snapshot.nextDeadline
							? new Date(snapshot.nextDeadline).toISOString().slice(0, 10)
							: 'none'}
					</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1">
					<SectionLabel>Prompt surface</SectionLabel>
					<p
						className="font-mono text-xs"
						data-testid="playground-surface"
						data-variant={banner.variant}
						data-position={banner.position}
						data-position-source={banner.positionSource}
						data-blocking={banner.blocking ? 'true' : 'false'}
					>
						{banner.variant} · {banner.position} ({banner.positionSource})
						{banner.blocking ? ' · blocking' : ' · non-blocking'}
					</p>
					<p className="text-muted-foreground text-xs leading-5">
						Shape and placement come from the host, never the rule. The resolver
						fills what the host leaves out and rejects what the variant cannot
						accept.
					</p>
				</div>
				<div className="space-y-1">
					<SectionLabel>Prompt controls</SectionLabel>
					<p className="font-mono text-xs">
						{banner.orderedActions.join(', ') || 'none'}
						{banner.uncoveredRights.length > 0
							? ` · rights ${banner.uncoveredRights.join(', ')}`
							: ''}
					</p>
					<p className="text-muted-foreground text-xs leading-5">
						Actions the policy allows, plus links for rights no action covers.
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<SectionLabel>Actions</SectionLabel>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						className="rounded-full"
						data-testid="playground-accept"
						onClick={() => run(kernel.commands.save('all'))}
					>
						Accept all
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="rounded-full"
						data-testid="playground-reject"
						onClick={() => run(kernel.commands.save('none'))}
					>
						Reject all
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="rounded-full"
						data-testid="playground-save-marketing"
						onClick={() =>
							run(kernel.commands.save({ marketing: true, measurement: false }))
						}
					>
						Save marketing only
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="rounded-full"
						disabled={promptRequirement.kind !== 'notice'}
						data-testid="playground-dismiss"
						onClick={() => run(kernel.commands.dismissNotice())}
					>
						Dismiss notice
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="rounded-full"
						onClick={() => kernel.set.activeUI('banner')}
					>
						Show banner
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="rounded-full"
						onClick={() => kernel.set.activeUI('dialog')}
					>
						Open preferences
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="rounded-full"
						data-testid="playground-clear"
						onClick={() => services?.clearRecords()}
					>
						Clear stored records
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="rounded-full"
						data-testid="playground-reload"
						onClick={() => window.location.reload()}
					>
						Reload page
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				<SectionLabel>Stored records (what survives a reload)</SectionLabel>
				<p className="text-muted-foreground text-xs leading-5">
					Hydration is read-only. Reload the page and the confirmation time
					below must not move, because only an explicit accept, reject or save
					writes.
				</p>
				<p
					className="font-mono text-xs"
					data-testid="playground-stored-confirmed-at"
					data-confirmed-at={newestStored ?? ''}
				>
					{newestStored
						? `stored choice confirmed ${formatAge(newestStored, now)} · page loaded ${formatAge(loadedAt, now)}`
						: 'no stored choice'}
				</p>
				<details>
					<summary className="text-muted-foreground cursor-pointer text-xs select-none">
						Raw stored records
					</summary>
					<JsonBlock
						value={
							storedRecords
								? {
										candidates: storedRecords.candidates,
										found: storedRecords.found,
										records: storedRecords.records,
									}
								: null
						}
					/>
				</details>
			</div>

			<div className="space-y-2">
				<SectionLabel>Kernel events</SectionLabel>
				{log.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						No events yet. Hydration emits permissions, never a choice.
					</p>
				) : null}
				<ul
					className="space-y-1 font-mono text-[11px]"
					data-testid="playground-events"
				>
					{log.map((entry) => (
						<li key={`${entry.at}-${entry.type}`}>
							<span className="text-muted-foreground">
								{new Date(entry.at).toLocaleTimeString()}
							</span>{' '}
							{entry.type}
							{entry.detail ? (
								<span className="text-muted-foreground"> · {entry.detail}</span>
							) : null}
						</li>
					))}
				</ul>
			</div>

			<details>
				<summary className="text-muted-foreground cursor-pointer text-xs select-none">
					Raw snapshot
				</summary>
				<JsonBlock
					value={{
						activeUI: snapshot.activeUI,
						effectivePermissions: snapshot.effectivePermissions,
						evaluatedAt: snapshot.evaluatedAt,
						explicitChoice: snapshot.explicitChoice,
						model: snapshot.model,
						nextDeadline: snapshot.nextDeadline,
						noticeDismissal: snapshot.noticeDismissal,
						optOutDirectives: snapshot.optOutDirectives,
						overrides: snapshot.overrides,
						policyRule: snapshot.policyRule,
						privacySignals: snapshot.privacySignals,
						promptRequirement: snapshot.promptRequirement,
						resolution: snapshot.resolution,
						restrictions: snapshot.restrictions,
						subject: snapshot.subject,
					}}
				/>
			</details>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const LOCATION_SHORTCUTS = [
	{ country: 'GB', label: 'GB', region: '' },
	{ country: 'DE', label: 'DE', region: '' },
	{ country: 'US', label: 'US-CA', region: 'CA' },
	{ country: 'US', label: 'US-NY', region: 'NY' },
	{ country: 'CA', label: 'CA-QC', region: 'QC' },
	{ country: 'BR', label: 'BR', region: '' },
	{ country: '', label: 'unknown', region: '' },
];

// oxlint-disable-next-line complexity -- The page wires the editor, inspector and runtime together.
export const PolicyPlayground = () => {
	const searchParams = useSearchParams();
	const initialPreset = getPlaygroundPreset(searchParams.get('preset'));

	const [presetId, setPresetId] = React.useState<string>(initialPreset.id);
	const [form, setForm] = React.useState<PlaygroundRuleForm>(() =>
		fromPolicyRule(initialPreset.rule)
	);
	const [country, setCountry] = React.useState(initialPreset.country);
	const [region, setRegion] = React.useState(initialPreset.region ?? '');
	const [gpcOverride, setGpcOverride] = React.useState(false);
	const [presentationForm, setPresentationForm] =
		React.useState<PlaygroundPresentationForm>(DEFAULT_PRESENTATION_FORM);
	const [mounted, setMounted] = React.useState(false);
	const [loadedAt, setLoadedAt] = React.useState(0);
	const [now, setNow] = React.useState(() => Date.now());
	const [storedRecords, setStoredRecords] =
		React.useState<StoredRecords | null>(null);

	const preset = getPlaygroundPreset(presetId);
	const isDirty =
		JSON.stringify(form) !== JSON.stringify(fromPolicyRule(preset.rule));
	const rule = React.useMemo(
		() => toPolicyRule(form, preset.rule),
		[form, preset.rule]
	);
	const presentation = React.useMemo(
		() => toConsentPresentation(presentationForm),
		[presentationForm]
	);
	const inspection = React.useMemo(
		() => inspectPlaygroundRule(rule, { country, region }, presentation),
		[rule, country, region, presentation]
	);
	const snippetPreset = isDirty ? null : preset.id;

	const refreshStored = React.useCallback(() => {
		setStoredRecords(readStoredRecords(STORAGE_CONFIG, Date.now()));
		setNow(Date.now());
	}, []);

	React.useEffect(() => {
		const frame = requestAnimationFrame(() => {
			setLoadedAt(Date.now());
			setMounted(true);
			refreshStored();
		});
		const tick = setInterval(refreshStored, 1000);
		return () => {
			cancelAnimationFrame(frame);
			clearInterval(tick);
		};
	}, [refreshStored]);

	const loadPreset = function loadPreset(next: PlaygroundPreset) {
		setPresetId(next.id);
		setForm(fromPolicyRule(next.rule));
		setCountry(next.country);
		setRegion(next.region ?? '');
	};

	const overrides = React.useMemo(() => {
		const next: { country?: string; region?: string; gpc?: boolean } = {};
		if (country) {
			next.country = country.toUpperCase();
		}
		if (region) {
			next.region = region.toUpperCase();
		}
		if (gpcOverride) {
			next.gpc = true;
		}
		return next;
	}, [country, region, gpcOverride]);

	// Remount the provider whenever the rule or the simulated environment
	// changes so the kernel re-initializes from scratch, exactly like a page
	// load would. Stored records survive because they live in storage.
	const providerKey = `${JSON.stringify(rule)}|${JSON.stringify(presentation ?? null)}|${country}|${region}|${gpcOverride}`;

	const providerOptions = React.useMemo(
		() => ({
			mode: offline({ policyRules: [rule] }),
			overrides,
			presentation,
			storageConfig: STORAGE_CONFIG,
		}),
		[rule, overrides, presentation]
	);

	return (
		<main className="bg-background min-h-screen">
			<div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
				<header className="border-border/80 space-y-3 border-b pb-8">
					<p className="label-pixel text-muted-foreground">
						c15t demo / policy playground
					</p>
					<h1 className="text-3xl font-semibold tracking-[-0.04em]">
						Policy rules, resolved live
					</h1>
					<p className="text-muted-foreground max-w-3xl text-sm leading-6">
						A policy rule declares behavior only: the permission model, the
						first-layer prompt, the categories in scope, validity, and how
						Global Privacy Control maps. Load a shipped preset, edit any field,
						and watch validation, fingerprints, geo resolution and the live
						runtime update. Presentation stays on the host.
					</p>
					<p className="text-muted-foreground text-xs">
						See also the{' '}
						<Link
							href="/"
							className="underline underline-offset-4"
						>
							scenario demo
						</Link>{' '}
						and{' '}
						<Link
							href="/policy-actions"
							className="underline underline-offset-4"
						>
							policy actions
						</Link>
						.
					</p>
				</header>

				<section className="space-y-4">
					<div>
						<h2 className="text-lg font-semibold tracking-tight">
							Shipped presets
						</h2>
						<p className="text-muted-foreground text-sm">
							Starter configurations from <code>policyRulePresets</code>. Each
							carries the sources and assumptions it encodes; none is legal
							advice.
						</p>
					</div>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{playgroundPresets.map((item) => (
							<PresetCard
								key={item.id}
								preset={item}
								active={item.id === presetId && !isDirty}
								onLoad={() => loadPreset(item)}
							/>
						))}
					</div>
				</section>

				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
					<section className="space-y-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold tracking-tight">
									Rule editor
								</h2>
								<p className="text-muted-foreground text-sm">
									{isDirty
										? `Edited copy of ${preset.label}.`
										: `Untouched ${preset.label} preset.`}
								</p>
							</div>
							{isDirty ? (
								<Button
									size="sm"
									variant="ghost"
									className="rounded-full"
									onClick={() => loadPreset(preset)}
								>
									Reset to preset
								</Button>
							) : null}
						</div>
						<RuleEditor
							form={form}
							onChange={setForm}
						/>

						<div className="space-y-3">
							<div>
								<SectionLabel>Presentation</SectionLabel>
								<p className="text-muted-foreground text-xs leading-5">
									Host configuration for the prompt surface. It changes how the
									stock banner looks, never the rule or its fingerprints.
								</p>
							</div>
							<PresentationEditor
								form={presentationForm}
								prompt={form.prompt}
								onChange={setPresentationForm}
							/>
						</div>

						<div className="space-y-3">
							<SectionLabel>Simulated visitor</SectionLabel>
							<div className="flex flex-wrap items-end gap-3">
								<div className="space-y-1.5">
									<Label
										htmlFor="playground-country"
										className="text-xs"
									>
										Country
									</Label>
									<Input
										id="playground-country"
										className="w-24"
										value={country}
										onChange={(event) => setCountry(event.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label
										htmlFor="playground-region"
										className="text-xs"
									>
										Region
									</Label>
									<Input
										id="playground-region"
										className="w-24"
										value={region}
										onChange={(event) => setRegion(event.target.value)}
									/>
								</div>
								<Checkbox
									label="Browser sends GPC"
									checked={gpcOverride}
									onChange={setGpcOverride}
								/>
							</div>
							<div className="flex flex-wrap gap-2">
								{LOCATION_SHORTCUTS.map((shortcut) => (
									<Button
										key={shortcut.label}
										size="sm"
										variant="outline"
										className="rounded-full"
										onClick={() => {
											setCountry(shortcut.country);
											setRegion(shortcut.region);
										}}
									>
										{shortcut.label}
									</Button>
								))}
							</div>
						</div>

						<Tabs defaultValue="issues">
							<TabsList>
								<TabsTrigger value="issues">
									Validation
									{inspection.errors.length > 0
										? ` (${inspection.errors.length})`
										: ''}
								</TabsTrigger>
								<TabsTrigger value="resolved">Resolved rule</TabsTrigger>
								<TabsTrigger value="fingerprints">Fingerprints</TabsTrigger>
								<TabsTrigger value="resolution">Geo resolution</TabsTrigger>
							</TabsList>
							<TabsContent
								value="issues"
								className="space-y-2"
							>
								{inspection.errors.length === 0 ? (
									<p
										className="text-muted-foreground text-sm"
										data-testid="playground-valid"
									>
										The rule validates. Unknown keys, unknown categories and
										prompts the model does not allow are rejected.
									</p>
								) : null}
								{inspection.errors.map((error) => (
									<p
										key={error}
										className="text-destructive text-sm"
										data-testid="playground-error"
									>
										{error}
									</p>
								))}
								{inspection.warnings.map((warning) => (
									<p
										key={warning}
										className="text-muted-foreground text-sm"
									>
										Warning: {warning}
									</p>
								))}
								{inspection.presentationDiagnostics.map((diagnostic) => (
									<p
										key={`${diagnostic.code}-${diagnostic.message}`}
										className="text-muted-foreground text-sm"
										data-testid="playground-presentation-diagnostic"
										data-code={diagnostic.code}
									>
										Presentation ({diagnostic.code}): {diagnostic.message}
									</p>
								))}
							</TabsContent>
							<TabsContent value="resolved">
								<p className="text-muted-foreground mb-2 text-xs leading-5">
									The canonical form the wire carries and every fingerprint
									hashes. Sets are sorted, wildcards expanded, defaults filled.
								</p>
								<JsonBlock value={inspection.resolved} />
							</TabsContent>
							<TabsContent value="fingerprints">
								<p className="text-muted-foreground mb-2 text-xs leading-5">
									A stored choice is compared against the choice fingerprint; a
									notice dismissal against the notice fingerprint. A change here
									re-prompts returning visitors. Cosmetic presentation never
									affects them.
								</p>
								<JsonBlock value={inspection.fingerprints} />
							</TabsContent>
							<TabsContent value="resolution">
								<p className="text-muted-foreground mb-2 text-xs leading-5">
									What <code>offline({'{ policyRules: [rule] }'})</code> would
									resolve for the simulated visitor. A no-match or failure falls
									back to safe opt-in at runtime.
								</p>
								<JsonBlock
									value={
										inspection.resolution.status === 'matched'
											? {
													matchedBy: inspection.resolution.matchedBy,
													policyId: inspection.resolution.policyId,
													status: 'matched',
												}
											: inspection.resolution
									}
								/>
							</TabsContent>
						</Tabs>
					</section>

					<section className="space-y-4">
						<div>
							<h2 className="text-lg font-semibold tracking-tight">
								Live runtime
							</h2>
							<p className="text-muted-foreground text-sm">
								A real <code>ConsentProvider</code> in offline mode running this
								rule for the simulated visitor. The banner and dialog below are
								the stock components.
							</p>
						</div>
						<Card className="py-5">
							<CardContent className="px-5">
								{mounted ? (
									<ConsentProvider
										key={providerKey}
										options={providerOptions}
									>
										<RuntimeInspector
											storedRecords={storedRecords}
											loadedAt={loadedAt}
											now={now}
										/>
										{form.model === 'iab' ? (
											<IABProvider
												cmpId={DEMO_CMP_ID}
												vendors={DEMO_IAB_VENDOR_IDS}
												customVendors={DEMO_CUSTOM_VENDORS}
											>
												<IABConsentBanner
													trapFocus={false}
													scrollLock={false}
												/>
												<IABConsentDialog />
											</IABProvider>
										) : (
											<>
												<ConsentBanner />
												<ConsentDialog />
											</>
										)}
									</ConsentProvider>
								) : (
									<p className="text-muted-foreground text-sm">Loading…</p>
								)}
							</CardContent>
						</Card>
					</section>
				</div>

				<section className="space-y-4">
					<div>
						<h2 className="text-lg font-semibold tracking-tight">
							Use this rule
						</h2>
						<p className="text-muted-foreground text-sm">
							The same rules run client-side in offline mode or are served from
							a self-hosted backend manifest.
						</p>
					</div>
					<Tabs defaultValue="client">
						<TabsList>
							<TabsTrigger value="client">React, offline</TabsTrigger>
							<TabsTrigger value="backend">Self-hosted backend</TabsTrigger>
						</TabsList>
						<TabsContent value="client">
							<CodeBlock
								value={buildProviderSnippet(rule, snippetPreset, presentation)}
							/>
						</TabsContent>
						<TabsContent value="backend">
							<CodeBlock value={buildBackendSnippet(rule, snippetPreset)} />
						</TabsContent>
					</Tabs>
				</section>
			</div>
		</main>
	);
};
