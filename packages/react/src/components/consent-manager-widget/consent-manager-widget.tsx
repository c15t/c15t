'use client';

import { useState } from 'react';
import { useTheme } from '~/hooks/use-theme';
import { useTranslations } from '~/hooks/use-translations';
import {
	BrandingFooter,
	DialogFooter,
} from '../consent-manager-dialog/atoms/dialog-card';
import {
	ConsentManagerWidgetAccordion,
	ConsentManagerWidgetAccordionItems,
} from './atoms/accordion';
import {
	ConsentManagerWidgetAcceptAllButton,
	ConsentManagerWidgetRejectButton,
	ConsentManagerWidgetSaveButton,
} from './atoms/button';
import {
	ConsentManagerWidgetFooter,
	ConsentManagerWidgetFooterSubGroup,
} from './atoms/footer';
import { ConsentManagerWidgetRoot } from './atoms/root';
import type { ConsentManagerWidgetProps } from './types';

/**
 * The main consent management widget component.
 * Provides a pre-configured interface for managing privacy consents.
 *
 * @remarks
 * Key features:
 * - Implements compound component pattern for flexible composition
 * - Manages consent state and user interactions
 * - Provides accessible controls for consent management
 * - Supports comprehensive theming
 * - Handles accordion state management
 *
 * @example
 * Basic usage:
 * ```tsx
 * <ConsentManagerWidget>
 *   <ConsentManagerWidget.AccordionItems />
 *   <ConsentManagerWidget.Footer>
 *     <ConsentManagerWidget.RejectButton>
 *       Deny
 *     </ConsentManagerWidget.RejectButton>
 *     <ConsentManagerWidget.AcceptAllButton>
 *       Accept All
 *     </ConsentManagerWidget.AcceptAllButton>
 *   </ConsentManagerWidget.Footer>
 * </ConsentManagerWidget>
 * ```
 *
 * @example
 * With custom styling:
 * ```tsx
 * <ConsentManagerWidget
 *   theme={{
 *     root: "custom-root-class",
 *     accordion: "custom-accordion-class",
 *     footer: "custom-footer-class"
 *   }}
 *   hideBrading={true}
 * />
 * ```
 */
export const ConsentManagerWidget = ({
	hideBrading,
	theme: localTheme,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus,
	...props
}: ConsentManagerWidgetProps) => {
	const [openItems, setOpenItems] = useState<string[]>([]);
	const { common: translations } = useTranslations();

	// Get global theme context and merge with local props
	const globalTheme = useTheme();

	// Merge global theme context with local props (local takes precedence)
	const mergedTheme = {
		...globalTheme.theme,
		...localTheme,
	};

	const mergedProps = {
		theme: mergedTheme,
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
		...props,
	};

	return (
		<ConsentManagerWidgetRoot {...mergedProps}>
			<ConsentManagerWidgetAccordion
				themeKey="widget.accordion"
				type="multiple"
				value={openItems}
				onValueChange={setOpenItems}
			>
				<ConsentManagerWidgetAccordionItems />
			</ConsentManagerWidgetAccordion>
			<ConsentManagerWidgetFooter>
				<ConsentManagerWidgetFooterSubGroup themeKey="widget.footer.sub-group">
					<ConsentManagerWidgetRejectButton themeKey="widget.footer.reject-button">
						{translations.rejectAll}
					</ConsentManagerWidgetRejectButton>
					<ConsentManagerWidgetAcceptAllButton themeKey="widget.footer.accept-button">
						{translations.acceptAll}
					</ConsentManagerWidgetAcceptAllButton>
				</ConsentManagerWidgetFooterSubGroup>
				<ConsentManagerWidgetSaveButton themeKey="widget.footer.save-button">
					{translations.save}
				</ConsentManagerWidgetSaveButton>
			</ConsentManagerWidgetFooter>
			{!hideBrading && (
				<DialogFooter themeKey="widget.branding">
					<BrandingFooter />
				</DialogFooter>
			)}
		</ConsentManagerWidgetRoot>
	);
};
