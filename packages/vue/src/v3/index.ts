/**
 * @c15t/vue/v3 — kernel-consuming Vue 3 adapter (experimental).
 *
 * Status: unstable shape validator. Exists to prove the `c15t/v3` kernel
 * contract is framework-neutral — same kernel, same invariants, no Vue-
 * specific workarounds.
 *
 * Pattern:
 *   // App.vue
 *   <script setup lang="ts">
 *   import { createConsentKernel } from 'c15t/v3';
 *   import { ConsentProvider } from '@c15t/vue/v3';
 *   const kernel = createConsentKernel();
 *   </script>
 *
 *   <template>
 *     <ConsentProvider :kernel="kernel">
 *       <MarketingScripts />
 *     </ConsentProvider>
 *   </template>
 *
 *   // MarketingScripts.vue
 *   <script setup lang="ts">
 *   import { useConsent } from '@c15t/vue/v3';
 *   const allowed = useConsent('marketing');
 *   </script>
 *
 *   <template>
 *     <GoogleTagManager v-if="allowed" />
 *   </template>
 */

// Re-export kernel types + factories so Vue consumers need only one import.
export type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	HostedTransportOptions,
	InitContext,
	InitResponse,
	InitResult,
	KernelConfig,
	KernelEvent,
	KernelOverrides,
	KernelTransport,
	KernelUser,
	Listener,
	SavePayload,
	SaveResult,
	Unsubscribe,
} from 'c15t/v3';
export {
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
} from 'c15t/v3';
export {
	useActiveUI,
	useBranding,
	useConsent,
	useConsents,
	useHasConsented,
	useIABEnabled,
	useIABSnapshot,
	useIdentify,
	useInit,
	useLocation,
	useModel,
	useOverrides,
	usePolicy,
	usePolicyBanner,
	usePolicyCategories,
	usePolicyDecision,
	usePolicyDialog,
	usePolicyScopeMode,
	usePurposeConsent,
	useSaveConsents,
	useSetConsent,
	useSetIAB,
	useSetLanguage,
	useSetOverrides,
	useSnapshot,
	useSpecialFeatureOptIn,
	useTCString,
	useTranslations,
	useUser,
	useVendorConsent,
} from './composables';
export { kernelInjectionKey } from './context';
export type {
	UseIframeBlockerOptions,
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './module-composables';
export {
	useIframeBlocker,
	useNetworkBlocker,
	usePersistence,
	useScriptLoader,
} from './module-composables';
export { ConsentProvider } from './provider';
