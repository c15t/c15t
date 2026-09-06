'use client';

import type { AllConsentNames } from '@c15t/core';
import { forwardRef as createForwardRef, useEffect, useState } from 'react';

import { useConsentManager } from '~/component-hooks/use-consent-manager';
import { useTranslations } from '~/component-hooks/use-translations';
import { useIsHydrated } from '~/hooks/use-is-hydrated';

import { FrameButton, FrameRoot, FrameTitle } from './atoms';
import type { FrameProps } from './types';

const DefaultPlaceholder = ({
	category,
	policyBlocked,
	policyBlockedMessage,
}: {
	category: AllConsentNames;
	policyBlocked: boolean;
	policyBlockedMessage?: string;
}) => (
	<FrameRoot>
		<FrameTitle category={category}>
			{policyBlocked
				? (policyBlockedMessage ??
					"This content is unavailable under your region's consent policy.")
				: undefined}
		</FrameTitle>
		{policyBlocked ? null : <FrameButton category={category} />}
	</FrameRoot>
);
const FrameComponent = createForwardRef<HTMLDivElement, FrameProps>(
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
		const {
			has,
			updateConsentCategories,
			consentCategories,
			policyCategories,
			policyScopeMode,
		} = useConsentManager();
		const { frame } = useTranslations();
		const isMounted = useIsHydrated();
		const [isReady, setIsReady] = useState(false);

		const hasConsent = has(category);
		const hasPolicyScope =
			Array.isArray(policyCategories) &&
			policyCategories.length > 0 &&
			!(policyCategories as readonly string[]).includes('*');
		const isOutOfPolicyCategory =
			hasPolicyScope && !policyCategories.includes(category);
		const isStrictPolicyBlocked =
			policyScopeMode === 'strict' && isOutOfPolicyCategory;

		useEffect(() => {
			if (!consentCategories.includes(category)) {
				updateConsentCategories([...consentCategories, category]);
			}
		}, [category, consentCategories, updateConsentCategories]);

		// Wait for next frame to ensure styles are loaded
		useEffect(() => {
			if (isMounted) {
				requestAnimationFrame(() => {
					setIsReady(true);
				});
			}
		}, [isMounted]);

		const renderContent = () => {
			// Before ready, show nothing to prevent FOUC
			if (!isMounted || !isReady) {
				return null;
			}

			// After ready, show children if consent is granted
			if (hasConsent) {
				return children;
			}

			// Otherwise show placeholder
			return (
				placeholder || (
					<DefaultPlaceholder
						category={category}
						policyBlocked={isStrictPolicyBlocked}
						policyBlockedMessage={frame?.policyBlocked}
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

FrameComponent.displayName = 'Frame';

export const Frame = FrameComponent;
