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

const STORAGE_KEY = 'c15t-example-demo-theme';
const TRANSITION_STYLE_ID = 'c15t-disable-transitions';

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

export function disableTransitionsTemporarily() {
	if (typeof window === 'undefined') {
		return;
	}

	const existingStyle = document.getElementById(TRANSITION_STYLE_ID);

	if (existingStyle) {
		existingStyle.remove();
	}

	const style = document.createElement('style');
	style.id = TRANSITION_STYLE_ID;
	style.textContent =
		'* , *::before, *::after { transition: none !important; animation: none !important; }';
	document.head.appendChild(style);

	void window.getComputedStyle(document.body).opacity;

	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			style.remove();
		});
	});
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
				disableTransitionsTemporarily();
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
