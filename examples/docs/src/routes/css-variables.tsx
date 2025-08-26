import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/css-variables')({
	component: CssVariables,
});

function CssVariables() {
	const bgColor = '#FFFFFF';
	const bgColorDark = '#000000';
	const primaryColor = 'hsl(172 72.2% 48%)';
	const primaryColorHover = 'hsl(172 72% 48% / 0.1)';
	const focusRing = `${primaryColor} !important`;
	const focusShadow = `0 0 0 2px ${primaryColor}`;

	const baseTheme = {
		style: {
			'--button-focus-ring-dark': primaryColor,
			'--button-focus-ring': primaryColor,
			'--button-primary-dark': primaryColor,
			'--button-primary': primaryColor,
			'--button-shadow-primary-dark': `var(--button-shadow-dark), inset 0 0 0 1px ${primaryColor}`,
			'--button-shadow-primary-focus-dark': focusShadow,
			'--button-shadow-primary-focus': focusShadow,
			'--button-shadow-primary': `var(--button-shadow), inset 0 0 0 1px ${primaryColor}`,
			'--button-primary-hover-dark': primaryColorHover,
			'--button-primary-hover': primaryColorHover,
		},
	};

	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				consentCategories: [
					'experience',
					'marketing',
					'functionality',
					'necessary',
				],
			}}
		>
			<CookieBanner
				theme={{
					'banner.root': {
						style: {
							...baseTheme.style,
							'--banner-background-color-dark': bgColorDark,
							'--banner-background-color': bgColor,
							'--banner-footer-background-color-dark': '#000000',
							'--banner-footer-background-color': bgColor,
						},
					},
				}}
			/>
			<ConsentManagerDialog
				theme={{
					'dialog.root': {
						style: {
							...baseTheme.style,
							'--accordion-focus-ring-dark': focusRing,
							'--accordion-focus-ring': focusRing,
							'--accordion-focus-shadow-dark': focusShadow,
							'--accordion-focus-shadow': focusShadow,
							'--dialog-background-color-dark': bgColorDark,
							'--dialog-background-color': bgColor,
							'--dialog-branding-focus-color-dark': `var(--button-shadow), inset 0 0 0 1px ${primaryColor}`,
							'--dialog-branding-focus-color': `var(--button-shadow), inset 0 0 0 1px ${primaryColor}`,
							'--dialog-footer-background-color-dark': bgColorDark,
							'--switch-background-color-checked-dark': primaryColor,
							'--switch-background-color-checked': primaryColor,
							'--switch-background-color-unchecked-dark': bgColorDark,
							'--switch-background-color-unchecked': bgColor,
							'--switch-focus-shadow-dark': focusShadow,
							'--switch-focus-shadow': focusShadow,
							'--widget-accordion-background-color-dark': bgColorDark,
							'--widget-accordion-background-color': bgColor,
						},
					},
				}}
			/>
		</ConsentManagerProvider>
	);
}
