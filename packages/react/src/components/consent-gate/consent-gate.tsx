'use client';

import type { AllConsentNames } from '@c15t/core';
import { forwardRef as createForwardRef } from 'react';

import { useConsentGate } from '~/component-hooks/use-consent-gate';

import { ConsentGateButton, ConsentGateRoot, ConsentGateTitle } from './atoms';
import type { ConsentGateProps } from './types';

const DefaultPlaceholder = ({
	category,
	policyBlocked,
	policyBlockedMessage,
}: {
	category: AllConsentNames;
	policyBlocked: boolean;
	policyBlockedMessage: string;
}) => (
	<ConsentGateRoot>
		<ConsentGateTitle category={category}>
			{policyBlocked ? policyBlockedMessage : undefined}
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
		// a statically prerendered page. Registers the category on mount.
		const { state, policyBlockedMessage } = useConsentGate(category);

		const renderContent = () => {
			if (state === 'granted') {
				return children;
			}
			// Granted children wait for hydration; see `useConsentGate`.
			if (state === 'pending') {
				return null;
			}

			// Otherwise show placeholder
			return (
				placeholder || (
					<DefaultPlaceholder
						category={category}
						policyBlocked={state === 'policy-blocked'}
						policyBlockedMessage={policyBlockedMessage}
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
