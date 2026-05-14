'use client';

import { forwardRef, type ReactNode, type Ref } from 'react';
import { ConsentButton } from '~/components/shared/primitives/button';
import type { ConsentButtonProps } from '~/components/shared/primitives/button.types';

/**
 * Inline trigger for opening the consent dialog from places like site footers.
 *
 * @remarks
 * Renders an unstyled button by default so site styles can define the visual appearance.
 */
export interface ConsentDialogLinkProps
	extends Omit<ConsentButtonProps, 'children'> {
	/**
	 * Custom trigger content, for example "Your privacy settings" or "Manage preferences".
	 */
	children: ReactNode;
}

export const ConsentDialogLink = forwardRef<
	HTMLButtonElement,
	ConsentDialogLinkProps
>(({ children, noStyle = true, ...props }, ref) => {
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="open-consent-dialog"
			noStyle={noStyle}
			data-testid="consent-dialog-link"
			{...props}
		>
			{children}
		</ConsentButton>
	);
});

ConsentDialogLink.displayName = 'ConsentDialogLink';
