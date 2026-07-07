import { buildDefaultOptInPolicy, type InitOutput } from '@c15t/schema/types';
import { deepMergeTranslations, type Translations } from '@c15t/translations';
import type { AllConsentNames, CustomClientOptions, I18nConfig } from 'c15t';
import {
	buildSubjectPostBody,
	type ConsentKernel,
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
	type InitResponse,
	type KernelConfig,
	type KernelTranslations,
	type KernelTransport,
	mapInitOutputToInitResponse,
	type TranslationsResponse,
} from 'c15t/v3';
import { defaultTranslationConfig } from '../utils/default-translation-config';
import { ALL_CONSENTS_ON, DEFAULT_TRANSLATIONS } from './constants';
import {
	type ConsentProviderOptions,
	getEnabled,
	getProviderCategories,
	getProviderOfflinePolicy,
	getProviderPolicies,
	normalizeUser,
	type ProviderMode,
	resolveProviderI18n,
} from './options';

function resolveI18nTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!i18n?.messages) return undefined;
	const language =
		i18n.locale ?? defaultTranslationConfig.defaultLanguage ?? 'en';
	const fallbackTranslations = defaultTranslationConfig.translations
		.en as TranslationsResponse;
	const selected =
		i18n.messages[language] ?? i18n.messages.en ?? fallbackTranslations;
	const base =
		defaultTranslationConfig.translations[
			language as keyof typeof defaultTranslationConfig.translations
		] ?? fallbackTranslations;
	return {
		language,
		translations: deepMergeTranslations(
			base as Translations,
			selected as Partial<Translations>
		) as TranslationsResponse,
	};
}

function buildInlinePolicy(categories: AllConsentNames[] | undefined) {
	return buildDefaultOptInPolicy(categories);
}

function buildNoBannerPolicy(): KernelConfig['initialPolicy'] {
	return {
		id: 'no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

function mapSSRInitialData(
	data: Awaited<ConsentProviderOptions['ssrData']>
): InitResponse | null {
	if (!data?.init) return null;
	const init = data.init as Record<string, unknown>;
	return mapInitOutputToInitResponse(
		{
			...init,
			gvl: data.gvl ?? init.gvl,
		} as InitOutput,
		{}
	);
}

function withSSRData(
	transport: KernelTransport,
	ssrData: ConsentProviderOptions['ssrData']
): KernelTransport {
	if (!ssrData) return transport;
	let used = false;
	return {
		...transport,
		async init(ctx) {
			if (!used) {
				used = true;
				const mapped = mapSSRInitialData(await ssrData);
				if (mapped) return mapped as never;
			}
			return transport.init?.(ctx) ?? {};
		},
	};
}

function createCustomTransport(
	endpointHandlers: CustomClientOptions['endpointHandlers']
): KernelTransport {
	return {
		async init() {
			if (!endpointHandlers.init) return {};
			const response = await endpointHandlers.init();
			if (!response.ok || !response.data) {
				throw response.error ?? new Error('c15t custom transport: init failed');
			}
			const init = response.data as Record<string, unknown>;
			if (init.location && init.translations && init.branding) {
				return mapInitOutputToInitResponse(init as InitOutput, {});
			}
			return {
				resolvedOverrides: init.resolvedOverrides as never,
				consents: init.consents as never,
				hasConsented: init.hasConsented as never,
				subjectId: init.subjectId as never,
				location: init.location as never,
				translations: init.translations as never,
				branding:
					init.branding === 'none' ? undefined : (init.branding as never),
				gvl: init.gvl as never,
				customVendors: init.customVendors as never,
				cmpId: init.cmpId as never,
				policy: init.policy as never,
				policyDecision: init.policyDecision as never,
				policySnapshotToken: init.policySnapshotToken as never,
			};
		},
		async save(payload) {
			const response = await endpointHandlers.setConsent({
				body: buildSubjectPostBody(payload, {
					domain:
						typeof window === 'undefined'
							? 'localhost'
							: window.location.hostname,
				}),
			});
			return {
				ok: response.ok,
				subjectId: response.data?.subjectId,
			};
		},
	};
}

function createStaticOfflineTransport(
	prefetch: KernelConfig,
	offlinePolicy: ConsentProviderOptions['offlinePolicy'],
	translations: KernelTranslations
): KernelTransport | null {
	const policy = prefetch.initialPolicy ?? offlinePolicy?.policy;
	if (!policy) return null;
	return {
		async init(ctx) {
			return {
				location: {
					countryCode: ctx.overrides.country ?? null,
					regionCode: ctx.overrides.region ?? null,
				},
				translations:
					prefetch.initialTranslations ??
					(ctx.overrides.language
						? { ...translations, language: ctx.overrides.language }
						: translations),
				branding: prefetch.initialBranding ?? 'c15t',
				policy,
				policyDecision:
					prefetch.initialPolicyDecision ?? offlinePolicy?.policyDecision,
				policySnapshotToken:
					prefetch.initialPolicySnapshotToken ??
					offlinePolicy?.policySnapshotToken,
			};
		},
		async save(payload) {
			return { ok: true, subjectId: payload.subjectId };
		},
	};
}

export function createProviderKernel(
	options: ConsentProviderOptions
): ConsentKernel {
	const isEnabled = getEnabled(options);
	const mode: ProviderMode =
		options.mode ?? (options.backendURL ? 'hosted' : 'offline');
	const prefetch = options.prefetch ?? {};
	const offlinePolicy = getProviderOfflinePolicy(options);
	const i18nTranslations =
		resolveI18nTranslations(resolveProviderI18n(options)) ??
		DEFAULT_TRANSLATIONS;

	const staticOfflineTransport = createStaticOfflineTransport(
		prefetch,
		offlinePolicy,
		i18nTranslations
	);

	const baseTransport =
		options.transport ??
		(mode === 'custom' && options.endpointHandlers
			? createCustomTransport(options.endpointHandlers)
			: mode === 'hosted' || mode === 'c15t'
				? createHostedTransport({
						backendURL: options.backendURL ?? '/api/c15t',
						domain: options.domain,
						headers: options.headers,
						fetch: options.customFetch,
					})
				: (staticOfflineTransport ??
					createOfflineTransport({
						policyPacks: getProviderPolicies(options),
						translations: i18nTranslations,
					})));

	const transport = withSSRData(baseTransport, options.ssrData);

	return createConsentKernel({
		...prefetch,
		transport,
		initialConsents: isEnabled
			? (prefetch.initialConsents ?? undefined)
			: ALL_CONSENTS_ON,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialUser: normalizeUser(options.user) ?? prefetch.initialUser,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		initialPolicy:
			isEnabled === false
				? (prefetch.initialPolicy ?? buildNoBannerPolicy())
				: (prefetch.initialPolicy ??
					offlinePolicy?.policy ??
					(buildInlinePolicy(
						getProviderCategories(options)
					) as KernelConfig['initialPolicy'])),
		// The synthetic categories fallback is a placeholder for whatever the
		// transport's init resolves — mark it provisional so no surface renders
		// copy/actions that init may replace (mid-read copy swap, CLS, consent
		// recorded against a placeholder policy). Real initial policies
		// (prefetch/SSR/offline config) stay authoritative and render at once.
		initialPolicyProvisional:
			isEnabled !== false && !prefetch.initialPolicy && !offlinePolicy?.policy,
		initialPolicyDecision:
			prefetch.initialPolicyDecision ?? offlinePolicy?.policyDecision,
		initialPolicySnapshotToken:
			prefetch.initialPolicySnapshotToken ?? offlinePolicy?.policySnapshotToken,
	});
}
