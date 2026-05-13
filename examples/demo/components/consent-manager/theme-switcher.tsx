'use client';

import { Check, ChevronDown, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '../../lib/utils';
import { disableTransitionsTemporarily, useTheme } from '../theme-provider';
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
	disableTransitionsTemporarily();
	_preset = name;
	localStorage.setItem('c15t-theme-preset', name);
	for (const l of _listeners) l();
}

const presetInfo: Record<
	ThemePresetName,
	{ label: string; description: string }
> = {
	none: {
		label: 'Default',
		description: 'Base c15t styling',
	},
	minimal: {
		label: 'Minimal',
		description: 'Standard CSS',
	},
	dark: {
		label: 'Dark',
		description: 'Always dark',
	},
	tailwind: {
		label: 'App',
		description: 'Follows demo tokens',
	},
};

const colorModes = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor },
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
				className="h-9 rounded-full border-border/80 px-3 text-foreground shadow-none"
				aria-expanded={open}
				aria-label="Theme settings"
				aria-haspopup="menu"
				onClick={() => setOpen((prev) => !prev)}
			>
				<Palette className="size-4" />
				<span className="font-medium text-sm">Theme</span>
				<ChevronDown
					className={cn('size-4 transition-transform', open && 'rotate-180')}
				/>
			</Button>
			{open && <ThemeSwitcherPanel />}
		</div>
	);
}

function ThemeSwitcherPanel() {
	const { preset, setThemePreset } = useThemePreset();
	const { theme: colorMode, setTheme: setColorMode } = useTheme();

	return (
		<div className="absolute top-full right-0 z-[60] mt-3 w-[20rem] rounded-[1.25rem] border border-border/80 bg-background p-3 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.28)]">
			<div className="space-y-1 border-b border-border/80 px-1 pb-3">
				<p className="label-pixel text-muted-foreground">Theme</p>
				<p className="text-sm text-muted-foreground">
					Keep the demo on the base UI or swap in a preset.
				</p>
			</div>

			<div className="mt-3 grid gap-2">
				{(Object.keys(themePresets) as ThemePresetName[]).map((presetKey) => {
					const info = presetInfo[presetKey];
					const isActive = preset === presetKey;

					return (
						<button
							key={presetKey}
							type="button"
							onClick={() => setThemePreset(presetKey)}
							className={cn(
								'flex items-start justify-between rounded-2xl border px-3 py-3 text-left transition-colors',
								isActive
									? 'border-foreground bg-foreground text-background'
									: 'border-border/80 bg-background text-foreground hover:border-foreground/30'
							)}
						>
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="font-medium text-sm">{info.label}</span>
								<span
									className={cn(
										'text-xs leading-5',
										isActive ? 'text-background/70' : 'text-muted-foreground'
									)}
								>
									{info.description}
								</span>
							</div>
							<span
								className={cn(
									'flex size-5 shrink-0 items-center justify-center rounded-full border',
									isActive
										? 'border-background/30 bg-background/10 text-background'
										: 'border-border/80 text-transparent'
								)}
							>
								<Check className="size-3.5" />
							</span>
						</button>
					);
				})}
			</div>

			<div className="mt-3 border-t border-border/80 px-1 pt-3">
				<p className="label-pixel text-muted-foreground">Color mode</p>
				<div className="mt-2 grid grid-cols-3 gap-2">
					{colorModes.map((mode) => {
						const Icon = mode.icon;

						return (
							<button
								key={mode.value}
								type="button"
								onClick={() => setColorMode(mode.value)}
								className={cn(
									'flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
									colorMode === mode.value
										? 'border-foreground bg-foreground text-background'
										: 'border-border/80 text-foreground hover:border-foreground/30'
								)}
							>
								<Icon className="size-3.5" />
								<span>{mode.label}</span>
							</button>
						);
					})}
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
