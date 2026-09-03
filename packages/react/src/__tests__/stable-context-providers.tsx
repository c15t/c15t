import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { TriggerContext } from '~/components/consent-dialog-trigger/atoms/root';
import type { TriggerContextValue } from '~/components/consent-dialog-trigger/atoms/root';
import { GlobalThemeContext, LocalThemeContext } from '~/context/theme-context';
import type { ThemeContextValue } from '~/context/theme-context';
import { V3UIConfigContext } from '~/ui-config-context';
import type { V3UIConfigValue } from '~/ui-config-context';

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
