import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import type { InitialDataPromise } from '../../types';
import { enrichOptions } from './utils/enrich-options';

/**
 * Base props for the consent manager provider
 */
type BaseProviderProps = {
	children: ConsentManagerProviderProps['children'];
};

/**
 * Props when using c15t mode - initialData is required
 */
type C15tModeProps = BaseProviderProps & {
	options: Omit<ConsentManagerProviderProps['options'], 'overrides'> & {
		mode?: 'c15t' | undefined;
	};
	initialData: InitialDataPromise;
};

/**
 * Props when using other modes - initialData is not needed
 */
type OtherModeProps = BaseProviderProps & {
	options: ConsentManagerProviderProps['options'] & {
		mode: 'offline' | 'custom';
	};
	initialData?: never;
};

/**
 * Conditional props based on the mode
 */
type SharedProviderProps = C15tModeProps | OtherModeProps;

export function ConsentManagerProvider(props: SharedProviderProps) {
	const { children, options } = props;

	// Only access initialData if it exists (c15t mode)
	const initialData = 'initialData' in props ? props.initialData : undefined;

	// enrichOptions handles the overrides logic internally:
	// - In c15t mode (when initialData exists), it sets overrides to undefined
	// - In other modes, it passes through the options as-is
	return (
		<ClientConsentManagerProvider
			options={enrichOptions({
				options,
				initialData,
				usingAppDir: false,
			})}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
