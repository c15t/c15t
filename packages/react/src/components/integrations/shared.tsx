'use client';

import type { AllConsentNames } from '@c15t/core';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { FrameButton, FrameRoot, FrameTitle } from '../frame';

export function IntegrationPlaceholder({
	category,
	children,
	showButton = true,
	...props
}: {
	category: AllConsentNames;
	children?: ReactNode;
	showButton?: boolean;
} & Omit<ComponentPropsWithoutRef<typeof FrameRoot>, 'children'>) {
	return (
		<FrameRoot {...props}>
			<FrameTitle category={category}>{children}</FrameTitle>
			{showButton && <FrameButton category={category} />}
		</FrameRoot>
	);
}

export function IntegrationStatus({
	category,
	status,
}: {
	category: AllConsentNames;
	status: 'error' | 'loading';
}) {
	const { frame } = useTranslations();
	const isLoading = status === 'loading';

	return (
		<IntegrationPlaceholder
			aria-live={isLoading ? 'polite' : 'assertive'}
			category={category}
			role={isLoading ? 'status' : 'alert'}
			showButton={false}
		>
			{isLoading
				? (frame?.loading ?? 'Loading content…')
				: (frame?.error ?? 'This content could not be loaded.')}
		</IntegrationPlaceholder>
	);
}
