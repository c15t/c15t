/**
 * How a runtime turns its options into a consent kernel.
 *
 * Construction only: no DOM, no storage, no network. A server builds the
 * same kernel a browser runtime would and serializes its snapshot, so every
 * rule here (vendor merging, inferred categories, the disabled policy, the
 * experiment seed) applies identically on both sides.
 *
 */
import { deepMergeTranslations } from '@c15t/translations';
import type { I18nConfig } from '@c15t/translations';

import type { AllConsentNames } from '../consent/consent-types';
import { createKernel } from '../kernel';
import type { InternalKernel } from '../kernel/internals';
import { hostExperiment, seedExperiment } from '../libs/experiment';
import { extractConsentNamesFromCondition } from '../libs/has';
import { isProductionBuild } from '../libs/is-production';
import { resolveVendors } from '../libs/vendors';
import type { User } from '../options/user';
import { disabledPolicyResolution } from '../policy';
import {
	defaultTranslationConfig,
	resolveLocalTranslations,
} from '../translations';
import type { ProviderTransportContext } from '../transports/mode';
import type {
	KernelConfig,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	ResolvedVendor,
	TranslationsResponse,
} from '../types';
import { isIABConfigured } from './iab-options';
import type { ConsentRuntimeOptions } from './types';

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

/**
 * Normalizes the two accepted subject shapes into the kernel's `KernelUser`.
 *
 * v2 callers pass `{ id, identityProvider }`; v3 callers pass
 * `{ externalId, identityProvider }`.
 *
 * @param user - The configured subject, if any.
 * @returns The kernel-shaped user, or `undefined` when none was supplied.
 */
export const normalizeKernelUser = function normalizeKernelUser(
	user: User | KernelUser | undefined
): KernelUser | undefined {
	if (!user) {
		return undefined;
	}
	if ('externalId' in user) {
		return user;
	}
	const legacy = user as User;
	return {
		externalId: legacy.id,
		identityProvider: legacy.identityProvider,
	};
};

/**
 * Resolves `i18n` into the kernel's initial translations.
 *
 * The selected locale's bundled translations are the base; the caller's
 * `messages` for that locale are merged over them, so a partial override
 * keeps every default it did not mention. A locale on its own selects the
 * bundled translations for that locale — `i18n` is documented as locale
 * *and* message overrides, and a caller who names a locale means it.
 *
 * @param i18n - Locale and message overrides, if any.
 * @returns Kernel translations, or `undefined` when `i18n` says nothing.
 */
export const resolveRuntimeTranslations = function resolveRuntimeTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!(i18n?.messages || i18n?.locale)) {
		return undefined;
	}
	const language =
		i18n.locale ?? defaultTranslationConfig.defaultLanguage ?? 'en';
	const fallbackTranslations = defaultTranslationConfig.translations
		.en as TranslationsResponse;
	const base = (defaultTranslationConfig.translations[
		language as keyof typeof defaultTranslationConfig.translations
	] ?? fallbackTranslations) as TranslationsResponse;
	if (!i18n.messages) {
		return { language, translations: base };
	}
	const selected =
		i18n.messages[language] ?? i18n.messages.en ?? fallbackTranslations;
	return {
		language,
		translations: deepMergeTranslations(
			base as never,
			selected as never
		) as TranslationsResponse,
	};
};

/**
 * Whether a prefetch already carries a server-resolved policy.
 *
 * A resolved prefetch is what `/init` would have returned: the policy, the
 * decision that produced it, and no provisional marker. The kernel is
 * built from it, so calling `init()` again on `start()` would re-fetch the
 * same answer and cost every SSR page one request. Frameworks that render
 * with a prefetch (SvelteKit `loadConsent`, the Astro middleware, Nuxt)
 * therefore skip the initial call; `reinit()`, a language or override
 * change, and any app without a prefetch still go to the backend.
 *
 * @param prefetch - The runtime's `prefetch` option, if any.
 * @returns `true` when init would be redundant.
 */
export const hasResolvedPrefetch = function hasResolvedPrefetch(
	prefetch: KernelConfig | undefined
): boolean {
	return Boolean(
		prefetch?.initialPolicyResolution && prefetch.initialPolicyPending !== true
	);
};

const warnInDevelopment = function warnInDevelopment(
	...message: unknown[]
): void {
	if (!isProductionBuild()) {
		console.warn(...message);
	}
};

/**
 * The API the app passed its options to, named from the runtime's `pkg`:
 * the component or function a developer would look for in their code.
 */
const runtimeOwner = function runtimeOwner(pkg: string): string {
	if (pkg === '@c15t/core') {
		return 'createConsentRuntime()';
	}
	if (pkg.startsWith('@c15t/browser')) {
		return 'init()';
	}
	if (pkg === '@c15t/vue') {
		return 'the c15tVue plugin';
	}
	return pkg === '@c15t/nextjs' || pkg === '@c15t/tanstack-start'
		? 'ConsentRoot'
		: 'ConsentProvider';
};

const requireTransportFactory = function requireTransportFactory(
	options: Pick<ConsentRuntimeOptions, 'mode' | 'pkg'>
) {
	if (typeof options.mode !== 'function') {
		const pkg = options.pkg ?? '@c15t/core';
		throw new Error(
			`${pkg} ${runtimeOwner(pkg)}: \`mode\` is required. Use manifest(), hosted(), offline() or custom().`
		);
	}
	return options.mode;
};

/**
 * Categories a site declares through what it runs: its gated scripts, its
 * network blocker rules and its declared vendors.
 *
 * The runtime registers these with its kernel. A server that builds its own
 * kernel for the same page passes the same result as
 * `inferredConsentCategories`, so it asks about the same categories as the
 * browser and judges a returning visitor's stored choice the same way.
 *
 * @param options - The scripts and network blocker the page declares.
 * @param vendors - Vendors the page declares, from code or a prefetch.
 * @returns Every category those declarations name, possibly repeated.
 */
export const inferConsentCategories = function inferConsentCategories(
	options: Pick<ConsentRuntimeOptions, 'networkBlocker' | 'scripts'>,
	vendors: readonly Pick<ResolvedVendor, 'category'>[] = []
): AllConsentNames[] {
	return [
		...(options.scripts ?? []),
		...(options.networkBlocker ? (options.networkBlocker.rules ?? []) : []),
		...vendors,
	].flatMap((declaration) =>
		extractConsentNamesFromCondition(declaration.category)
	);
};

/**
 * Builds the runtime's kernel without touching the DOM.
 *
 * Exported so servers can construct the same kernel a browser runtime
 * would and serialize its snapshot.
 *
 * @param options - The runtime options.
 * @param wrapTransport - Wraps the transport `mode` builds before the kernel
 *   gets it. The browser runtime adds its consent journey this way.
 * @returns A fresh, unstarted consent kernel.
 * @throws {Error} When `mode` is not a transport factory.
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const createRuntimeKernel = function createRuntimeKernel(
	options: ConsentRuntimeOptions,
	wrapTransport?: (transport: KernelTransport) => KernelTransport
): InternalKernel {
	const enabled = options.enabled ?? true;
	// The server's experiment and journey are runtime inputs, not kernel
	// configuration.
	const {
		experiment: serverExperiment,
		journey: _serverJourney,
		...prefetch
	} = options.prefetch ?? {};
	const i18nTranslations =
		resolveRuntimeTranslations(options.i18n) ?? DEFAULT_TRANSLATIONS;

	const transportContext: ProviderTransportContext = {
		consentCategories: options.consentCategories,
		iabEnabled: isIABConfigured(options.iab),
		policyRules: options.policyRules,
		prefetch,
		translations: i18nTranslations,
		translationsFor: (language) =>
			resolveLocalTranslations(language, options.i18n?.messages),
	};
	const built = requireTransportFactory(options)(transportContext);
	const transport = wrapTransport ? wrapTransport(built) : built;

	const integrations = [
		...(options.scripts ?? []),
		...(options.networkBlocker ? (options.networkBlocker.rules ?? []) : []),
	];
	// Backend vendors a server prefetch already resolved are kept: a resolved
	// prefetch skips the initial `init()`, so nothing would merge them later.
	const declaredVendors = resolveVendors({
		config: options.vendors,
		existing: prefetch.initialVendors?.declared,
		onWarn: warnInDevelopment,
		owners: integrations,
	});
	const vendorListVersion = prefetch.initialVendors?.listVersion ?? null;
	// A prefetched or host-resolved arm is known before any render, so the
	// server snapshot and the first paint already use it. Built-in
	// assignment holds the prompt until the browser has picked the arm.
	const experimentSeed = enabled
		? seedExperiment(
				hostExperiment(options.experiment, { experiment: serverExperiment }),
				prefetch.initialExperiment,
				hasResolvedPrefetch(options.prefetch)
			)
		: {};

	return createKernel({
		...prefetch,
		consentCategories: options.consentCategories,
		// Every declared vendor, from code or a resolved prefetch, makes its
		// category selectable at construction, so the server snapshot and the
		// hydrated one evaluate the same scope.
		inferredConsentCategories: inferConsentCategories(options, declaredVendors),
		initialExperiment: experimentSeed.initialExperiment,
		initialExperimentPending: experimentSeed.initialExperimentPending,
		initialExternalPermissions:
			enabled && options.consentSource ? {} : undefined,
		initialIab:
			prefetch.initialIab?.gvlReference &&
			options.iab &&
			options.iab.vendors?.length
				? {
						...prefetch.initialIab,
						gvlReference: {
							...prefetch.initialIab.gvlReference,
							summary: undefined,
						},
					}
				: prefetch.initialIab,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialPolicyPending: options.consentSource
			? false
			: (prefetch.initialPolicyPending ??
				(enabled && !prefetch.initialPolicyResolution)),
		initialPolicyResolution: enabled
			? prefetch.initialPolicyResolution
			: disabledPolicyResolution(),
		// A disabled runtime grants everything, so stored records, including a
		// vendor denial list, must not narrow what loads.
		initialRecords:
			enabled && !options.consentSource ? prefetch.initialRecords : undefined,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		initialUser: normalizeKernelUser(options.user) ?? prefetch.initialUser,
		initialVendors:
			declaredVendors.length > 0 || vendorListVersion !== null
				? { declared: declaredVendors, listVersion: vendorListVersion }
				: undefined,
		// An empty shell has no expiring records to evaluate. A stable seed
		// avoids reading the clock during a static prerender; init takes the
		// real clock after mount. Prepared records retain their clock.
		now:
			prefetch.now ??
			prefetch.initialRecords?.now ??
			(prefetch.initialRecords ? undefined : 0),
		// A backend, manifest or prefetch supplies the base copy; the app's
		// own messages for the active language win key by key.
		translationOverrides: options.i18n?.messages,
		transport,
	});
};
