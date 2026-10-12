import type { KernelActiveUI } from '@c15t/core';
import { CONSENT_STORAGE_KEY } from '@c15t/core/modules/persistence';
import type { ReactNode } from 'react';
import { useContext, useEffect, useId } from 'react';

import { KernelContext } from '../context';
import { IABProvider } from '../iab-context';
import type { IABProviderProps } from '../iab-context';
import { ConsentProvider } from '../provider';
import type { ConsentProviderOptions } from '../provider';
import { policyFixture } from './policy-fixture';

/**
 * Browser test files share one origin, so a record another file stores (or
 * its `storage` event) would reach this fixture's runtime. Each fixture gets
 * a key no other file uses: this file's random prefix plus the fixture's id.
 */
const FILE_PREFIX = crypto.randomUUID().slice(0, 8);

/**
 * The default storage key, for tests that seed or read it directly. Such a
 * test shares storage with every other file that does, so it must clear
 * storage itself.
 */
export const DEFAULT_KEY_STORAGE = { storageKey: CONSENT_STORAGE_KEY };

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
	// Each fixture gets its own records unless the test names a storage
	// key, and reconciles only when the test configures persistence.
	const storageKey = `c15t-fixture-${FILE_PREFIX}-${useId().replace(/[^a-z0-9]/giu, '')}`;
	const content = (
		<>
			<OpenFixtureSurface mode={options.initialUI} />
			{children}
		</>
	);
	return (
		<ConsentProvider
			options={{
				...options,
				persistence: options.persistence ?? { sync: false },
				prefetch: options.prefetch ?? policyFixture(),
				storageConfig: options.storageConfig ?? { storageKey },
			}}
		>
			{options.iab ? (
				<IABProvider {...options.iab}>{content}</IABProvider>
			) : (
				content
			)}
		</ConsentProvider>
	);
};
