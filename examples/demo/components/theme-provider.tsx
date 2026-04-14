'use client';

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
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

function resolveInitialTheme(
	defaultTheme: ThemeMode,
	enableSystem: boolean
): ThemeMode {
	if (typeof window === 'undefined') {
		return defaultTheme;
	}

	const storedTheme = window.localStorage.getItem(STORAGE_KEY);
	if (storedTheme === 'light' || storedTheme === 'dark') {
		return storedTheme;
	}

	if (storedTheme === 'system' && enableSystem) {
		return storedTheme;
	}

	return defaultTheme;
}

function resolveThemeMode(
	theme: ThemeMode,
	enableSystem: boolean
): ResolvedTheme {
	if (theme === 'system' && enableSystem) {
		return getSystemTheme();
	}

	return theme === 'dark' ? 'dark' : 'light';
}

type ThemeProviderProps = {
	children: ReactNode;
	defaultTheme?: ThemeMode;
	enableSystem?: boolean;
};

export function ThemeProvider({
	children,
	defaultTheme = 'light',
	enableSystem = true,
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<ThemeMode>(() =>
		resolveInitialTheme(defaultTheme, enableSystem)
	);
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
		resolveThemeMode(
			resolveInitialTheme(defaultTheme, enableSystem),
			enableSystem
		)
	);

	useEffect(() => {
		const nextTheme = resolveInitialTheme(defaultTheme, enableSystem);
		setThemeState(nextTheme);
		setResolvedTheme(resolveThemeMode(nextTheme, enableSystem));
	}, [defaultTheme, enableSystem]);

	useLayoutEffect(() => {
		applyTheme(resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		const syncTheme = () => {
			setResolvedTheme(resolveThemeMode(theme, enableSystem));
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
				setResolvedTheme(resolveThemeMode(nextTheme, enableSystem));
				window.localStorage.setItem(STORAGE_KEY, nextTheme);
			},
		}),
		[enableSystem, resolvedTheme, theme]
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
