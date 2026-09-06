import type { AllConsentNames } from '@c15t/core';
import styles from '@c15t/ui/styles/components/frame';
import { forwardRef as createForwardRef } from 'react';
import type { Ref } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';

import { Box } from '../shared/primitives/box';
import type { BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';

const FrameRoot = createForwardRef<HTMLDivElement, Omit<BoxProps, 'slotKey'>>(
	({ children, ...props }, ref) => (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.placeholder}
			data-testid="frame-placeholder"
			{...props}
		>
			{children}
		</Box>
	)
);

const FrameTitle = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'> & { category?: AllConsentNames }
>(({ children, category, ...props }, ref) => {
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

const FrameButton = createForwardRef<
	HTMLButtonElement,
	Omit<ConsentButtonProps, 'slotKey'> & { category: AllConsentNames }
>(({ children, category, ...props }, ref) => {
	const { frame, consentTypes } = useTranslations();

	const categoryTitle =
		consentTypes?.[category as keyof typeof consentTypes]?.title ?? category;
	const defaultText = frame?.actionButton?.replace('{category}', categoryTitle);

	return (
		<ConsentButton
			mode="stroke"
			size="small"
			variant="primary"
			{...props}
			ref={ref}
			action="open-consent-dialog"
			category={category}
			data-testid="frame-open-dialog"
		>
			{children ?? defaultText}
		</ConsentButton>
	);
});

FrameRoot.displayName = 'FrameRoot';
FrameTitle.displayName = 'FrameTitle';
FrameButton.displayName = 'FrameButton';

export { FrameButton, FrameRoot, FrameTitle };
