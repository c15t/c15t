import type { AllConsentNames } from '@c15t/core';
import styles from '@c15t/ui/styles/components/consent-gate';
import { forwardRef as createForwardRef } from 'react';
import type { Ref } from 'react';

import { resolveConsentGateCopy } from '~/component-hooks/use-consent-gate';
import { useTranslations } from '~/component-hooks/use-translations';
import { useUIConfig } from '~/ui-config-context';
import { getSlotProps, mergeSlotProps } from '~/utils/merge-slot-props';

import { FIRST_PAINT_SHEETS } from '../shared/first-paint-sheets';
import { Box } from '../shared/primitives/box';
import type { BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';
import { SurfaceStyles, useSurfaceSheetsReady } from '../shared/surface-styles';

const ConsentGateRoot = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => {
	// A gate the browser renders first, after a client-side navigation,
	// waits for a deferred sheet rather than paint unstyled.
	const sheetsReady = useSurfaceSheetsReady(FIRST_PAINT_SHEETS, props.noStyle);
	if (!sheetsReady) {
		return null;
	}
	return (
		<>
			<SurfaceStyles
				sheets={FIRST_PAINT_SHEETS}
				noStyle={props.noStyle}
			/>
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.placeholder}
				data-testid="consent-gate-placeholder"
				slotKey="consent-gate.root"
				{...props}
			>
				{children}
			</Box>
		</>
	);
});

const ConsentGateTitle = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'> & { category?: AllConsentNames }
>(({ children, category, ...props }, ref) => {
	const translations = useTranslations();
	const defaultTitle = category
		? resolveConsentGateCopy(translations, category).title
		: undefined;

	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			data-testid="consent-gate-title"
			slotKey="consent-gate.title"
			{...props}
		>
			{children ?? defaultTitle}
		</Box>
	);
});

const ConsentGateButton = createForwardRef<
	HTMLButtonElement,
	Omit<ConsentButtonProps, 'slotKey'> & { category: AllConsentNames }
>(({ children, category, className, style, ...props }, ref) => {
	const translations = useTranslations();
	const { components } = useUIConfig();
	// The gate's slot goes on top of `button.primary`, which the button
	// applies itself. The button's own class and style win over both.
	const slotProps = mergeSlotProps(
		getSlotProps(components, 'consent-gate.button'),
		{ className, style }
	);

	const defaultText = resolveConsentGateCopy(
		translations,
		category
	).actionLabel;

	return (
		<ConsentButton
			mode="stroke"
			size="small"
			variant="primary"
			{...slotProps}
			{...props}
			ref={ref}
			action="open-consent-dialog"
			category={category}
			data-testid="consent-gate-button"
		>
			{children ?? defaultText}
		</ConsentButton>
	);
});

ConsentGateRoot.displayName = 'ConsentGateRoot';
ConsentGateTitle.displayName = 'ConsentGateTitle';
ConsentGateButton.displayName = 'ConsentGateButton';

export { ConsentGateButton, ConsentGateRoot, ConsentGateTitle };
