'use client';

/**
 * Client islands for the RSC consent banner (`@c15t/nextjs/v3/rsc`).
 *
 * These are the ONLY parts of the banner that ship to and hydrate in the
 * browser — the banner shell (markup, copy, layout) is a Server Component
 * and never enters the client bundle.
 */

import { useActiveUI, useSaveConsents, useSetActiveUI } from '@c15t/react/v3';
import type { ReactNode } from 'react';

/**
 * Visibility gate. The server decides the initial state (the shell is only
 * rendered when the banner should show), so first paint is correct before
 * hydration; after hydration this keeps the DOM in sync with the kernel
 * (e.g. removes the banner after consent is saved).
 */
export function RscBannerGate({ children }: { children: ReactNode }) {
	const activeUI = useActiveUI();
	if (activeUI !== 'banner') {
		return null;
	}
	return children;
}

export interface RscBannerActionsProps {
	acceptLabel: string;
	rejectLabel: string;
	customizeLabel: string;
	classNames?: {
		footer?: string;
		acceptButton?: string;
		rejectButton?: string;
		customizeButton?: string;
	};
}

/** The interactive button row — the banner's one true client island. */
export function RscBannerActions({
	acceptLabel,
	rejectLabel,
	customizeLabel,
	classNames,
}: RscBannerActionsProps) {
	const save = useSaveConsents();
	const setActiveUI = useSetActiveUI();

	return (
		<div
			className={classNames?.footer}
			data-testid="consent-banner-footer"
		>
			<button
				className={classNames?.rejectButton}
				data-testid="consent-banner-reject-button"
				onClick={() => void save('none')}
				type="button"
			>
				{rejectLabel}
			</button>
			<button
				className={classNames?.customizeButton}
				data-testid="consent-banner-customize-button"
				onClick={() => setActiveUI('dialog')}
				type="button"
			>
				{customizeLabel}
			</button>
			<button
				className={classNames?.acceptButton}
				data-testid="consent-banner-accept-button"
				onClick={() => void save('all')}
				type="button"
			>
				{acceptLabel}
			</button>
		</div>
	);
}
