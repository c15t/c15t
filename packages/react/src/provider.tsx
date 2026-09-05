'use client';

import type {
	AllConsentNames,
	ConsentPresentation,
	Callbacks,
	ConsentKernel,
	I18nConfig,
	KernelConfig,
	KernelEvent,
	KernelOverrides,
	KernelTranslations,
	KernelUser,
	LegalLinks,
	ProviderTransportContext,
	ProviderTransportFactory,
	StorageConfig,
	TranslationsResponse,
	User,
} from '@c15t/core';
import { createConsentKernel } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import {
	createWindowDebug,
	resolveWindowDebugMode,
} from '@c15t/core/modules/window-debug';
import type { WindowDebugMode } from '@c15t/core/modules/window-debug';
import { resolvePolicyRules } from '@c15t/schema/types';
import { deepMergeTranslations } from '@c15t/translations';
import type { Translations } from '@c15t/translations';
import type { ReactNode } from 'react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { KernelContext, ProviderServicesContext } from './context';
import { useColorScheme } from './hooks/use-color-scheme';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './module-hooks';
import { usePersistence } from './module-hooks/persistence';
import { V3ThemeProvider } from './theme-provider';
import type { ReactUIOptions } from './types/consent-manager';
import type { ReactComponentSlots } from './types/slots';
import type { Theme } from './types/theme';
import type { V3UIConfigValue } from './ui-config-context';
import { defaultTranslationConfig } from './utils/default-translation-config';

const loadNetworkBlockerModule = () =>
	import('@c15t/core/modules/network-blocker');
const loadScriptLoaderModule = () => import('@c15t/core/modules/script-loader');
const loadThemeModule = () => import('@c15t/ui/theme');

/** Events emitted by the mounted provider without snapshot-derived consent aliases. */
export type ConsentProviderCallbacks = Pick<
	Callbacks,
	'onChoiceRecorded' | 'onPermissionsChanged' | 'onError'
>;
/** Prepared policy and records; legacy consent projections are not provider inputs. */
export type ConsentProviderPrefetch = Omit<
	KernelConfig,
	'initialDraft' | 'transport'
>;

export interface ConsentProviderOptions extends Pick<
	ReactUIOptions,
	| 'colorScheme'
	| 'disableAnimation'
	| 'noStyle'
	| 'scrollLock'
	| 'theme'
	| 'trapFocus'
> {
	enabled?: boolean;
	presentation?: ConsentPresentation;
	/**
	 * Transport factory the provider builds its kernel with. Required.
	 *
	 * Pass `hosted()` to talk to a c15t backend, `offline()` to resolve
	 * policies locally with no network, or `custom()` to supply your own
	 * kernel transport. This is an initial-only
	 * option: remount the provider to change it.
	 *
	 * @example
	 * ```tsx
	 * import { ConsentProvider, hosted, offline } from '@c15t/react';
	 *
	 * <ConsentProvider options={{ mode: hosted({ url: '/api/c15t' }) }}>
	 *   {children}
	 * </ConsentProvider>
	 *
	 * <ConsentProvider options={{ mode: offline() }}>{children}</ConsentProvider>
	 * ```
	 */
	mode: ProviderTransportFactory;
	storageConfig?: StorageConfig;
	user?: User | KernelUser;
	overrides?: KernelOverrides;
	prefetch?: ConsentProviderPrefetch;
	callbacks?: ConsentProviderCallbacks;
	scripts?: Script[];
	scriptLoader?: UseScriptLoaderOptions;
	networkBlocker?: UseNetworkBlockerOptions | false;
	persistence?: boolean | UsePersistenceOptions;
	i18n?: Partial<I18nConfig>;
	consentCategories?: AllConsentNames[];
	/** Per-component slot attribute overrides (shared contract with @c15t/vue). */
	components?: ReactComponentSlots;
	legalLinks?: LegalLinks;
	/**
	 * Adapter package name reported by `window.c15t`.
	 * @internal
	 */
	__debugPkg?: string;
}

export interface ConsentProviderProps {
	options: ConsentProviderOptions;
	children: ReactNode;
}

const DISABLED_RESOLUTION = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [
		{
			id: 'disabled',
			match: { fallback: true },
			model: 'opt-out',
			prompt: 'none',
		},
	],
});

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

const normalizeUser = function normalizeUser(
	user: ConsentProviderOptions['user']
): KernelUser | undefined {
	if (!user) {
		return undefined;
	}
	if ('externalId' in user) {
		return user;
	}
	return {
		externalId: user.id,
		identityProvider: user.identityProvider,
	};
};

const resolveI18nTranslations = function resolveI18nTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!i18n?.messages) {
		return undefined;
	}
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
};

const getEnabled = function getEnabled(
	options: ConsentProviderOptions
): boolean {
	return options.enabled ?? true;
};

const getProviderMode = function getProviderMode(
	options: ConsentProviderOptions
): ProviderTransportFactory {
	if (typeof options.mode !== 'function') {
		throw new Error(
			'c15t ConsentProvider: `mode` is required. Use hosted(), offline(), or custom().'
		);
	}
	return options.mode;
};

const resolveInitialPolicyPending = function resolveInitialPolicyPending(
	enabled: boolean,
	prefetch: KernelConfig
): boolean {
	return (
		prefetch.initialPolicyPending ??
		(enabled && !prefetch.initialPolicyResolution)
	);
};

const createProviderKernel = function createProviderKernel(
	options: ConsentProviderOptions
): ConsentKernel {
	const enabled = getEnabled(options);
	const prefetch = options.prefetch ?? {};
	const i18nTranslations =
		resolveI18nTranslations(options.i18n) ?? DEFAULT_TRANSLATIONS;

	const transportContext: ProviderTransportContext = {
		consentCategories: options.consentCategories,
		prefetch,
		translations: i18nTranslations,
	};
	const transport = getProviderMode(options)(transportContext);

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	return createConsentKernel({
		...prefetch,
		transport,
		initialPolicyResolution: enabled
			? prefetch.initialPolicyResolution
			: DISABLED_RESOLUTION,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialUser: normalizeUser(options.user) ?? prefetch.initialUser,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		// The synthetic categories fallback is a placeholder for whatever the
		// transport's init resolves — mark it provisional so no surface renders
		// copy/actions that init may replace (mid-read copy swap, CLS, consent
		// recorded against a placeholder policy). Real initial policies
		// (prefetch/SSR/offline config) stay authoritative and render at once.
		initialPolicyPending: resolveInitialPolicyPending(enabled, prefetch),
	});
};

const stringifyError = function stringifyError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const useProviderCallbacks = function useProviderCallbacks(
	kernel: ConsentKernel,
	callbacks: ConsentProviderCallbacks | undefined
) {
	const callbacksRef = useRef(callbacks);

	useEffect(() => {
		callbacksRef.current = callbacks;
	}, [callbacks]);

	useEffect(() => {
		const subscriptions = [
			kernel.events.on(
				'choice:recorded',
				({ snapshot, confirmed, actionAt }) => {
					callbacksRef.current?.onChoiceRecorded?.({
						actionAt,
						confirmed,
						snapshot,
					});
				}
			),
			kernel.events.on('permissions:changed', ({ snapshot, previous }) => {
				callbacksRef.current?.onPermissionsChanged?.({ previous, snapshot });
			}),

			kernel.events.on(
				'command:error',
				(event: Extract<KernelEvent, { type: 'command:error' }>) => {
					callbacksRef.current?.onError?.({
						error: stringifyError(event.error),
					});
				}
			),
		];

		return () => {
			for (const unsubscribe of subscriptions) {
				unsubscribe();
			}
		};
	}, [kernel]);
};

const serializeInitialOnlyOptions = function serializeInitialOnlyOptions(
	options: ConsentProviderOptions
): string {
	return JSON.stringify({
		i18n: options.i18n,
		mode: options.mode?.kind,
	});
};

const useProviderOptionSync = function useProviderOptionSync(
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
				void (async () => {
					try {
						await kernel.commands.identify(nextUser);
					} catch {
						// Provider callbacks receive the command:error event.
					}
				})();
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
		if (previousEnabledRef.current === enabled) {
			return;
		}
		previousEnabledRef.current = enabled;
		if (enabled) {
			return;
		}
		kernel.set.activeUI('none');
	}, [enabled, kernel]);

	useEffect(() => {
		const nodeEnv = (
			globalThis as { process?: { env?: { NODE_ENV?: string } } }
		).process?.env?.NODE_ENV;
		if (nodeEnv === 'production') {
			return;
		}
		const serialized = serializeInitialOnlyOptions(options);
		if (initialOnlyRef.current === null) {
			initialOnlyRef.current = serialized;
			return;
		}
		if (initialOnlyRef.current !== serialized) {
			initialOnlyRef.current = serialized;
			console.warn(
				'c15t ConsentProvider: mode and i18n are initial-only options. Remount the provider to apply changes.'
			);
		}
	}, [options]);
};

const ProviderCallbacksMount = ({
	kernel,
	callbacks,
}: {
	kernel: ConsentKernel;
	callbacks?: ConsentProviderCallbacks;
}) => {
	useProviderCallbacks(kernel, callbacks);
	return null;
};

const InitMount = ({
	enabled,
	kernel,
	prepared,
}: {
	enabled: boolean;
	kernel: ConsentKernel;
	prepared: boolean;
}) => {
	const initialized = useRef(false);
	const hydrated = useRef(false);
	useEffect(() => {
		if (!enabled) {
			initialized.current = false;
			return;
		}
		if (initialized.current) {
			return;
		}
		initialized.current = true;
		if (prepared) {
			kernel.hydrate({
				now: hydrated.current
					? Date.now()
					: kernel.getServerSnapshot().evaluatedAt,
			});
			hydrated.current = true;
			const { gpc } = kernel.getSnapshot().privacySignals;
			if (gpc.detected && gpc.active) {
				// Hydration stays read-only; activate the detected signal through
				// the public setter after the prepared snapshot has committed.
				kernel.set.privacySignals({ gpc: true });
			}
		} else {
			kernel.commands.init();
		}
	}, [enabled, kernel, prepared]);
	return null;
};

const ScriptsMount = ({
	options,
	scripts,
}: {
	options?: UseScriptLoaderOptions;
	scripts: Script[];
}) => {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose: () => void;
		updateScripts: (scripts: Script[]) => void;
	} | null>(null);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);

	useEffect(() => {
		latestScriptsRef.current = scripts;
		latestOptionsRef.current = options;
	}, [options, scripts]);

	useEffect(() => {
		if (!kernel) {
			return;
		}
		let disposed = false;
		void (async () => {
			const { createScriptLoader } = await loadScriptLoaderModule();
			if (disposed) {
				return;
			}
			const created = createScriptLoader({
				kernel,
				onDebug: latestOptionsRef.current?.onDebug,
				scripts: latestScriptsRef.current,
			});
			handleRef.current = created;
		})();
		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	useEffect(() => {
		handleRef.current?.updateScripts(scripts);
	}, [scripts]);

	return null;
};

const NetworkBlockerMount = ({
	options,
}: {
	options: UseNetworkBlockerOptions;
}) => {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose: () => void;
		updateRules: (rules: UseNetworkBlockerOptions['rules']) => void;
		setEnabled: (enabled: boolean) => void;
	} | null>(null);
	const latestOptionsRef = useRef(options);

	useEffect(() => {
		latestOptionsRef.current = options;
	}, [options]);

	useEffect(() => {
		if (!kernel) {
			return;
		}
		let disposed = false;
		void (async () => {
			const { createNetworkBlocker } = await loadNetworkBlockerModule();
			if (disposed) {
				return;
			}
			const latest = latestOptionsRef.current;
			const created = createNetworkBlocker({
				enabled: latest.enabled,
				kernel,
				logBlockedRequests: latest.logBlockedRequests,
				onRequestBlocked: latest.onRequestBlocked,
				rules: latest.rules,
			});
			handleRef.current = created;
		})();
		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	useEffect(() => {
		handleRef.current?.updateRules(options.rules);
	}, [options.rules]);

	useEffect(() => {
		if (options.enabled !== undefined) {
			handleRef.current?.setEnabled(options.enabled);
		}
	}, [options.enabled]);

	return null;
};

const PersistenceMount = ({
	options,
	clearRef,
}: {
	options?: UsePersistenceOptions;
	clearRef: { current: (() => void) | null };
}) => {
	const handle = usePersistence(options);
	useEffect(() => {
		clearRef.current = handle.clear;
		return () => {
			clearRef.current = null;
		};
	}, [handle, clearRef]);
	return null;
};

const WindowDebugMount = ({
	pkg,
	mode,
}: {
	pkg: string;
	mode: WindowDebugMode;
}) => {
	useEffect(() => {
		// The module is tiny and dependency-free; `createWindowDebug` itself
		// guards against pages that made `window.c15t` non-writable.
		const handle = createWindowDebug({ mode, pkg });
		return () => handle.dispose();
	}, [mode, pkg]);

	return null;
};

const WindowKernelMount = ({ kernel }: { kernel: ConsentKernel }) => {
	useEffect(() => {
		const browserWindow = window as Window & {
			c15tKernel?: ConsentKernel;
		};
		const previousKernel = browserWindow.c15tKernel;
		browserWindow.c15tKernel = kernel;

		return () => {
			if (browserWindow.c15tKernel !== kernel) {
				return;
			}
			if (previousKernel) {
				browserWindow.c15tKernel = previousKernel;
				return;
			}
			delete browserWindow.c15tKernel;
		};
	}, [kernel]);

	return null;
};

const ThemeStyleMount = ({ theme }: { theme?: Theme }) => {
	const [themeCSS, setThemeCSS] = useState('');

	useEffect(() => {
		if (!theme) {
			const frame = requestAnimationFrame(() => setThemeCSS(''));
			return () => cancelAnimationFrame(frame);
		}

		let disposed = false;
		void (async () => {
			const { generateThemeCSS } = await loadThemeModule();
			if (!disposed) {
				setThemeCSS(generateThemeCSS(theme as never));
			}
		})();

		return () => {
			disposed = true;
		};
	}, [theme]);

	if (!themeCSS) {
		return null;
	}

	return (
		<style
			id="c15t-theme"
			// oxlint-disable-next-line react/no-danger -- Generated CSS variables
			dangerouslySetInnerHTML={{ __html: themeCSS }}
		/>
	);
};

const normalizePersistenceOptions = function normalizePersistenceOptions(
	options: ConsentProviderOptions
): UsePersistenceOptions | false {
	if (options.persistence === false) {
		return false;
	}
	const { storageConfig } = options;
	const prepared = !!options.prefetch?.initialRecords;
	if (options.persistence === true || options.persistence === undefined) {
		return { skipHydration: prepared, storageConfig };
	}
	return {
		...options.persistence,
		skipHydration: options.persistence.skipHydration ?? prepared,
		storageConfig: options.persistence.storageConfig ?? storageConfig,
	};
};

/**
 * v3 ConsentProvider.
 *
 * Creates one kernel per mount, provides it via context, and wires the
 * curated v2-like options surface to v3 modules. It does not mirror the
 * snapshot into React state; selector hooks still subscribe directly to
 * the kernel through `useSyncExternalStore`.
 */
export const ConsentProvider = ({
	options,
	children,
}: ConsentProviderProps) => {
	const [kernel, setKernel] = useState(() => createProviderKernel(options));
	void setKernel;
	const clearRef = useRef<(() => void) | null>(null);
	const services = useMemo(
		() => ({
			clearRecords: () => {
				if (clearRef.current) {
					clearRef.current();
				} else {
					kernel.hydrate({
						choice: null,
						noticeDismissal: null,
						optOutDirectives: [],
						subject: null,
					});
					kernel.events.emit({ type: 'records:cleared' });
				}
			},
			getConsentCategories: () => {
				const { scope } = kernel.getSnapshot().policyRule;
				const configured = options.consentCategories;
				return [
					'necessary' as const,
					...scope.filter(
						(name) => !configured?.length || configured.includes(name)
					),
				];
			},
			getPresentation: () => options.presentation,
		}),
		[kernel, options.consentCategories, options.presentation]
	);
	const enabled = getEnabled(options);
	const persistenceOptions = normalizePersistenceOptions(options);
	const { scripts, networkBlocker } = options;
	const windowDebugPkg = options.__debugPkg ?? '@c15t/react';
	const windowDebugMode = resolveWindowDebugMode(options.mode);

	useProviderOptionSync(kernel, options, enabled);
	const lifecycle = useRef(0);
	useEffect(() => {
		lifecycle.current += 1;
		const generation = lifecycle.current;
		return () => {
			queueMicrotask(() => {
				if (lifecycle.current === generation) {
					kernel.dispose();
				}
			});
		};
	}, [kernel]);

	const userTheme = options.theme;

	const themeContextValue = useMemo(
		() => ({
			colorScheme: options.colorScheme,
			disableAnimation: options.disableAnimation,
			noStyle: options.noStyle,
			scrollLock: options.scrollLock,
			theme: userTheme,
			trapFocus: options.trapFocus ?? true,
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
			legalLinks: options.legalLinks,
			presentation: options.presentation,
		}),
		[options.components, options.legalLinks, options.presentation]
	);

	useColorScheme(options.colorScheme);

	const providerChildren = (
		<>
			<ProviderCallbacksMount
				kernel={kernel}
				callbacks={options.callbacks}
			/>
			<WindowDebugMount
				pkg={windowDebugPkg}
				mode={windowDebugMode}
			/>
			<WindowKernelMount kernel={kernel} />
			{enabled && persistenceOptions ? (
				<PersistenceMount
					options={persistenceOptions}
					clearRef={clearRef}
				/>
			) : null}
			<InitMount
				enabled={enabled}
				prepared={!!options.prefetch?.initialPolicyResolution}
				kernel={kernel}
			/>
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
			<ProviderServicesContext.Provider value={services}>
				<V3ThemeProvider
					themeConfig={themeContextValue}
					uiConfig={uiConfigValue}
				>
					<ThemeStyleMount theme={userTheme} />
					{providerChildren}
				</V3ThemeProvider>
			</ProviderServicesContext.Provider>
		</KernelContext.Provider>
	);
};
