import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { ConsentStateContext } from '~/context/consent-manager-context';
import type { ConsentStateContextValue } from '~/context/consent-manager-context';
import { GlobalThemeContext, LocalThemeContext } from '~/context/theme-context';
import type { ThemeContextValue } from '~/context/theme-context';

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
