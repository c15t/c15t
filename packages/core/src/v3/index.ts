/**
 * c15t/v3 — experimental kernel-first consent engine
 *
 * Status: UNSTABLE. API may change. Promotes to stable at v3.0.
 *
 * Design goals:
 * - Pure construction: `createConsentKernel()` has zero side effects.
 *   No window writes, no observers, no network, no DOM.
 * - Framework-neutral contract: `getSnapshot() / subscribe() / set.* / commands.* / events`.
 *   No Zustand types leaked. Adapters own reactivity.
 * - Isomorphic-safe: imports cleanly in Node, RSC, edge runtimes.
 * - Opt-in side effects: persistence, blockers, script loader, banner fetch
 *   live in `c15t/v3/modules/*` — adapters call them inside useEffect /
 *   onMounted / onMount. Never at kernel construction.
 *
 * See:
 * - benchmarks/BASELINE.md for v2 numbers and v3 target deltas
 * - .context/plans/critique-c15t-shadow-v3-kernel-first.md for design rationale
 * - packages/core/src/__tests__/v3-correctness-gates.test.ts for invariants
 */

export {
	flattenPolicyActionGroups,
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	resolvePolicyUiProfile,
	shouldFillPolicyActions,
} from '../libs/policy-actions';
export type { CONSENT_CATEGORY, Consent } from './consent-record';
export {
	CONSENT_CATEGORIES,
	deriveActiveConsentUi,
	getConsentAvailableCategories,
	interpretStoredConsent,
} from './consent-record';
export { createConsentKernel } from './kernel';
export {
	generateSubjectId,
	isValidSubjectId,
} from './libs/generate-subject-id';
export type {
	C15tWindowDebug,
	WindowDebugHandle,
	WindowDebugMode,
	WindowDebugModeInput,
	WindowDebugOptions,
} from './modules/window-debug';
export {
	createWindowDebug,
	resolveWindowDebugMode,
} from './modules/window-debug';
export type { HostedTransportOptions } from './transports/hosted';
export { createHostedTransport } from './transports/hosted';
export {
	initOutputToKernelConfig,
	initResponseToKernelConfig,
	mapInitOutputToInitResponse,
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from './transports/init-output';
export type {
	HostedModeOptions,
	ProviderTransportContext,
	ProviderTransportFactory,
	ProviderTransportKind,
} from './transports/mode';
export { custom, hosted } from './transports/mode';
export type { OfflineTransportOptions } from './transports/offline';
export { createOfflineTransport } from './transports/offline';
export { buildSubjectPostBody } from './transports/subject-body';
export {
	C15T_VERSION_HEADER,
	c15tVersionHeaders,
} from './transports/version-header';
export type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	GlobalVendorList,
	InitContext,
	InitResponse,
	InitResult,
	KernelActiveUI,
	KernelBranding,
	KernelConfig,
	KernelEvent,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	Listener,
	LocationResponse,
	NonIABVendor,
	PolicyDecision,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
	SavePayload,
	SaveResult,
	TranslationsResponse,
	Unsubscribe,
} from './types';
