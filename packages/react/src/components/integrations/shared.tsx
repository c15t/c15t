'use client';

import type { AllConsentNames } from 'c15t';
import type { ReactNode } from 'react';
import { FrameButton, FrameRoot, FrameTitle } from '../frame';

export function IntegrationPlaceholder({
	category,
	children,
	showButton = true,
}: {
	category: AllConsentNames;
	children?: ReactNode;
	showButton?: boolean;
}) {
	return (
		<FrameRoot>
			<FrameTitle category={category}>{children}</FrameTitle>
			{showButton ? <FrameButton category={category} /> : null}
		</FrameRoot>
	);
}
