'use client';

import type { UIOptions } from '@c15t/ui/theme';
import { useTheme } from './use-theme';

/**
 * Subset of UIOptions that can be overridden at the component level.
 *
 * @remarks
 * This type picks the common configuration props from UIOptions that
 * are used across consent management components. These can be set
 * globally via the provider or overridden locally.
 *
 * @public
 */
export type ComponentConfig = Pick<
	UIOptions,
	'noStyle' | 'disableAnimation' | 'scrollLock' | 'trapFocus'
>;

/**
 * Required version of ComponentConfig with all props defined.
 * @public
 */
export type ResolvedComponentConfig = Required<ComponentConfig>;

/**
 * Hook to merge local component configuration with global theme settings.
 *
 * @remarks
 * Provides a consistent way to handle configuration props that can be set
 * globally via the ConsentManagerProvider or overridden locally on individual
 * components. Local values take precedence over global values.
 *
 * The configuration props are defined in UIOptions from @c15t/ui/theme,
 * ensuring consistency across all framework implementations.
 *
 * @param localOverrides - Optional local configuration that takes precedence over global theme
 * @returns Merged configuration with local values taking precedence
 *
 * @example
 * ```tsx
 * const MyComponent = ({ noStyle, disableAnimation, scrollLock, trapFocus }) => {
 *   const config = useComponentConfig({
 *     noStyle,
 *     disableAnimation,
 *     scrollLock,
 *     trapFocus,
 *   });
 *
 *   // config.noStyle will be the local value if provided, otherwise global
 *   return <div data-no-style={config.noStyle} />;
 * };
 * ```
 *
 * @public
 */
export function useComponentConfig(
	localOverrides?: ComponentConfig
): ResolvedComponentConfig {
	const globalTheme = useTheme();

	return {
		noStyle: localOverrides?.noStyle ?? globalTheme.noStyle ?? false,
		disableAnimation:
			localOverrides?.disableAnimation ?? globalTheme.disableAnimation ?? false,
		scrollLock: localOverrides?.scrollLock ?? globalTheme.scrollLock ?? false,
		trapFocus: localOverrides?.trapFocus ?? globalTheme.trapFocus ?? true,
	};
}
