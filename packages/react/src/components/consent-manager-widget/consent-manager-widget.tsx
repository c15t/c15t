'use client';

import { useState } from 'react';
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
	...props
}: ConsentManagerWidgetProps) => {
	const [openItems, setOpenItems] = useState<string[]>([]);
	const { common: translations } = useTranslations();

	return (
		<ConsentManagerWidgetRoot {...props}>
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
