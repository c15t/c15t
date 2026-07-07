import type { ConsentKernel } from 'c15t/v3';
import { useEffect, useRef } from 'react';
import { ALL_CONSENTS_ON } from './constants';
import { type ConsentProviderOptions, normalizeUser } from './options';

function serializeInitialOnlyOptions(options: ConsentProviderOptions): string {
	return JSON.stringify({
		backendURL: options.backendURL,
		domain: options.domain,
		mode: options.mode,
		headers: options.headers,
		hasCustomFetch: Boolean(options.customFetch),
		policies: options.policies,
		i18n: options.i18n,
		translations: options.translations,
		offlinePolicy: options.offlinePolicy,
		ssrData: Boolean(options.ssrData),
		storeOfflinePolicy: options.store?.offlinePolicy,
		storeInitialI18nConfig: options.store?.initialI18nConfig,
		storeInitialTranslationConfig: options.store?.initialTranslationConfig,
	});
}

export function useProviderOptionSync(
	kernel: ConsentKernel,
	options: ConsentProviderOptions,
	enabled: boolean
) {
	const previousEnabledRef = useRef(enabled);
	const previousUserRef = useRef<string | null>(null);
	const previousOverridesRef = useRef<string | null>(null);
	const initialOnlyRef = useRef<string | null>(null);

	useEffect(() => {
		const nextUser = normalizeUser(options.user);
		const serialized = JSON.stringify(nextUser ?? null);
		if (previousUserRef.current === null) {
			previousUserRef.current = serialized;
			return;
		}
		if (previousUserRef.current !== serialized) {
			previousUserRef.current = serialized;
			if (nextUser) {
				void kernel.commands.identify(nextUser);
			}
		}
	}, [kernel, options.user]);

	useEffect(() => {
		const serialized = JSON.stringify(options.overrides ?? {});
		if (previousOverridesRef.current === null) {
			previousOverridesRef.current = serialized;
			return;
		}
		if (previousOverridesRef.current !== serialized) {
			previousOverridesRef.current = serialized;
			kernel.set.overrides(options.overrides ?? {});
			if (enabled) {
				void kernel.commands.init();
			}
		}
	}, [enabled, kernel, options.overrides]);

	useEffect(() => {
		if (previousEnabledRef.current === enabled) return;
		previousEnabledRef.current = enabled;
		if (enabled) {
			return;
		}
		kernel.set.consent(ALL_CONSENTS_ON);
		kernel.set.activeUI('none');
		kernel.set.hasConsented(true);
	}, [enabled, kernel]);

	useEffect(() => {
		const nodeEnv = (
			globalThis as { process?: { env?: { NODE_ENV?: string } } }
		).process?.env?.NODE_ENV;
		if (nodeEnv === 'production') return;
		const serialized = serializeInitialOnlyOptions(options);
		if (initialOnlyRef.current === null) {
			initialOnlyRef.current = serialized;
			return;
		}
		if (initialOnlyRef.current !== serialized) {
			initialOnlyRef.current = serialized;
			console.warn(
				'c15t v3 ConsentProvider: backendURL, domain, mode, headers, customFetch, policies, i18n/translations, offlinePolicy, and ssrData are initial-only options. Remount the provider to apply changes.'
			);
		}
	}, [options]);
}
