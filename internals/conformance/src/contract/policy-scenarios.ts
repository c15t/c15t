/**
 * Declarative inputs and observations for the forthcoming policy suite.
 * These are test descriptions, not a second runtime or wire schema. Drivers
 * translate them at the public adapter boundary after the kernel lands.
 */

/** Optional categories in the supported legacy category universe. */
export type PolicyCategory =
	| 'functionality'
	| 'experience'
	| 'measurement'
	| 'marketing';

/** Structural JSON counterpart of the accepted per-category receipt. */
export interface PolicyChoiceFixture {
	version: 3;
	categories: Partial<
		Record<
			PolicyCategory,
			{
				value: boolean;
				confirmedAt: number;
				basis:
					| { kind: 'choice-v1'; fingerprint: string }
					| { kind: 'legacy-v2'; materialFingerprint?: string };
			}
		>
	>;
}

/** Identity belongs to the enclosing record, never to category receipts. */
export interface PolicySubjectFixture {
	subjectId?: string;
	externalId?: string;
	identityProvider?: string;
}

/** Raw bytes and their expected structural normalization, before evaluation. */
export interface PolicyRecordFixture {
	encoding: 'legacy-json' | 'legacy-compact' | 'v3-choice-json';
	/** Unescaped value. Cookie drivers apply URI encoding exactly once. */
	raw: string;
	expected:
		| {
				valid: true;
				choice: PolicyChoiceFixture;
				subject: PolicySubjectFixture | null;
		  }
		| { valid: false };
}

/** Policy inputs expressed independently of pending public schema names. */
export interface ScenarioPolicy {
	model: 'opt-in' | 'opt-out' | 'iab';
	prompt: 'choice' | 'notice' | 'none';
	scope: readonly PolicyCategory[];
	scopeMode: 'strict' | 'permissive';
	choice: { fingerprint: string; maxAgeMs: number };
	notice: { fingerprint: string; maxAgeMs: number };
	legacyMaterialFingerprint: string;
	gpcDenyCategories: readonly PolicyCategory[];
	rights: readonly ('disclosure' | 'preferences' | 'opt-out')[];
}

/** Remaining required interaction, independent of rendered visibility. */
export type ScenarioPrompt =
	| { kind: 'none' }
	| {
			kind: 'choice' | 'notice';
			reason: 'missing' | 'expired' | 'policy-changed';
	  };

/** Semantic events. The suite maps these to the finalized kernel event names. */
export type ScenarioEvent =
	| 'choice-recorded'
	| 'permissions-changed'
	| 'notice-dismissed'
	| 'privacy-opt-out';

/** A step's observations; omitted properties impose no assertion. */
export interface PolicyObservation {
	prompt?: ScenarioPrompt;
	permissions?: Partial<Record<PolicyCategory | 'necessary', boolean>>;
	choice?: PolicyChoiceFixture | null;
	subject?: PolicySubjectFixture | null;
	resolution?: 'unconfigured' | 'matched' | 'no-match' | 'failed';
	/**
	 * Prior matched-policy values must not survive this transition. This is
	 * checked against the final state, not an intermediate null snapshot.
	 * In particular, the prior prompt is discarded and `prompt` separately
	 * asserts the newly derived fallback requirement.
	 */
	priorPolicyStateDiscarded?: readonly (
		| 'policy'
		| 'snapshotToken'
		| 'promptRequirement'
		| 'policyIab'
		| 'policyDefaults'
	)[];
	/** Counts are deltas for this step, not cumulative counts. */
	events?: Partial<Record<ScenarioEvent, number>>;
	consentCallbacks?: number;
	consentRequests?: number;
	storage?:
		| 'unchanged'
		| 'choice-v3'
		| 'notice-only'
		| 'privacy-only'
		| 'cleared';
	standingOptOut?: readonly PolicyCategory[];
	noticeDismissal?: 'absent' | 'current';
	firstLayer?: 'choice' | 'notice' | 'hidden';
	persistentRights?: readonly ('disclosure' | 'preferences' | 'opt-out')[];
	preferencesOpen?: boolean;
	/** Probe actual script, network, iframe and Consent Mode integrations. */
	gates?: {
		script: 'loaded' | 'blocked';
		network: 'allowed' | 'blocked';
		iframe: 'loaded' | 'placeholder';
		consentMode: 'granted' | 'denied';
	};
	actions?: readonly ('accept' | 'reject' | 'customize' | 'dismiss-notice')[];
	equivalentActions?: readonly ['accept', 'reject'];
	diagnostic?: 'action-prominence';
	ssr?: { promptParity: true; domParity: true; hydrationWarnings: 0 };
	iabTargetAllowed?: boolean;
	iabAuthority?: 'absent' | 'unchanged';
}

/** Operations must use real lifecycle/command paths, never snapshot setters. */
export type PolicyOperation =
	| { kind: 'hydrate' }
	/** Dispose the provider and mount a fresh instance against the existing bytes. */
	| { kind: 'reload' }
	| { kind: 'save'; values: Partial<Record<PolicyCategory, boolean>> }
	| { kind: 'accept' | 'reject' | 'save-current' | 'dismiss-notice' | 'clear' }
	| { kind: 'set-gpc'; active: boolean }
	| { kind: 'advance-time'; now: number }
	| { kind: 'apply-policy'; policy: ScenarioPolicy | null }
	| { kind: 'resolve-failure'; reason: 'transport' | 'omitted-policy' }
	| { kind: 'resolve-unconfigured' }
	| {
			kind: 'unsupported-wire';
			transport: 'hosted' | 'manifest' | 'self-hosted';
			deployment: 'cached-client' | 'mixed-version';
	  }
	| { kind: 'presentation'; layout: 'row' | 'column'; primary?: 'accept' }
	| { kind: 'open-preferences'; via: 'trigger' | 'link' }
	| { kind: 'ssr-hydrate' }
	| {
			kind: 'probe-iab';
			authority: 'valid' | 'absent';
			category: PolicyCategory;
	  };

/** Every observation is asserted after the operation has settled. */
export interface PolicyScenarioStep {
	operation: PolicyOperation;
	expect: PolicyObservation;
}

/** Data consumed by one shared suite across supported consent adapters. */
export interface PolicyScenario {
	id: string;
	covers: readonly (
		| 'A'
		| 'F1'
		| 'F2'
		| 'F3'
		| 'F4'
		| 'F5'
		| 'F6'
		| 'F7'
		| 'F8'
		| 'F9'
		| 'F10'
		| 'F11'
	)[];
	now: number;
	policy: ScenarioPolicy;
	/** Fixture IDs are resolved by the shared suite before mounting. */
	storage?: {
		cookie?: string;
		localStorage?: string;
		legacyLocalStorage?: string;
	};
	gpc?: boolean;
	/** Mount one marketing target in each gate integration when requested. */
	probeGates?: boolean;
	steps: readonly PolicyScenarioStep[];
}
