'use client';

import { useState } from 'react';
import { useTheme } from '~/hooks/use-theme';
import { ConsentDialogFooter } from '../consent-dialog/atoms/card';
import {
	ConsentWidgetAccordion,
	ConsentWidgetAccordionItems,
} from './atoms/accordion';
import {
	ConsentWidgetAcceptAllButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
} from './atoms/button';
import {
	ConsentWidgetFooter,
	ConsentWidgetFooterSubGroup,
} from './atoms/footer';
import { ConsentWidgetRoot } from './atoms/root';
import type { ConsentWidgetProps } from './types';
export const ConsentWidget = ({
	hideBranding,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus,
	...props
}: ConsentWidgetProps) => {
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
		<ConsentWidgetRoot {...mergedProps}>
			<ConsentWidgetAccordion
				type="multiple"
				value={openItems}
				onValueChange={setOpenItems}
			>
				<ConsentWidgetAccordionItems />
			</ConsentWidgetAccordion>
			<ConsentWidgetFooter>
				<ConsentWidgetFooterSubGroup themeKey="consentWidgetFooter">
					<ConsentWidgetRejectButton />
					<ConsentWidgetAcceptAllButton />
				</ConsentWidgetFooterSubGroup>
				<ConsentWidgetSaveButton />
			</ConsentWidgetFooter>
			<ConsentDialogFooter
				themeKey="consentWidgetBranding"
				hideBranding={hideBranding ?? true}
				data-testid="consent-widget-branding"
			/>
		</ConsentWidgetRoot>
	);
};
