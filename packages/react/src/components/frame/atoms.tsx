import type { AllConsentNames } from 'c15t';
import { forwardRef, type Ref } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { Box, type BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';
import styles from './frame.module.css';

const FrameRoot = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.placeholder}
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
					consentTypes?.[category]?.title ?? category
				)
			: undefined;

	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.placeholderTitle}
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
		>
			{children ?? defaultText}
		</ConsentButton>
	);
});

FrameRoot.displayName = 'FrameRoot';
FrameTitle.displayName = 'FrameTitle';
FrameButton.displayName = 'FrameButton';

export { FrameRoot, FrameTitle, FrameButton };
