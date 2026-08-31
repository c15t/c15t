import { browser } from '$app/environment';

import { themePresets } from './theme-presets';
import type { ThemePresetName } from './theme-presets';

const createThemePresetStore = function createThemePresetStore() {
	let preset = $state<ThemePresetName>('none');
	let mounted = $state(false);

	if (browser) {
		const saved = localStorage.getItem('c15t-theme-preset') as ThemePresetName;
		if (saved && themePresets[saved] !== undefined) {
			preset = saved;
		}
		mounted = true;
	}

	return {
		get mounted() {
			return mounted;
		},
		get preset() {
			return preset;
		},
		setPreset(name: ThemePresetName) {
			preset = name;
			if (browser) {
				localStorage.setItem('c15t-theme-preset', name);
			}
		},
		get theme() {
			return themePresets[preset];
		},
	};
};

export const themePresetStore = createThemePresetStore();
