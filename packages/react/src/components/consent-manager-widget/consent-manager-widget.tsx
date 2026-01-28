'use client';

import { useState } from 'react';
import { useTheme } from '~/hooks/use-theme';
import { DialogFooter } from '../consent-manager-dialog/atoms/dialog-card';
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
export const ConsentManagerWidget = ({
	hideBranding,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus,
	...props
}: ConsentManagerWidgetProps) => {
	const [openItems, setOpenItems] = useState<string[]>([]);

	// Get global theme context
	const globalTheme = useTheme();

	const mergedProps = {
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
		...props,
	};

	return (
		<ConsentManagerWidgetRoot {...mergedProps}>
			<ConsentManagerWidgetAccordion
				type="multiple"
				value={openItems}
				onValueChange={setOpenItems}
			>
				<ConsentManagerWidgetAccordionItems />
			</ConsentManagerWidgetAccordion>
			<ConsentManagerWidgetFooter>
				<ConsentManagerWidgetFooterSubGroup themeKey="widgetFooter">
					<ConsentManagerWidgetRejectButton />
					<ConsentManagerWidgetAcceptAllButton />
				</ConsentManagerWidgetFooterSubGroup>
				<ConsentManagerWidgetSaveButton />
			</ConsentManagerWidgetFooter>
			<DialogFooter
				themeKey="widgetBranding"
				hideBranding={hideBranding ?? true}
				data-testid="consent-manager-widget-branding"
			/>
		</ConsentManagerWidgetRoot>
	);
};
