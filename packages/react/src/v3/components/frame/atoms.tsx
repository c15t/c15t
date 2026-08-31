import type { AllConsentNames } from '@c15t/core';
import styles from '@c15t/ui/styles/v3/frame';
import { forwardRef } from 'react';
import type { Ref } from 'react';

import { useTranslations } from '~/v3/component-hooks/use-translations';

import { Box } from '../shared/primitives/box';
import type { BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';

const FrameRoot = forwardRef<HTMLDivElement, Omit<BoxProps, 'slotKey'>>(
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function FrameRoot({ children, ...props }, ref) {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.placeholder}
				{...props}
			>
				{children}
			</Box>
		);
	}
);

const FrameTitle = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'> & { category?: AllConsentNames }
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function FrameTitle({ children, category, ...props }, ref) {
	const { frame, consentTypes } = useTranslations();

	const defaultTitle =
		category && frame?.title
			? frame.title.replace(
					'{category}',
					consentTypes?.[category as keyof typeof consentTypes]?.title ??
						category
				)
			: undefined;

	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			{...props}
		>
			{children ?? defaultTitle}
		</Box>
	);
});

const FrameButton = forwardRef<
	HTMLButtonElement,
	Omit<ConsentButtonProps, 'slotKey'> & { category: AllConsentNames }
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function FrameButton({ children, category, ...props }, ref) {
	const { frame } = useTranslations();

	const defaultText = frame?.actionButton?.replace('{category}', category);

	return (
		<ConsentButton
			{...props}
			ref={ref}
			action="set-consent"
			category={category}
		>
			{children ?? defaultText}
		</ConsentButton>
	);
});

FrameRoot.displayName = 'FrameRoot';
FrameTitle.displayName = 'FrameTitle';
FrameButton.displayName = 'FrameButton';

export { FrameButton, FrameRoot, FrameTitle };
