import { frameStyles } from '@c15t/styles/components/frame/css';
import type { AllConsentNames } from 'c15t';
import { forwardRef, type Ref } from 'react';
import { Box, type BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';

const FrameRoot = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={frameStyles.placeholder}
				themeKey="frame.placeholder.root"
				{...props}
			>
				{children}
			</Box>
		);
	}
);

const FrameTitle = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={frameStyles.title}
				themeKey="frame.placeholder.title"
				{...props}
			>
				{children}
			</Box>
		);
	}
);

const FrameButton = forwardRef<
	HTMLButtonElement,
	Omit<ConsentButtonProps, 'themeKey'> & { category: AllConsentNames }
>(({ children, category, ...props }, ref) => {
	return (
		<ConsentButton
			{...props}
			ref={ref}
			action="set-consent"
			themeKey="frame.placeholder.button"
			variant="primary"
			category={category}
		>
			{children}
		</ConsentButton>
	);
});

FrameRoot.displayName = 'FrameRoot';
FrameTitle.displayName = 'FrameTitle';
FrameButton.displayName = 'FrameButton';

export { FrameRoot, FrameTitle, FrameButton };
