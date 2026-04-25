import { generateThemeCSS } from '@c15t/ui/theme';
import { deepMerge } from '@c15t/ui/utils';
import type { ConsentKernel } from 'c15t/v3';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerOptions } from '../types/consent-manager';
import { defaultTheme } from '../utils/theme-utils';
import { KernelContext } from './context';
import { V3UIConfigContext, type V3UIConfigValue } from './ui-config-context';

export interface ConsentProviderProps {
	/**
	 * Kernel instance created by the caller via `createConsentKernel()`.
	 * The caller owns the lifecycle: it can be a module singleton, a per-
	 * request instance on the server, or fresh per mount in tests. The
	 * Provider does not create, cache, or mutate it.
	 */
	kernel: ConsentKernel;
	/**
	 * Existing React UI options reused for v3 stock components.
	 *
	 * Only visual/UI configuration is read here. Kernel/runtime behavior
	 * still comes from `createConsentKernel()`.
	 */
	options?: Pick<
		ConsentManagerOptions,
		| 'colorScheme'
		| 'disableAnimation'
		| 'legalLinks'
		| 'noStyle'
		| 'scrollLock'
		| 'theme'
		| 'trapFocus'
	>;
	children: ReactNode;
}

/**
 * v3 ConsentProvider.
 *
 * Role: put the kernel in context. That's it.
 *
 * Intentional non-responsibilities (contrast with v2):
 * - No `useEffect` subscribing to the kernel and mirroring its state into
 *   React state. Consumers subscribe per-slice via `useSyncExternalStore`
 *   in the selector hooks.
 * - No `useEffect` patching stale runtime caches. There is no cache.
 * - No `useEffect` diffing props to reapply `setOverrides` or
 *   `setCallbacks`. Callers drive those via actions or at kernel
 *   construction.
 * - No banner fetch, no localStorage read, no window write. Those are
 *   opt-in boot modules the caller invokes separately.
 */
export function ConsentProvider({
	kernel,
	options,
	children,
}: ConsentProviderProps) {
	const themeContextValue = useMemo(() => {
		const {
			theme = {},
			noStyle,
			disableAnimation,
			scrollLock,
			trapFocus = true,
			colorScheme,
		} = options ?? {};

		return {
			theme: deepMerge(defaultTheme, theme),
			noStyle,
			disableAnimation,
			scrollLock,
			trapFocus,
			colorScheme,
		};
	}, [options]);

	const uiConfigValue = useMemo<V3UIConfigValue>(
		() => ({
			legalLinks: options?.legalLinks,
		}),
		[options?.legalLinks]
	);

	const themeCSS = useMemo(() => {
		return generateThemeCSS(themeContextValue.theme);
	}, [themeContextValue.theme]);

	useColorScheme(options?.colorScheme);

	return (
		<KernelContext.Provider value={kernel}>
			<V3UIConfigContext.Provider value={uiConfigValue}>
				<GlobalThemeContext.Provider value={themeContextValue}>
					{themeCSS ? (
						<style
							id="c15t-theme"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: Generated CSS variables
							dangerouslySetInnerHTML={{ __html: themeCSS }}
						/>
					) : null}
					{children}
				</GlobalThemeContext.Provider>
			</V3UIConfigContext.Provider>
		</KernelContext.Provider>
	);
}
