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

export { createConsentKernel } from './kernel';
export type { HostedTransportOptions } from './transports/hosted';
export { createHostedTransport } from './transports/hosted';
export type { OfflineTransportOptions } from './transports/offline';
export { createOfflineTransport } from './transports/offline';
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
	PolicyUiMode,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
	SavePayload,
	SaveResult,
	TranslationsResponse,
	Unsubscribe,
} from './types';
