import type {
	PolicyCategory,
	PolicyChoiceFixture,
	PolicyOperation,
	PolicySubjectFixture,
	ScenarioPolicy,
	ScenarioPrompt,
} from './policy-scenarios';

/** Raw input only. Never pass a fixture's expected normalization to a driver. */
export interface PolicyStorageSeed {
	encoding: 'legacy-json' | 'legacy-compact' | 'v3-choice-json';
	raw: string;
}

/** All clocks, including SSR, persistence and action timestamps, use this clock. */
export interface PolicyClock {
	now: () => number;
}

/** Creation seeds storage and installs spies before any provider is mounted. */
export interface PolicySessionSetup {
	clock: PolicyClock;
	policy: ScenarioPolicy;
	storage: Partial<
		Record<'cookie' | 'localStorage' | 'legacyLocalStorage', PolicyStorageSeed>
	>;
	gpc: boolean;
	probeGates: boolean;
}

/** Unescaped cookie values, captured without decoding or rewriting records. */
export interface PolicyStorageBytes {
	choice: { cookie: string | null; localStorage: string | null };
	notice: { cookie: string | null; localStorage: string | null };
	privacy: { cookie: string | null; localStorage: string | null };
	legacyLocalStorage: string | null;
}

/** Cumulative logs, copied on observation so later events cannot mutate them. */
export interface PolicyLogs {
	events: readonly { name: string; payload: unknown }[];
	/** Invocations of onChoiceRecorded registered through public provider config. */
	callbacks: readonly { name: string; payload: unknown }[];
	/** Consent saves and privacy requests must remain distinct. */
	requests: readonly {
		kind: 'consent' | 'privacy' | 'init';
		payload: unknown;
	}[];
	diagnostics: readonly string[];
}

/** Confirmed TC authority, separate from editable IAB maps and draft TC strings. */
export interface PolicyIabAuthority {
	tcString: string;
	confirmedAt: number;
	expiresAt: number;
	choiceFingerprint: string;
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests: Record<string, boolean>;
	purposeConsents: Record<number, boolean>;
	purposeLegitimateInterests: Record<number, boolean>;
	specialFeatureOptIns: Record<number, boolean>;
}

/** Direct public snapshot fields. No expected-result flags or evaluator here. */
export interface PolicySnapshotEvidence {
	explicitChoice: PolicyChoiceFixture | null;
	subject: PolicySubjectFixture | null;
	effectivePermissions: Record<PolicyCategory | 'necessary', boolean>;
	promptRequirement: ScenarioPrompt;
	noticeDismissal: {
		version: 1;
		dismissedAt: number;
		fingerprint: string;
	} | null;
	optOutDirectives: readonly {
		source: 'gpc';
		categories: readonly PolicyCategory[];
		recordedAt: number;
	}[];
	privacySignals: {
		gpc: { detected: boolean; active: boolean; override?: boolean };
	};
	resolution: {
		status: 'unconfigured' | 'matched' | 'no-match' | 'failed';
		policy: unknown;
	};
	policySnapshotToken: unknown;
	policyRule: { model: string; prompt: string };
	iab: {
		enabled: boolean;
		tcString?: string | null;
		authority?: PolicyIabAuthority | null;
	} | null;
	evaluatedAt: number;
}

export type PolicyAction = 'accept' | 'reject' | 'customize' | 'dismiss-notice';

/** Measurements from rendered controls, including portal content. */
export interface PolicyDomEvidence {
	firstLayer: 'choice' | 'notice' | 'hidden';
	preferencesOpen: boolean;
	rights: readonly ('disclosure' | 'preferences' | 'opt-out')[];
	actions: readonly {
		action: PolicyAction;
		visible: boolean;
		interactionDepth: number;
		/** Actual common footer group identifier or DOM path. */
		group: string;
		/** Computed visual treatment, not the configured primaryButton value. */
		prominence: string;
	}[];
}

/** Probe real registered targets. Never infer these results from permissions. */
export interface PolicyGateEvidence {
	scriptLoads: number;
	/** Actual probe script presence after reconciliation, independent of load history. */
	scriptAttached: boolean;
	/** Attempt a fresh probe request after each operation; counters are cumulative. */
	networkAttempts: number;
	networkCompletions: number;
	iframeSrc: string | null;
	iframePlaceholderVisible: boolean;
	/** Latest actual Consent Mode update received by the gtag/dataLayer spy. */
	consentMode: Record<string, string>;
}

export interface PolicySsrRenderEvidence {
	prompt: ScenarioPrompt;
	/** Same normalization on the actual server HTML and hydrated client DOM. */
	dom: string;
	firstLayer: PolicyDomEvidence['firstLayer'];
	now: number;
}

/** SSR means hydrating this server HTML, never two unrelated fresh renders. */
export interface PolicySsrEvidence {
	server: PolicySsrRenderEvidence;
	client: PolicySsrRenderEvidence;
	hydrationWarnings: readonly string[];
	/** Capture server paint and every observed client first-layer transition. */
	firstLayerHistory: readonly PolicyDomEvidence['firstLayer'][];
}

export interface PolicyEvidence {
	snapshot: PolicySnapshotEvidence;
	storage: PolicyStorageBytes;
	logs: PolicyLogs;
	dom: PolicyDomEvidence;
	gates?: PolicyGateEvidence;
	ssr?: PolicySsrEvidence;
	iabTargetAllowed?: boolean;
}

/**
 * The first operation starts the real provider lifecycle. hydrate observes that
 * initial hydration once. ssr-hydrate must instead hydrate actual server HTML.
 * All actions use public commands or user clicks; UI accept/reject, notice and
 * preferences flows must click rendered controls. An empty or partial save uses
 * the public command with exactly the supplied keys. Never write snapshots.
 * A failed creation must release its own resources; the suite always disposes
 * a returned session, including when execution or an assertion fails.
 */
export interface PolicySession {
	readonly baseline: { storage: PolicyStorageBytes; logs: PolicyLogs };
	execute: (operation: PolicyOperation) => Promise<void>;
	observe: () => PolicyEvidence | Promise<PolicyEvidence>;
	dispose: () => void | Promise<void>;
}

/** Implemented by each supported adapter, never by the shared suite. */
export type CreatePolicySession = (
	setup: PolicySessionSetup
) => Promise<PolicySession>;

/** Accepted authored fields plus presentation/runtime diagnostic inputs. */
export interface PolicyFingerprintMutation {
	layout?: 'row' | 'column';
	actionOrder?: readonly string[];
	promptReason?: string;
	scopeOrder?: readonly PolicyCategory[];
	copyRevision?: string;
	gpcDenyCategories?: readonly PolicyCategory[];
	validity?: { choiceDays?: number; noticeDays?: number };
}

/** Producer/codec inputs contain no expected validity, hashes or decoded choice. */
export type PolicyContractInput =
	| {
			kind: 'validate';
			model: string;
			prompt: string;
			gpcDenyCategories?: readonly string[];
	  }
	| { kind: 'canonicalize'; field: string; values: readonly string[] }
	| { kind: 'fingerprints'; mutation: PolicyFingerprintMutation }
	| { kind: 'detect-gpc'; source: 'navigator' | 'header'; value: unknown }
	| { kind: 'decode'; record: PolicyStorageSeed; now: number };

export interface PolicyContractEvidence {
	valid?: boolean;
	canonical?: readonly string[];
	fingerprints?: Record<
		'policy' | 'choice' | 'notice' | 'presentation',
		string
	>;
	/** Actual outputs of the public choice/notice fingerprint input builders. */
	fingerprintInputs?: {
		choice: { domain: string; version: number };
		notice: { domain: string; version: number };
	};
	detected?: boolean;
	decoded?: {
		choice: PolicyChoiceFixture;
		subject: PolicySubjectFixture | null;
	} | null;
}

/** Calls public schema producers, signal readers and storage codecs directly. */
export type ProbePolicyContract = (
	input: PolicyContractInput
) => PolicyContractEvidence | Promise<PolicyContractEvidence>;
