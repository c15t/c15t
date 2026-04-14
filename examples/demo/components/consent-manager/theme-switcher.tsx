'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../theme-provider';
import { Button } from '../ui/button';
import { type ThemePresetName, themePresets } from './theme-presets';

// Shared module-level store so all useThemePreset() consumers stay in sync
let _preset: ThemePresetName = 'none';
let _initialized = false;
const _listeners = new Set<() => void>();

function _subscribe(listener: () => void) {
	_listeners.add(listener);
	return () => {
		_listeners.delete(listener);
	};
}

function _getSnapshot() {
	return _preset;
}

function _setPreset(name: ThemePresetName) {
	_preset = name;
	localStorage.setItem('c15t-theme-preset', name);
	for (const l of _listeners) l();
}

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

const colorModes = [
	{ value: 'light', label: 'Light', icon: '☀️' },
	{ value: 'dark', label: 'Dark', icon: '🌙' },
	{ value: 'system', label: 'System', icon: '💻' },
] as const;

export function ThemeSwitcherButton() {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<Button
				size="sm"
				variant="outline"
				aria-expanded={open}
				aria-label="Theme settings"
				aria-haspopup="menu"
				onClick={() => setOpen((prev) => !prev)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<title>Theme settings</title>
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
				</svg>
			</Button>
			{open && <ThemeSwitcherPanel />}
		</div>
	);
}

function ThemeSwitcherPanel() {
	const { preset, setThemePreset } = useThemePreset();
	const { theme: colorMode, setTheme: setColorMode } = useTheme();

	return (
		<div className="absolute top-full right-0 z-[60] mt-2 flex w-56 flex-col gap-2 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
			<span className="mb-1 font-medium text-xs text-zinc-500 dark:text-zinc-400">
				Theme Preset
			</span>
			{(Object.keys(themePresets) as ThemePresetName[]).map((presetKey) => {
				const info = presetInfo[presetKey];
				const isActive = preset === presetKey;
				return (
					<button
						key={presetKey}
						type="button"
						onClick={() => setThemePreset(presetKey)}
						className={cn(
							'flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all',
							isActive
								? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
								: 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
						)}
					>
						<span className="text-lg">{info.icon}</span>
						<div className="flex flex-col">
							<span className="font-medium text-sm">{info.label}</span>
							<span
								className={`text-xs ${isActive ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}
							>
								{info.description}
							</span>
						</div>
					</button>
				);
			})}

			<div className="mt-2 border-zinc-200 border-t pt-2 dark:border-zinc-700">
				<span className="mb-1 block font-medium text-xs text-zinc-500 dark:text-zinc-400">
					Color Mode
				</span>
				<div className="flex gap-1">
					{colorModes.map((mode) => (
						<button
							key={mode.value}
							type="button"
							onClick={() => setColorMode(mode.value)}
							className={cn(
								'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-all',
								colorMode === mode.value
									? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
									: 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
							)}
						>
							<span>{mode.icon}</span>
							<span>{mode.label}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

export function useThemePreset() {
	const [mounted, setMounted] = useState(false);
	const preset = useSyncExternalStore(
		_subscribe,
		_getSnapshot,
		() => 'none' as ThemePresetName
	);

	useEffect(() => {
		if (!_initialized) {
			_initialized = true;
			const saved = localStorage.getItem(
				'c15t-theme-preset'
			) as ThemePresetName;
			if (saved && themePresets[saved]) {
				_preset = saved;
				for (const l of _listeners) l();
			}
		}
		setMounted(true);
	}, []);

	return {
		preset,
		setThemePreset: _setPreset,
		theme: themePresets[preset],
		mounted,
	};
}
