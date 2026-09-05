import type { KernelActiveUI } from '@c15t/core';
import type { ReactNode } from 'react';
import { useContext, useEffect } from 'react';

import { KernelContext } from '../context';
import { IABProvider } from '../iab-context';
import type { IABProviderProps } from '../iab-context';
import { ConsentProvider } from '../provider';
import type { ConsentProviderOptions } from '../provider';
import { policyFixture } from './policy-fixture';

/** Canonical provider options plus explicit test navigation and IAB composition. */
export interface ComponentFixtureOptions extends ConsentProviderOptions {
	initialUI?: KernelActiveUI;
	iab?: Omit<IABProviderProps, 'children'>;
}
const OpenFixtureSurface = ({ mode }: { mode?: KernelActiveUI }) => {
	const kernel = useContext(KernelContext);
	useEffect(() => {
		if (mode === 'dialog') {
			kernel?.set.activeUI('dialog');
		}
	}, [kernel, mode]);
	return null;
};
export const ComponentFixtureProvider = ({
	options,
	children,
}: {
	options: ComponentFixtureOptions;
	children: ReactNode;
}) => {
	const content = (
		<>
			<OpenFixtureSurface mode={options.initialUI} />
			{children}
		</>
	);
	return (
		<ConsentProvider
			options={{ ...options, prefetch: options.prefetch ?? policyFixture() }}
		>
			{options.iab ? (
				<IABProvider {...options.iab}>{content}</IABProvider>
			) : (
				content
			)}
		</ConsentProvider>
	);
};
