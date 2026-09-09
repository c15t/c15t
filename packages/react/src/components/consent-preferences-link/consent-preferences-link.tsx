'use client';

import { forwardRef as createForwardRef } from 'react';
import type { ReactNode, Ref } from 'react';

import { ConsentButton } from '~/components/shared/primitives/button';
import type { ConsentButtonProps } from '~/components/shared/primitives/button.types';
import { usePolicyRule } from '~/hooks';

/**
 * Inline trigger for opening the consent dialog from places like site footers.
 *
 * @remarks
 * Renders an unstyled button by default so site styles can define the visual appearance.
 */
export interface ConsentDialogLinkProps extends Omit<
	ConsentButtonProps,
	'children'
> {
	/**
	 * Custom trigger content, for example "Your privacy settings" or "Manage preferences".
	 */
	children: ReactNode;
}

export const ConsentDialogLink = createForwardRef<
	HTMLButtonElement,
	ConsentDialogLinkProps
>(({ children, noStyle = true, ...props }, ref) => {
	const policy = usePolicyRule();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="open-consent-dialog"
			noStyle={noStyle}
			data-testid="consent-dialog-link"
			data-c15t-rights={policy.rights.join(' ')}
			{...props}
		>
			{children}
		</ConsentButton>
	);
});

ConsentDialogLink.displayName = 'ConsentDialogLink';
