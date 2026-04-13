'use client';

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
	theme: ThemeMode;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: ThemeMode) => void;
};

const STORAGE_KEY = 'pigeon-post-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined') {
		return 'light';
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';
}

function applyTheme(theme: ResolvedTheme) {
	document.documentElement.classList.toggle('dark', theme === 'dark');
	document.documentElement.style.colorScheme = theme;
}

type ThemeProviderProps = {
	attribute?: 'class';
	children: ReactNode;
	defaultTheme?: ThemeMode;
	enableSystem?: boolean;
};

export function ThemeProvider({
	children,
	defaultTheme = 'light',
	enableSystem = true,
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

	useEffect(() => {
		const storedTheme = window.localStorage.getItem(
			STORAGE_KEY
		) as ThemeMode | null;
		const nextTheme =
			storedTheme &&
			(storedTheme === 'light' ||
				storedTheme === 'dark' ||
				(storedTheme === 'system' && enableSystem))
				? storedTheme
				: defaultTheme;

		setThemeState(nextTheme);
	}, [defaultTheme, enableSystem]);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		const syncTheme = () => {
			const nextResolvedTheme =
				theme === 'system' && enableSystem ? getSystemTheme() : theme;

			setResolvedTheme(nextResolvedTheme === 'dark' ? 'dark' : 'light');
			applyTheme(nextResolvedTheme === 'dark' ? 'dark' : 'light');
		};

		syncTheme();
		mediaQuery.addEventListener('change', syncTheme);

		return () => {
			mediaQuery.removeEventListener('change', syncTheme);
		};
	}, [enableSystem, theme]);

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			resolvedTheme,
			setTheme: (nextTheme) => {
				setThemeState(nextTheme);
				window.localStorage.setItem(STORAGE_KEY, nextTheme);
			},
		}),
		[resolvedTheme, theme]
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used within ThemeProvider');
	}

	return context;
}
