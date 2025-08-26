import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/theme-context';

interface ThemeToggleProps {
	className?: string;
	compact?: boolean;
}

export function ThemeToggle({
	className = '',
	compact = false,
}: ThemeToggleProps): React.JSX.Element {
	const { theme, setTheme, resolvedTheme } = useTheme();

	const handleThemeChange = (
		event: React.ChangeEvent<HTMLSelectElement>
	): void => {
		const newTheme = event.target.value as 'light' | 'dark' | 'system';
		setTheme(newTheme);
	};

	const handleToggleClick = (): void => {
		const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
	};

	if (compact) {
		return (
			<div className="floating-theme-toggle">
				<button
					type="button"
					onClick={handleToggleClick}
					className={`theme-toggle-compact ${className}`}
					aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
					title={`Current: ${resolvedTheme}, Click to switch`}
				>
					{resolvedTheme === 'light' ? <Moon /> : <Sun />}
				</button>
			</div>
		);
	}

	return (
		<div className={`theme-toggle ${className}`}>
			<label htmlFor="theme-select" className="theme-toggle__label">
				Theme:
			</label>
			<select
				id="theme-select"
				value={theme}
				onChange={handleThemeChange}
				className="theme-toggle__select"
				aria-label="Select theme mode"
			>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
				<option value="system">System</option>
			</select>
			<button
				type="button"
				onClick={handleToggleClick}
				className="theme-toggle__button"
				aria-label={`Quick toggle to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
				title="Quick toggle theme"
			>
				{resolvedTheme === 'light' ? <Moon /> : <Sun />}
			</button>
		</div>
	);
}
