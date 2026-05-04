'use client';

import { useState } from 'react';
import { useTheme } from '~/hooks/use-theme';
import type { AccordionRootProps } from '~/v3/components/shared/ui/accordion';
import { BrandingLink } from '~/v3/components/shared/ui/branding';
import { ConsentDraftProvider } from '~/v3/draft';
import {
	ConsentWidgetAccordion,
	ConsentWidgetAccordionItems,
} from './atoms/accordion';
import { ConsentWidgetRoot } from './atoms/root';
import { ConsentWidgetPolicyActions } from './policy-actions';
import type { ConsentWidgetProps } from './types';
export const ConsentWidget = ({
	hideBranding,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus,
	...props
}: ConsentWidgetProps) => {
	const [openItem, setOpenItem] = useState('');

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
		<ConsentDraftProvider>
			<ConsentWidgetRoot {...mergedProps}>
				<ConsentWidgetAccordion
					type="single"
					value={openItem}
					onValueChange={(value: NonNullable<AccordionRootProps['value']>) => {
						setOpenItem(
							Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
						);
					}}
				>
					<ConsentWidgetAccordionItems />
				</ConsentWidgetAccordion>
				<ConsentWidgetPolicyActions />
				<BrandingLink
					hideBranding={hideBranding ?? true}
					variant="dialog-tag"
					themeKey="consentWidgetTag"
					data-testid="consent-widget-branding"
				/>
			</ConsentWidgetRoot>
		</ConsentDraftProvider>
	);
};
