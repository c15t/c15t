'use client';

import { ConsentBanner } from '@c15t/react';
import { useHeadlessConsentUI } from '@c15t/react/headless';
import type { ReactNode } from 'react';

/** Shared prompt visibility and accessibility, including notice and expiry. */
export const RscBannerGate = ({
	children,
	title,
	className,
}: {
	children: ReactNode;
	title: string;
	className?: string;
}) => (
	<ConsentBanner.Root
		aria-label={title}
		className={className}
		disableAnimation
		trapFocus={false}
	>
		{children}
	</ConsentBanner.Root>
);

export interface RscBannerActionsProps {
	acceptLabel: string;
	rejectLabel: string;
	customizeLabel: string;
	dismissLabel?: string;
	classNames?: {
		footer?: string;
		acceptButton?: string;
		rejectButton?: string;
		customizeButton?: string;
		dismissButton?: string;
	};
}

/** Use the React action renderer so required controls keep equal prominence. */
export const RscBannerActions = ({
	acceptLabel,
	rejectLabel,
	customizeLabel,
	dismissLabel = 'Dismiss',
	classNames,
}: RscBannerActionsProps) => {
	const { performBannerAction } = useHeadlessConsentUI();
	const labels = {
		accept: acceptLabel,
		customize: customizeLabel,
		dismiss: dismissLabel,
		reject: rejectLabel,
		save: 'Save',
	};
	const classes = {
		accept: classNames?.acceptButton,
		customize: classNames?.customizeButton,
		dismiss: classNames?.dismissButton,
		reject: classNames?.rejectButton,
		save: undefined,
	};
	return (
		<div className={classNames?.footer}>
			<ConsentBanner.PolicyActions
				renderAction={(action, { key, isPrimary, style }) => (
					<button
						key={key}
						type="button"
						className={classes[action]}
						style={style}
						data-primary={isPrimary || undefined}
						data-testid={`consent-banner-${action}-button`}
						onClick={() => {
							void performBannerAction(action);
						}}
					>
						{labels[action]}
					</button>
				)}
			/>
		</div>
	);
};
