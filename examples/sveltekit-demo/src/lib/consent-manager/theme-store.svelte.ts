import { browser } from '$app/environment';
import { type ThemePresetName, themePresets } from './theme-presets';

function createThemePresetStore() {
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
		get preset() {
			return preset;
		},
		get theme() {
			return themePresets[preset];
		},
		get mounted() {
			return mounted;
		},
		setPreset(name: ThemePresetName) {
			preset = name;
			if (browser) {
				localStorage.setItem('c15t-theme-preset', name);
			}
		},
	};
}

export const themePresetStore = createThemePresetStore();
