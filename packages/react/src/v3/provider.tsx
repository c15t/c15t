'use client';

import { useMemo, useState } from 'react';
import { KernelContext } from './context';
import { useColorScheme } from './hooks/use-color-scheme';
import { useProviderCallbacks } from './provider/callbacks';
import {
	IABGate,
	InitMount,
	NetworkBlockerMount,
	PersistenceMount,
	ScriptsMount,
	ThemeStyleMount,
} from './provider/mounts';
import { useProviderOptionSync } from './provider/option-sync';
import {
	type ConsentProviderProps,
	getEnabled,
	getProviderCallbacks,
	getProviderIab,
	getProviderLegalLinks,
	getProviderNetworkBlocker,
	getProviderOfflinePolicy,
	getProviderScripts,
	normalizeIabOptions,
	normalizePersistenceOptions,
} from './provider/options';
import { createProviderKernel } from './provider/transports';
import { V3ThemeProvider } from './theme-provider';
import type { V3UIConfigValue } from './ui-config-context';

export type {
	ConsentProviderOptions,
	ConsentProviderProps,
	ProviderIABOptions,
	ProviderMode,
} from './provider/options';

/**
 * v3 ConsentProvider.
 *
 * Creates one kernel per mount, provides it via context, and wires the
 * curated v2-like options surface to v3 modules. It does not mirror the
 * snapshot into React state; selector hooks still subscribe directly to
 * the kernel through `useSyncExternalStore`.
 */
export function ConsentProvider({ options, children }: ConsentProviderProps) {
	const [{ kernel, eagerInit }] = useState(() => {
		const created = createProviderKernel(options);
		// Kick the init roundtrip off during first client render so its
		// network latency overlaps hydration instead of following it — with
		// the banner gated on init resolution (authoritative-only rendering),
		// dispatching init from a post-hydration effect would serialize
		// throttled hydration and the backend roundtrip back-to-back.
		const shouldEagerInit =
			typeof window !== 'undefined' && getEnabled(options);
		if (shouldEagerInit) {
			void created.commands.init();
		}
		return { kernel: created, eagerInit: shouldEagerInit };
	});
	const enabled = getEnabled(options);
	const reloadOnConsentRevoked =
		(options.reloadOnConsentRevoked ??
			options.store?.reloadOnConsentRevoked) !== false;
	const persistenceOptions = normalizePersistenceOptions(options);
	const iabOptions = normalizeIabOptions(getProviderIab(options));
	const scripts = getProviderScripts(options);
	const networkBlocker = getProviderNetworkBlocker(options);

	useProviderCallbacks(
		kernel,
		getProviderCallbacks(options),
		reloadOnConsentRevoked
	);
	useProviderOptionSync(kernel, options, enabled);

	const userTheme = options.theme;

	const themeContextValue = useMemo(
		() => ({
			theme: userTheme,
			noStyle: options.noStyle,
			disableAnimation: options.disableAnimation,
			scrollLock: options.scrollLock,
			trapFocus: options.trapFocus ?? true,
			colorScheme: options.colorScheme,
		}),
		[
			userTheme,
			options.noStyle,
			options.disableAnimation,
			options.scrollLock,
			options.trapFocus,
			options.colorScheme,
		]
	);

	const uiConfigValue = useMemo<V3UIConfigValue>(
		() => ({
			components: options.components,
			legalLinks: getProviderLegalLinks(options),
		}),
		[options]
	);

	useColorScheme(options.colorScheme);

	const providerChildren = (
		<>
			<InitMount
				enabled={enabled}
				kernel={kernel}
				eagerInit={eagerInit}
			/>
			{enabled && persistenceOptions ? (
				<PersistenceMount options={persistenceOptions} />
			) : null}
			{enabled && scripts && scripts.length > 0 ? (
				<ScriptsMount
					options={options.scriptLoader}
					scripts={scripts}
				/>
			) : null}
			{enabled && networkBlocker ? (
				<NetworkBlockerMount options={networkBlocker} />
			) : null}
			{children}
		</>
	);

	return (
		<KernelContext.Provider value={kernel}>
			<V3ThemeProvider
				themeConfig={themeContextValue}
				uiConfig={uiConfigValue}
			>
				<ThemeStyleMount theme={userTheme} />
				<IABGate
					enabled={enabled}
					initialModel={
						options.prefetch?.initialPolicy?.model ??
						getProviderOfflinePolicy(options)?.policy?.model
					}
					kernel={kernel}
					options={iabOptions}
				>
					{providerChildren}
				</IABGate>
			</V3ThemeProvider>
		</KernelContext.Provider>
	);
}
