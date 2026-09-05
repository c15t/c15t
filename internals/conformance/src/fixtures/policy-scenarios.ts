import type {
	PolicyObservation,
	PolicyScenario,
	ScenarioPolicy,
} from '../contract/policy-scenarios';
import {
	CHOICE_FINGERPRINT,
	LEGACY_FINGERPRINT,
	NOTICE_FINGERPRINT,
	POLICY_EXPIRED,
	POLICY_MAX_AGE,
	POLICY_NOW,
	POLICY_RECORDS,
	POLICY_SCOPE,
	policyChoice,
} from './policy-records';
import type { PolicyRecordId } from './policy-records';

/** Semantic policy input; adapters build the real validated policy from it. */
export const POLICY_CHOICE: ScenarioPolicy = {
	choice: { fingerprint: CHOICE_FINGERPRINT, maxAgeMs: POLICY_MAX_AGE },
	gpcDenyCategories: [],
	legacyMaterialFingerprint: LEGACY_FINGERPRINT,
	model: 'opt-in',
	notice: { fingerprint: NOTICE_FINGERPRINT, maxAgeMs: POLICY_MAX_AGE },
	prompt: 'choice',
	rights: ['disclosure', 'preferences', 'opt-out'],
	scope: POLICY_SCOPE,
	scopeMode: 'strict',
};

export const POLICY_NOTICE: ScenarioPolicy = {
	...POLICY_CHOICE,
	model: 'opt-out',
	prompt: 'notice',
};

const quiet: PolicyObservation = {
	consentCallbacks: 0,
	consentRequests: 0,
	events: { 'choice-recorded': 0, 'notice-dismissed': 0 },
	storage: 'unchanged',
};
const denied = { marketing: false, measurement: false, necessary: true };
const granted = { marketing: true, measurement: true, necessary: true };
const blockedGates: PolicyObservation['gates'] = {
	consentMode: 'denied',
	iframe: 'placeholder',
	network: 'blocked',
	script: 'blocked',
};

const hydrateScenario = function hydrateScenario(
	id: string,
	record: PolicyRecordId,
	expect: PolicyObservation,
	policy = POLICY_CHOICE,
	covers: PolicyScenario['covers'] = ['A', 'F1']
): PolicyScenario {
	return {
		covers,
		id,
		now: POLICY_NOW,
		policy,
		steps: [
			{
				expect: {
					...quiet,
					subject: POLICY_RECORDS[record].expected.valid
						? POLICY_RECORDS[record].expected.subject
						: null,
					...expect,
				},
				operation: { kind: 'hydrate' },
			},
		],
		storage: { cookie: record, localStorage: record },
	};
};

const legacyHydration = (
	[
		'legacy-identified-grant',
		'legacy-anonymous-grant',
		'legacy-no-hash',
	] as const
).map((record) =>
	hydrateScenario(record, record, {
		choice: POLICY_RECORDS[record].expected.choice,
		permissions: granted,
		prompt: { kind: 'none' },
	})
);

const expiry = (['opt-in', 'opt-out'] as const).flatMap((model) => [
	hydrateScenario(
		`${model}-expired-grant`,
		'legacy-expired-mixed',
		{
			permissions: {
				marketing: model === 'opt-out',
				measurement: false,
				necessary: true,
			},
			prompt: { kind: 'choice', reason: 'expired' },
		},
		{ ...POLICY_CHOICE, model },
		['F2']
	),
	hydrateScenario(
		`${model}-expired-denial`,
		'legacy-expired-denial',
		{
			permissions: denied,
			prompt: { kind: 'none' },
		},
		{ ...POLICY_CHOICE, model },
		['F2']
	),
]);

const gpc = (
	['legacy-anonymous-grant', 'legacy-identified-grant'] as const
).map((record): PolicyScenario => ({
	covers: ['F4', 'F10'],
	gpc: true,
	id: `gpc-${record}`,
	now: POLICY_NOW,
	policy: { ...POLICY_NOTICE, gpcDenyCategories: POLICY_SCOPE },
	probeGates: true,
	steps: [
		{
			expect: {
				choice: POLICY_RECORDS[record].expected.choice,
				consentCallbacks: 0,
				consentRequests: 0,
				events: {
					'choice-recorded': 0,
					'notice-dismissed': 0,
					'privacy-opt-out': 1,
				},
				gates: blockedGates,
				permissions: denied,
				prompt: { kind: 'notice', reason: 'missing' },
				standingOptOut: POLICY_SCOPE,
				storage: 'privacy-only',
			},
			operation: { kind: 'hydrate' },
		},
		{
			expect: {
				...quiet,
				choice: POLICY_RECORDS[record].expected.choice,
				gates: blockedGates,
				permissions: denied,
				prompt: { kind: 'notice', reason: 'missing' },
				standingOptOut: POLICY_SCOPE,
			},
			operation: { active: false, kind: 'set-gpc' },
		},
		{
			expect: {
				choice: policyChoice(
					{ marketing: true, measurement: true },
					POLICY_NOW
				),
				consentCallbacks: 1,
				events: { 'choice-recorded': 1, 'notice-dismissed': 0 },
				gates: blockedGates,
				permissions: denied,
				prompt: { kind: 'notice', reason: 'missing' },
				standingOptOut: POLICY_SCOPE,
			},
			operation: { kind: 'accept' },
		},
		{
			expect: {
				choice: policyChoice(
					{ marketing: true, measurement: true },
					POLICY_NOW
				),
				consentCallbacks: 1,
				events: { 'choice-recorded': 1, 'permissions-changed': 0 },
				permissions: denied,
				prompt: { kind: 'notice', reason: 'missing' },
				standingOptOut: POLICY_SCOPE,
			},
			operation: { kind: 'save-current' },
		},
		{
			expect: {
				choice: null,
				noticeDismissal: 'absent',
				permissions: granted,
				prompt: { kind: 'notice', reason: 'missing' },
				standingOptOut: [],
				storage: 'cleared',
			},
			operation: { kind: 'clear' },
		},
	],
	storage: { cookie: record },
}));

const wire = (['hosted', 'manifest', 'self-hosted'] as const).flatMap(
	(transport) =>
		(['cached-client', 'mixed-version'] as const).map(
			(deployment): PolicyScenario => ({
				covers: ['A', 'F7'],
				id: `unsupported-${transport}-${deployment}`,
				now: POLICY_NOW,
				policy: { ...POLICY_NOTICE, prompt: 'none' },
				steps: [
					{
						expect: {
							...quiet,
							choice: null,
							permissions: denied,
							prompt: { kind: 'choice', reason: 'missing' },
							resolution: 'failed',
						},
						operation: { deployment, kind: 'unsupported-wire', transport },
					},
				],
			})
		)
);

const ssrObservations: Record<
	'legacy-no-hash' | 'legacy-expired-grant' | 'legacy-anonymous-grant',
	PolicyObservation
> = {
	'legacy-anonymous-grant': {
		firstLayer: 'notice',
		prompt: { kind: 'notice', reason: 'missing' },
	},
	'legacy-expired-grant': {
		firstLayer: 'choice',
		prompt: { kind: 'choice', reason: 'expired' },
	},
	'legacy-no-hash': { firstLayer: 'hidden', prompt: { kind: 'none' } },
};

const ssr = (
	[
		['legacy-no-hash', POLICY_CHOICE],
		['legacy-expired-grant', POLICY_CHOICE],
		['legacy-anonymous-grant', POLICY_NOTICE],
	] as const
).map(([record, policy]): PolicyScenario => ({
	covers: ['F9'],
	id: `ssr-${record}-${policy.prompt}`,
	now: POLICY_NOW,
	policy,
	steps: [
		{
			expect: {
				...quiet,
				choice: POLICY_RECORDS[record].expected.choice,
				...ssrObservations[record],
				ssr: { domParity: true, hydrationWarnings: 0, promptParity: true },
			},
			operation: { kind: 'ssr-hydrate' },
		},
	],
	storage: { cookie: record },
}));

/**
 * No F4x exception flow. Failed init keeps the existing hidden display while
 * permission fallback and resolution status remain independently asserted.
 */
export const POLICY_SCENARIOS: readonly PolicyScenario[] = [
	{
		covers: ['F1', 'F10'],
		id: 'accept-persist-reload',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{
				expect: {
					...quiet,
					choice: null,
					firstLayer: 'choice',
					permissions: denied,
					prompt: { kind: 'choice', reason: 'missing' },
				},
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					choice: policyChoice(
						{ marketing: true, measurement: true },
						POLICY_NOW
					),
					consentCallbacks: 1,
					firstLayer: 'hidden',
					permissions: granted,
					prompt: { kind: 'none' },
					storage: 'choice-v3',
				},
				operation: { kind: 'accept' },
			},
			{
				expect: {
					...quiet,
					choice: policyChoice(
						{ marketing: true, measurement: true },
						POLICY_NOW
					),
					firstLayer: 'hidden',
					permissions: granted,
					prompt: { kind: 'none' },
				},
				operation: { kind: 'reload' },
			},
		],
	},
	...(['opt-in', 'opt-out'] as const).map((model): PolicyScenario => ({
		covers: ['F4'],
		gpc: true,
		id: `gpc-prechoice-${model}`,
		now: POLICY_NOW,
		policy: { ...POLICY_CHOICE, gpcDenyCategories: POLICY_SCOPE, model },
		steps: [
			{
				expect: {
					choice: null,
					consentCallbacks: 0,
					consentRequests: 0,
					events: { 'choice-recorded': 0, 'privacy-opt-out': 1 },
					permissions: denied,
					standingOptOut: POLICY_SCOPE,
					storage: 'privacy-only',
				},
				operation: { kind: 'hydrate' },
			},
		],
	})),
	...legacyHydration,
	...expiry,
	hydrateScenario('json-absence-is-undecided', 'legacy-partial-json', {
		choice: POLICY_RECORDS['legacy-partial-json'].expected.choice,
		permissions: { marketing: true, measurement: false },
		prompt: { kind: 'choice', reason: 'missing' },
	}),
	hydrateScenario('compact-absence-is-denial', 'legacy-compact-omitted-false', {
		choice: POLICY_RECORDS['legacy-compact-omitted-false'].expected.choice,
		permissions: { marketing: true, measurement: false },
		prompt: { kind: 'none' },
	}),
	hydrateScenario(
		'known-material-mismatch',
		'legacy-material-mismatch',
		{
			permissions: denied,
			prompt: { kind: 'choice', reason: 'policy-changed' },
		},
		POLICY_CHOICE,
		['F3']
	),
	{
		covers: ['A', 'F3'],
		id: 'cosmetic-change-keeps-choice',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{
				expect: { ...quiet, prompt: { kind: 'none' } },
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					...quiet,
					choice: POLICY_RECORDS['v3-grant'].expected.choice,
					permissions: granted,
					prompt: { kind: 'none' },
				},
				operation: { kind: 'presentation', layout: 'column' },
			},
		],
		storage: { cookie: 'v3-grant' },
	},
	{
		covers: ['A', 'F2', 'F10'],
		id: 'partial-save-renews-only-confirmed-keys',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{
				expect: {
					...quiet,
					permissions: { marketing: false, measurement: true },
					prompt: { kind: 'choice', reason: 'expired' },
				},
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					choice: {
						categories: {
							...policyChoice({ marketing: true }, POLICY_EXPIRED).categories,
							...policyChoice({ measurement: true }, POLICY_NOW).categories,
						},
						version: 3,
					},
					consentCallbacks: 1,
					events: { 'choice-recorded': 1, 'permissions-changed': 0 },
					prompt: { kind: 'choice', reason: 'expired' },
					storage: 'choice-v3',
				},
				operation: { kind: 'save', values: { measurement: true } },
			},
			{
				expect: { ...quiet, prompt: { kind: 'choice', reason: 'expired' } },
				operation: { kind: 'save', values: {} },
			},
		],
		storage: { cookie: 'v3-independent-times' },
	},
	{
		covers: ['A', 'F1'],
		id: 'next-save-preserves-unconfirmed-legacy-basis',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{
				expect: { ...quiet, prompt: { kind: 'none' } },
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					choice: {
						categories: {
							...POLICY_RECORDS['legacy-no-hash'].expected.choice.categories,
							...policyChoice({ marketing: false }, POLICY_NOW).categories,
						},
						version: 3,
					},
					consentCallbacks: 1,
					permissions: { marketing: false, measurement: true },
					prompt: { kind: 'none' },
					storage: 'choice-v3',
				},
				operation: { kind: 'save', values: { marketing: false } },
			},
		],
		storage: { cookie: 'legacy-no-hash' },
	},
	...gpc,
	{
		covers: ['F4', 'F10'],
		gpc: true,
		id: 'gpc-broad-scope-retains-unmapped-grants',
		now: POLICY_NOW,
		policy: {
			...POLICY_NOTICE,
			gpcDenyCategories: POLICY_SCOPE,
			scope: ['experience', 'functionality', ...POLICY_SCOPE],
		},
		steps: [
			{
				expect: {
					choice: POLICY_RECORDS['legacy-broad-grant'].expected.choice,
					consentCallbacks: 0,
					consentRequests: 0,
					events: {
						'choice-recorded': 0,
						'notice-dismissed': 0,
						'privacy-opt-out': 1,
					},
					permissions: { experience: true, functionality: true, ...denied },
					standingOptOut: POLICY_SCOPE,
					storage: 'privacy-only',
				},
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					...quiet,
					choice: POLICY_RECORDS['legacy-broad-grant'].expected.choice,
					permissions: { experience: true, functionality: true, ...denied },
					standingOptOut: POLICY_SCOPE,
				},
				operation: { active: false, kind: 'set-gpc' },
			},
		],
		storage: { cookie: 'legacy-broad-grant' },
	},
	{
		covers: ['F5', 'F10'],
		id: 'notice-save-dismiss-expire-clear',
		now: POLICY_NOW,
		policy: POLICY_NOTICE,
		steps: [
			{
				expect: {
					...quiet,
					actions: ['dismiss-notice'],
					choice: null,
					firstLayer: 'notice',
					noticeDismissal: 'absent',
					permissions: granted,
					prompt: { kind: 'notice', reason: 'missing' },
				},
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					choice: policyChoice({ marketing: false }, POLICY_NOW),
					consentCallbacks: 1,
					events: {
						'choice-recorded': 1,
						'notice-dismissed': 0,
						'permissions-changed': 1,
					},
					firstLayer: 'notice',
					noticeDismissal: 'absent',
					permissions: { marketing: false, measurement: true },
					prompt: { kind: 'notice', reason: 'missing' },
					storage: 'choice-v3',
				},
				operation: { kind: 'save', values: { marketing: false } },
			},
			{
				expect: {
					choice: policyChoice({ marketing: false }, POLICY_NOW),
					consentCallbacks: 0,
					consentRequests: 0,
					events: {
						'choice-recorded': 0,
						'notice-dismissed': 1,
						'permissions-changed': 0,
					},
					noticeDismissal: 'current',
					permissions: { marketing: false, measurement: true },
					prompt: { kind: 'none' },
					storage: 'notice-only',
				},
				operation: { kind: 'dismiss-notice' },
			},
			{
				expect: {
					...quiet,
					permissions: { marketing: false, measurement: true },
					prompt: { kind: 'notice', reason: 'expired' },
				},
				operation: { kind: 'advance-time', now: POLICY_NOW + POLICY_MAX_AGE },
			},
			{
				expect: {
					choice: null,
					noticeDismissal: 'absent',
					permissions: granted,
					prompt: { kind: 'notice', reason: 'missing' },
					standingOptOut: [],
					storage: 'cleared',
				},
				operation: { kind: 'clear' },
			},
		],
	},
	...(['trigger', 'link'] as const).map((via): PolicyScenario => ({
		covers: ['F6'],
		id: `persistent-rights-${via}`,
		now: POLICY_NOW,
		policy: { ...POLICY_NOTICE, prompt: 'none' },
		steps: [
			{
				expect: {
					...quiet,
					choice: null,
					firstLayer: 'hidden',
					permissions: granted,
					persistentRights: POLICY_NOTICE.rights,
					prompt: { kind: 'none' },
				},
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					...quiet,
					persistentRights: POLICY_NOTICE.rights,
					preferencesOpen: true,
				},
				operation: { kind: 'open-preferences', via },
			},
		],
	})),
	{
		covers: ['A', 'F7'],
		id: 'null-clears-matched-policy',
		now: POLICY_NOW,
		policy: { ...POLICY_NOTICE, prompt: 'none' },
		steps: [
			{
				expect: { permissions: granted, resolution: 'matched' },
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					...quiet,
					permissions: denied,
					priorPolicyStateDiscarded: [
						'policy',
						'snapshotToken',
						'promptRequirement',
						'policyIab',
						'policyDefaults',
					],
					prompt: { kind: 'choice', reason: 'missing' },
					resolution: 'no-match',
				},
				operation: { kind: 'apply-policy', policy: null },
			},
		],
	},
	{
		covers: ['A', 'F7', 'F11'],
		id: 'null-clears-matched-iab',
		now: POLICY_NOW,
		policy: { ...POLICY_CHOICE, model: 'iab' },
		steps: [
			{ expect: { resolution: 'matched' }, operation: { kind: 'hydrate' } },
			{
				expect: {
					...quiet,
					permissions: denied,
					priorPolicyStateDiscarded: [
						'policy',
						'snapshotToken',
						'promptRequirement',
						'policyIab',
						'policyDefaults',
					],
					prompt: { kind: 'choice', reason: 'missing' },
					resolution: 'no-match',
				},
				operation: { kind: 'apply-policy', policy: null },
			},
		],
	},
	...(['transport', 'omitted-policy'] as const).map(
		(reason): PolicyScenario => ({
			covers: ['A', 'F7'],
			id: `failed-resolution-${reason}`,
			now: POLICY_NOW,
			policy: POLICY_CHOICE,
			steps: [
				{
					expect: {
						...quiet,
						firstLayer: 'hidden',
						permissions: denied,
						prompt: { kind: 'choice', reason: 'missing' },
						resolution: 'failed',
					},
					operation: { kind: 'resolve-failure', reason },
				},
			],
		})
	),
	{
		covers: ['A', 'F7'],
		id: 'unconfigured-is-distinct',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{
				expect: {
					...quiet,
					permissions: denied,
					prompt: { kind: 'choice', reason: 'missing' },
					resolution: 'unconfigured',
				},
				operation: { kind: 'resolve-unconfigured' },
			},
		],
	},
	...wire,
	{
		covers: ['A', 'F8'],
		id: 'accept-reject-equivalent-depth',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{
				expect: {
					actions: ['accept', 'reject', 'customize'],
					equivalentActions: ['accept', 'reject'],
				},
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					diagnostic: 'action-prominence',
				},
				operation: {
					kind: 'presentation',
					layout: 'column',
					primary: 'accept',
				},
			},
		],
	},
	...ssr,
	{
		covers: ['F10'],
		id: 'accept-event-separation',
		now: POLICY_NOW,
		policy: POLICY_CHOICE,
		steps: [
			{ expect: { ...quiet, choice: null }, operation: { kind: 'hydrate' } },
			{
				expect: {
					choice: policyChoice(
						{ marketing: true, measurement: true },
						POLICY_NOW
					),
					consentCallbacks: 1,
					events: {
						'choice-recorded': 1,
						'notice-dismissed': 0,
						'permissions-changed': 1,
					},
					permissions: granted,
					prompt: { kind: 'none' },
				},
				operation: { kind: 'accept' },
			},
		],
	},
	{
		covers: ['F11'],
		id: 'iab-authority-needs-no-category-grant',
		now: POLICY_NOW,
		policy: { ...POLICY_CHOICE, model: 'iab' },
		steps: [
			{
				expect: { ...quiet, choice: null, permissions: denied },
				operation: { kind: 'hydrate' },
			},
			{
				expect: {
					choice: null,
					iabTargetAllowed: true,
				},
				operation: {
					authority: 'valid',
					category: 'marketing',
					kind: 'probe-iab',
				},
			},
			{
				expect: { iabAuthority: 'unchanged', permissions: denied },
				operation: { kind: 'reject' },
			},
			{
				expect: {
					iabTargetAllowed: false,
				},
				operation: {
					authority: 'valid',
					category: 'marketing',
					kind: 'probe-iab',
				},
			},
		],
	},
	{
		covers: ['F11'],
		id: 'category-save-cannot-create-iab-authority',
		now: POLICY_NOW,
		policy: { ...POLICY_CHOICE, model: 'iab' },
		steps: [
			{ expect: { iabAuthority: 'absent' }, operation: { kind: 'accept' } },
			{
				expect: {
					iabTargetAllowed: false,
				},
				operation: {
					authority: 'absent',
					category: 'marketing',
					kind: 'probe-iab',
				},
			},
		],
	},
	{
		covers: ['F4', 'F11'],
		gpc: true,
		id: 'iab-gpc-restriction-survives-authority',
		now: POLICY_NOW,
		policy: { ...POLICY_CHOICE, gpcDenyCategories: POLICY_SCOPE, model: 'iab' },
		steps: [
			{
				expect: {
					choice: null,
					iabTargetAllowed: false,
					permissions: denied,
				},
				operation: {
					authority: 'valid',
					category: 'marketing',
					kind: 'probe-iab',
				},
			},
		],
	},
	{
		...hydrateScenario(
			'invalid-cookie-falls-through',
			'legacy-identified-grant',
			{
				permissions: granted,
				prompt: { kind: 'none' },
			}
		),
		storage: {
			cookie: 'invalid-json',
			localStorage: 'legacy-identified-grant',
		},
	},
	{
		...hydrateScenario(
			'expired-cookie-must-not-resurrect-local-grant',
			'legacy-expired-grant',
			{
				permissions: denied,
				prompt: { kind: 'choice', reason: 'expired' },
			},
			POLICY_CHOICE,
			['F1', 'F2']
		),
		storage: {
			cookie: 'legacy-expired-grant',
			localStorage: 'legacy-identified-grant',
		},
	},
];
