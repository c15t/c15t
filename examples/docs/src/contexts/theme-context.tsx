import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from 'react';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextValue {
	theme: ThemeType;
	resolvedTheme: 'light' | 'dark';
	setTheme: (theme: ThemeType) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
	children: ReactNode;
	defaultTheme?: ThemeType;
	storageKey?: string;
}

export function ThemeProvider({
	children,
	defaultTheme = 'system',
	storageKey = 'docs-theme',
}: ThemeProviderProps): React.JSX.Element {
	const [theme, setThemeState] = useState<ThemeType>(() => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem(storageKey);
			if (
				stored &&
				(stored === 'light' || stored === 'dark' || stored === 'system')
			) {
				return stored as ThemeType;
			}
		}
		return defaultTheme;
	});

	const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const root = window.document.documentElement;

		// Remove existing theme classes
		root.classList.remove('light', 'dark');

		// Determine the actual theme to apply
		let newResolvedTheme: 'light' | 'dark';

		if (theme === 'system') {
			newResolvedTheme = window.matchMedia('(prefers-color-scheme: dark)')
				.matches
				? 'dark'
				: 'light';
		} else {
			newResolvedTheme = theme;
		}

		// Apply the resolved theme
		root.classList.add(newResolvedTheme);
		setResolvedTheme(newResolvedTheme);

		// Store theme preference
		localStorage.setItem(storageKey, theme);
	}, [theme, storageKey]);

	// Listen for system theme changes
	useEffect(() => {
		if (theme !== 'system') return;

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		const handleChange = () => {
			const newResolvedTheme = mediaQuery.matches ? 'dark' : 'light';
			setResolvedTheme(newResolvedTheme);

			const root = window.document.documentElement;
			root.classList.remove('light', 'dark');
			root.classList.add(newResolvedTheme);
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [theme]);

	const setTheme = (newTheme: ThemeType): void => {
		setThemeState(newTheme);
	};

	const toggleTheme = (): void => {
		setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
	};

	const value: ThemeContextValue = {
		theme,
		resolvedTheme,
		setTheme,
		toggleTheme,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
