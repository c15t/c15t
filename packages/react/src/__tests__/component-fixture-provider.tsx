import type { ConsentState, KernelConfig, ResolvedPolicy } from '@c15t/core';
import type { ReactNode } from 'react';
import { useContext, useEffect, useMemo } from 'react';

import { KernelContext } from '../context';
import { IABProvider } from '../iab-context';
import type { IABProviderProps } from '../iab-context';
import { ConsentProvider } from '../provider';
import type { ConsentProviderOptions } from '../provider';
import { policyFixture } from './policy-fixture';

/** Older component fixtures describe appearance and setup using their original data shape.
 * Translate that test data into current policy, presentation and explicit IAB composition.
 * This helper is test-only; it does not restore removed consumer APIs.
 */
export interface ComponentFixtureOptions extends Omit<
	ConsentProviderOptions,
	'prefetch'
> {
	prefetch?: KernelConfig;
	offlinePolicy?: { policy: ResolvedPolicy };
	iab?: Omit<IABProviderProps, 'children'>;
}
const OpenFixtureSurface = ({ mode }: { mode?: string }) => {
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
	const configured = useMemo(() => {
		const source =
			options.prefetch?.initialPolicy ?? options.offlinePolicy?.policy;
		if (!source) {
			return { ...options, prefetch: options.prefetch ?? policyFixture() };
		}
		const model = source.model === 'none' ? 'opt-out' : source.model;
		const prefetch: KernelConfig = {
			...options.prefetch,
			...policyFixture(
				options.prefetch?.initialHasConsented
					? (options.prefetch.initialConsents as Partial<ConsentState>)
					: undefined,
				{
					categories: source.consent?.categories?.filter(
						(category) => category !== 'necessary'
					),
					id: source.id,
					model,
					prompt: source.model === 'none' ? 'none' : 'choice',
					scopeMode: source.consent?.scopeMode ?? 'strict',
				}
			),
			initialTranslations: options.prefetch?.initialTranslations,
		};
		return {
			...options,
			prefetch,
			presentation: options.presentation ?? {
				preferences: source.ui?.dialog,
				prompt: source.ui?.banner,
			},
		};
	}, [options]);
	const content = (
		<>
			<OpenFixtureSurface
				mode={
					(options.prefetch?.initialPolicy ?? options.offlinePolicy?.policy)?.ui
						?.mode
				}
			/>
			{children}
		</>
	);
	return (
		<ConsentProvider options={configured}>
			{options.iab ? (
				<IABProvider {...options.iab}>{content}</IABProvider>
			) : (
				content
			)}
		</ConsentProvider>
	);
};
