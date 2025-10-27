'use client';

/**
 * @packageDocumentation
 * Default implementation of the Consent-Manager dialog that ships with c15t.
 *
 * The new compound-component API exposes all primitives (Root, Card, etc.).
 * This default export simply composes those primitives so consumers that
 * prefer a one-line `<ConsentManagerDialog />` usage still have it.
 */

import type { FC } from 'react';
import type { LegalLink } from '~/components/shared/primitives/legal-links';
import type { ThemeContextValue } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTheme } from '~/hooks/use-theme';
import { ConsentCustomizationCard } from './atoms/dialog-card';
import { Root as ConsentManagerDialogRoot } from './atoms/root';
import type { ConsentManagerDialogTheme } from './theme';

/**
 * Props for the `<ConsentManagerDialog />` convenience component.
 *
 * Extends the theme context props so that the caller can override styling or
 * disable animations exactly the same way as when using the compound API.
 */
export interface ConsentManagerDialogProps
	extends ThemeContextValue<ConsentManagerDialogTheme> {
	/**
	 * Control the open state. If omitted the dialog follows
	 * `useConsentManager().isPrivacyDialogOpen`.
	 */
	open?: boolean;

	/**
	 * Legal document links to display in the dialog footer
	 * @remarks Provides links to privacy policy, cookie policy, terms of service, etc.
	 * @default undefined
	 */
	legalLinks?: LegalLink[];
}

export const ConsentManagerDialog: FC<ConsentManagerDialogProps> = ({
	open,
	theme: localTheme,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock = true,
	trapFocus: localTrapFocus = true,
	legalLinks,
}) => {
	// Global default settings from provider
	const globalTheme = useTheme();

	// Consent-manager state controls open/close when `open` prop is undefined
	const { isPrivacyDialogOpen } = useConsentManager();

	// Merge theme objects – local wins over global
	const mergedTheme = {
		...globalTheme.theme,
		...localTheme,
	};

	// Compose the props we want to forward to the Root primitive
	const rootProps = {
		open: open ?? isPrivacyDialogOpen,
		theme: mergedTheme,
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
	};

	return (
		<ConsentManagerDialogRoot {...rootProps}>
			<ConsentCustomizationCard
				noStyle={rootProps.noStyle}
				legalLinks={legalLinks}
			/>
		</ConsentManagerDialogRoot>
	);
};
