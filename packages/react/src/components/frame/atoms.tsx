import { TEST_IDS } from '@c15t/conformance/contract/test-ids';
import styles from '@c15t/ui/styles/components/frame.module.js';
import type { AllConsentNames } from 'c15t';
import { forwardRef, type Ref } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { Box, type BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';

const FrameRoot = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.placeholder}
				data-testid={TEST_IDS.frame.placeholder}
				themeKey="frame"
				{...props}
			>
				{children}
			</Box>
		);
	}
);

const FrameTitle = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'> & { category?: AllConsentNames }
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
			themeKey="frame"
			{...props}
		>
			{children ?? defaultTitle}
		</Box>
	);
});

const FrameButton = forwardRef<
	HTMLButtonElement,
	Omit<ConsentButtonProps, 'themeKey'> & { category: AllConsentNames }
>(({ children, category, ...props }, ref) => {
	const { frame } = useTranslations();

	const defaultText = frame?.actionButton?.replace('{category}', category);

	return (
		<ConsentButton
			{...props}
			ref={ref}
			action="set-consent"
			category={category}
			variant="primary"
			mode="stroke"
			size="small"
			data-testid={TEST_IDS.frame.openDialog}
		>
			{children ?? defaultText}
		</ConsentButton>
	);
});

FrameRoot.displayName = 'FrameRoot';
FrameTitle.displayName = 'FrameTitle';
FrameButton.displayName = 'FrameButton';

export { FrameButton, FrameRoot, FrameTitle };
