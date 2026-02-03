'use client';

/**
 * @packageDocumentation
 * Default implementation of the Consent Dialog that ships with c15t.
 *
 * The new compound-component API exposes all primitives (Root, Card, etc.).
 * This default export simply composes those primitives so consumers that
 * prefer a one-line `<ConsentDialog />` usage still have it.
 */

import type { FC } from 'react';
import {
	ConsentDialogTrigger,
	type ConsentDialogTriggerProps,
} from '~/components/consent-dialog-trigger';
import type { LegalLinksProps } from '~/components/shared/primitives/legal-links';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { ConsentCustomizationCard } from './atoms/card';
import { Root as ConsentDialogRoot } from './atoms/root';

/**
 * Props for the `<ConsentDialog />` convenience component.
 */
export interface ConsentDialogProps {
	/**
	 * Theme configuration override (deprecated)
	 * @deprecated Theme should be set on the ConsentManagerProvider
	 */
	theme?: never;

	/**
	 * Disables all animations when true
	 */
	disableAnimation?: boolean;

	/**
	 * Removes default styles when true
	 */
	noStyle?: boolean;

	/**
	 * Locks the scroll when true
	 */
	scrollLock?: boolean;

	/**
	 * Traps keyboard focus within a dialog when true
	 */
	trapFocus?: boolean;

	/**
	 * Control the open state. If omitted the dialog follows
	 * `useConsentManager().isPrivacyDialogOpen`.
	 */
	open?: boolean;

	/**
	 * Controls which legal links to display.
	 *
	 * - `undefined` (default): Shows all available legal links
	 * - `null`: Explicitly hides all legal links
	 * - Array of keys: Shows only the specified legal links
	 *
	 * @defaultValue undefined
	 *
	 * @example
	 * ```tsx
	 * // Show all links
	 * <ConsentDialog legalLinks={undefined} />
	 *
	 * // Show no links
	 * <ConsentDialog legalLinks={null} />
	 *
	 * // Show only privacy policy
	 * <ConsentDialog legalLinks={['privacyPolicy']} />
	 * ```
	 *
	 * @remarks
	 * You must set the legal links in the ConsentManagerProvider options.
	 */
	legalLinks?: LegalLinksProps['links'];

	/**
	 * Controls whether to hide the branding in the dialog footer.
	 *
	 * @defaultValue false
	 */
	hideBranding?: boolean;

	/**
	 * Show a floating trigger button to resurface the consent dialog.
	 * Useful for allowing users to re-open the dialog after dismissing.
	 *
	 * - `true` - Show trigger with default settings
	 * - `false` - Hide trigger (default)
	 * - `ConsentDialogTriggerProps` - Show trigger with custom props
	 *
	 * @default false
	 */
	showTrigger?: boolean | ConsentDialogTriggerProps;
}

export const ConsentDialog: FC<ConsentDialogProps> = ({
	open,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock = true,
	trapFocus: localTrapFocus = true,
	hideBranding,
	legalLinks,
	showTrigger = false,
}) => {
	// Merge local props with global theme context
	const config = useComponentConfig({
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock,
		trapFocus: localTrapFocus,
	});

	// Consent-manager state controls open/close when `open` prop is undefined
	const { isPrivacyDialogOpen } = useConsentManager();

	// Compose the props we want to forward to the Root primitive
	const rootProps = {
		open: open ?? isPrivacyDialogOpen,
		...config,
	};

	// Resolve trigger props
	const triggerProps: ConsentDialogTriggerProps | null =
		showTrigger === true
			? {} // Use defaults
			: showTrigger === false
				? null
				: showTrigger;

	return (
		<>
			{triggerProps && <ConsentDialogTrigger {...triggerProps} />}
			<ConsentDialogRoot {...rootProps}>
				<ConsentCustomizationCard
					noStyle={rootProps.noStyle}
					legalLinks={legalLinks}
					hideBranding={hideBranding}
				/>
			</ConsentDialogRoot>
		</>
	);
};
