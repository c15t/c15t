'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { type ThemePresetName, themePresets } from './theme-presets';

const presetInfo: Record<
	ThemePresetName,
	{ label: string; icon: string; description: string }
> = {
	minimal: {
		label: 'Minimal',
		icon: '◻️',
		description: 'Standard CSS',
	},
	dark: {
		label: 'Dark Mode',
		icon: '🌙',
		description: 'Always dark',
	},
	full: {
		label: 'Enterprise',
		icon: '🏢',
		description: 'Full width banner',
	},
	tailwind: {
		label: 'Tailwind',
		icon: '🌊',
		description: 'Uses app variables',
	},
	none: {
		label: 'Default',
		icon: '⚙️',
		description: 'No theme preset',
	},
};

interface ThemeSwitcherProps {
	value: ThemePresetName;
	onChange: (theme: ThemePresetName) => void;
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
	return (
		<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
			<span className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
				Theme Preset
			</span>
			{(Object.keys(themePresets) as ThemePresetName[]).map((preset) => {
				const info = presetInfo[preset];
				const isActive = value === preset;
				return (
					<button
						key={preset}
						type="button"
						onClick={() => onChange(preset)}
						className={cn(
							'flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all',
							isActive
								? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
								: 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
						)}
					>
						<span className="text-lg">{info.icon}</span>
						<div className="flex flex-col">
							<span className="text-sm font-medium">{info.label}</span>
							<span
								className={`text-xs ${isActive ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}
							>
								{info.description}
							</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}

export function useThemePreset() {
	const [preset, setPreset] = useState<ThemePresetName>('minimal');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const saved = localStorage.getItem('c15t-theme-preset') as ThemePresetName;
		if (saved && themePresets[saved]) {
			setPreset(saved);
		}
	}, []);

	const setThemePreset = useCallback((name: ThemePresetName) => {
		setPreset(name);
		localStorage.setItem('c15t-theme-preset', name);
	}, []);

	return {
		preset,
		setThemePreset,
		theme: themePresets[preset],
		mounted,
	};
}
