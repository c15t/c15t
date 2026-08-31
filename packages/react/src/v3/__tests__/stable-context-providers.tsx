import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { TriggerContext } from '~/v3/components/consent-dialog-trigger/atoms/root';
import type { TriggerContextValue } from '~/v3/components/consent-dialog-trigger/atoms/root';
import { ConsentStateContext } from '~/v3/context/consent-manager-context';
import type { ConsentStateContextValue } from '~/v3/context/consent-manager-context';
import {
	GlobalThemeContext,
	LocalThemeContext,
} from '~/v3/context/theme-context';
import type { ThemeContextValue } from '~/v3/context/theme-context';
import { V3UIConfigContext } from '~/v3/ui-config-context';
import type { V3UIConfigValue } from '~/v3/ui-config-context';

export const StableGlobalThemeProvider = ({
	children,
	value,
}: {
	children: ReactNode;
	value: ThemeContextValue;
}) => {
	const contextValue = useMemo(() => value, [value]);

	return (
		<GlobalThemeContext.Provider value={contextValue}>
			{children}
		</GlobalThemeContext.Provider>
	);
};

export const StableLocalThemeProvider = ({
	children,
	value,
}: {
	children: ReactNode;
	value: ThemeContextValue;
}) => {
	const contextValue = useMemo(() => value, [value]);

	return (
		<LocalThemeContext.Provider value={contextValue}>
			{children}
		</LocalThemeContext.Provider>
	);
};

export const StableConsentStateProvider = ({
	children,
	value,
}: {
	children: ReactNode;
	value: ConsentStateContextValue;
}) => {
	const contextValue = useMemo(() => value, [value]);

	return (
		<ConsentStateContext.Provider value={contextValue}>
			{children}
		</ConsentStateContext.Provider>
	);
};

export const StableTriggerProvider = ({
	children,
	value,
}: {
	children: ReactNode;
	value: TriggerContextValue;
}) => {
	const contextValue = useMemo(() => value, [value]);

	return (
		<TriggerContext.Provider value={contextValue}>
			{children}
		</TriggerContext.Provider>
	);
};

export const StableV3UIConfigProvider = ({
	children,
	value,
}: {
	children: ReactNode;
	value: V3UIConfigValue;
}) => {
	const contextValue = useMemo(() => value, [value]);

	return (
		<V3UIConfigContext.Provider value={contextValue}>
			{children}
		</V3UIConfigContext.Provider>
	);
};
