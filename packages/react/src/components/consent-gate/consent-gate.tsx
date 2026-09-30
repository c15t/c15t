'use client';

import type { AllConsentNames } from '@c15t/core';
import { forwardRef as createForwardRef, useEffect } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import {
	usePolicyCategories,
	usePolicyScopeMode,
	useRegisterConsentCategories,
} from '~/hooks';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useCategoryAllowed } from '~/kernel-selector';

import { ConsentGateButton, ConsentGateRoot, ConsentGateTitle } from './atoms';
import type { ConsentGateProps } from './types';

const DefaultPlaceholder = ({
	category,
	policyBlocked,
	policyBlockedMessage,
}: {
	category: AllConsentNames;
	policyBlocked: boolean;
	policyBlockedMessage?: string;
}) => (
	<ConsentGateRoot>
		<ConsentGateTitle category={category}>
			{policyBlocked
				? (policyBlockedMessage ??
					"This content is unavailable under your region's consent policy.")
				: undefined}
		</ConsentGateTitle>
		{policyBlocked ? null : <ConsentGateButton category={category} />}
	</ConsentGateRoot>
);
const ConsentGateComponent = createForwardRef<HTMLDivElement, ConsentGateProps>(
	(
		{
			children,
			category,
			placeholder,
			noStyle: _noStyle,
			className,
			theme: _theme,
			...props
		},
		ref
	) => {
		// Never reads the clock while server rendering, so the gate can sit in
		// a statically prerendered page.
		const hasConsent = useCategoryAllowed(category);
		const isHydrated = useIsHydrated();
		const policyScope = usePolicyCategories();
		const policyScopeMode = usePolicyScopeMode();
		const updateConsentCategories = useRegisterConsentCategories();
		const { consentGate } = useTranslations();

		// `necessary` is always in scope; a wildcard scope covers every category.
		const isOutOfPolicyCategory =
			category !== 'necessary' &&
			!(policyScope as readonly string[]).includes('*') &&
			!policyScope.includes(category);
		const isStrictPolicyBlocked =
			policyScopeMode === 'strict' && isOutOfPolicyCategory;

		useEffect(() => {
			updateConsentCategories([category]);
		}, [category, updateConsentCategories]);

		const renderContent = () => {
			// The kernel supplies the same permission snapshot for SSR and hydration.
			if (hasConsent) {
				// Granted children mount after hydration, never in the server
				// HTML. When the gate streams inside a Suspense boundary, React
				// parses that HTML into a hidden segment and then moves it into
				// place, and moving an iframe reloads it: an embed in the server
				// HTML would load twice.
				return isHydrated ? children : null;
			}

			// Otherwise show placeholder
			return (
				placeholder || (
					<DefaultPlaceholder
						category={category}
						policyBlocked={isStrictPolicyBlocked}
						policyBlockedMessage={consentGate?.policyBlocked}
					/>
				)
			);
		};

		return (
			<div
				ref={ref}
				className={className}
				{...props}
			>
				{renderContent()}
			</div>
		);
	}
);

ConsentGateComponent.displayName = 'ConsentGate';

export const ConsentGate = ConsentGateComponent;
