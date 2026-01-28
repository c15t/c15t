'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	type RefObject,
} from 'react';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';

interface IABBannerCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Card component for the IAB Banner.
 *
 * @remarks
 * Main container for the banner content. Handles focus trap when trapFocus is enabled.
 *
 * @public
 */
const IABBannerCard = forwardRef<HTMLDivElement, IABBannerCardProps>(
	({ children, className, ...props }, ref) => {
		const { trapFocus } = useTheme();

		useFocusTrap(Boolean(trapFocus), ref as RefObject<HTMLElement>);

		const cardClassName = className
			? `${styles.card} ${className}`
			: styles.card;

		return (
			<div
				ref={ref}
				className={cardClassName}
				tabIndex={0}
				role="dialog"
				aria-modal={trapFocus ? 'true' : undefined}
				data-testid="iab-banner-card"
				{...props}
			>
				{children}
			</div>
		);
	}
);

IABBannerCard.displayName = 'IABBannerCard';

export { IABBannerCard };
