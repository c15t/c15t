'use client';

import type { ReactNode } from 'react';

import { GlobalThemeContext } from './context/theme-context';
import type { ThemeContextValue } from './context/theme-context';
import { V3UIConfigContext } from './ui-config-context';
import type { V3UIConfigValue } from './ui-config-context';

interface V3ThemeProviderProps {
	themeConfig: ThemeContextValue;
	uiConfig: V3UIConfigValue;
	children: ReactNode;
}

export function V3ThemeProvider({
	themeConfig,
	uiConfig,
	children,
}: V3ThemeProviderProps) {
	return (
		<V3UIConfigContext.Provider value={uiConfig}>
			<GlobalThemeContext.Provider value={themeConfig}>
				{children}
			</GlobalThemeContext.Provider>
		</V3UIConfigContext.Provider>
	);
}
