/**
 * Bridging the page runtime into the `@c15t/svelte` provider.
 *
 * The dialog islands render `@c15t/svelte` components, but the kernel is
 * owned by the page runtime, not by the provider. Once
 * `ConsentManagerProvider` accepts a `runtime` prop (the contract being
 * added alongside `createConsentRuntime` in `@c15t/core/runtime`) that is
 * all this needs to pass.
 *
 * Until then it also passes an interim bridge: the provider is seeded from
 * the runtime's current snapshot, its persistence and script loader are
 * switched off so the page runtime stays the only writer, and its saves are
 * routed back through the runtime's kernel. A provider that understands
 * `runtime` ignores every one of those props, so the bridge disappears on
 * its own.
 */

import { custom } from '@c15t/core';
import type {
	ConsentKernel,
	KernelConfig,
	ProviderTransportFactory,
} from '@c15t/core';

import type { ConsentRuntime } from '../runtime';
import type { C15tResolvedOptions } from '../types';

/**
 * Snapshot the runtime's kernel back into a `KernelConfig`.
 *
 * @param kernel - The page runtime's kernel.
 * @returns A config that reproduces the current state.
 */
export const kernelToConfig = function kernelToConfig(
	kernel: ConsentKernel
): KernelConfig {
	const snapshot = kernel.getSnapshot();
	return {
		initialBranding: snapshot.branding ?? undefined,
		initialConsents: { ...snapshot.consents },
		initialHasConsented: snapshot.hasConsented,
		initialIab: snapshot.iab ? { ...snapshot.iab } : undefined,
		initialLocation: snapshot.location ?? undefined,
		initialOverrides: { ...snapshot.overrides },
		initialPolicy: snapshot.policy ?? undefined,
		initialPolicyDecision: snapshot.policyDecision ?? undefined,
		initialPolicySnapshotToken: snapshot.policySnapshotToken ?? undefined,
		initialSubjectId: snapshot.subjectId ?? undefined,
		initialTranslations: snapshot.translations ?? undefined,
		initialUser: snapshot.user ?? undefined,
	};
};

/**
 * A transport that forwards the provider's writes into the page runtime.
 *
 * @param runtime - The page runtime.
 * @returns A transport factory for the provider's `mode` option.
 */
export const createBridgeMode = function createBridgeMode(
	runtime: ConsentRuntime
): ProviderTransportFactory {
	return custom({
		async identifyUser(request) {
			const body = request?.body;
			if (body) {
				await runtime.kernel.commands.identify(body);
			}
			return { ok: true };
		},
		// The provider already holds the resolved policy through `prefetch`;
		// re-running init here would race the page runtime's own init.
		init() {
			return Promise.resolve({ data: {}, ok: true });
		},
		async setConsent(request) {
			const body = request?.body as { preferences?: Record<string, boolean> };
			const result = await runtime.kernel.commands.save(
				body?.preferences as never
			);
			return { data: { subjectId: result.subjectId }, ok: result.ok };
		},
	});
};

/** Props handed to `ConsentManagerProvider` by the Svelte dialog surface. */
export interface BridgedProviderProps {
	runtime: ConsentRuntime;
	mode: ProviderTransportFactory;
	prefetch: KernelConfig;
	persistence: false;
	consentCategories?: C15tResolvedOptions['consentCategories'];
	legalLinks?: C15tResolvedOptions['legalLinks'];
	theme?: C15tResolvedOptions['theme'];
	iab?: unknown;
}

/**
 * Build the provider props for a dialog island.
 *
 * @param runtime - The page runtime that owns the kernel.
 * @param options - The resolved integration options.
 * @returns Props for `ConsentManagerProvider`.
 */
export const buildProviderProps = function buildProviderProps(
	runtime: ConsentRuntime,
	options: C15tResolvedOptions
): BridgedProviderProps {
	return {
		consentCategories: options.consentCategories,
		iab: options.iab === false ? false : options.iab,
		legalLinks: options.legalLinks,
		mode: createBridgeMode(runtime),
		persistence: false,
		prefetch: kernelToConfig(runtime.kernel),
		runtime,
		theme: options.theme,
	};
};
