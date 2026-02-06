/**
 * Generate command prompts exports
 */

export {
	type InstanceSelectionResult,
	promptForInstance,
} from './instance';
export {
	explainMode,
	getModeInfo,
	MODE_OPTIONS,
	promptForMode,
} from './mode-select';
export {
	generateScriptConfig,
	getScriptInfo,
	hasGoogleConsentMode,
	promptForScripts,
	SCRIPT_OPTIONS,
	type ScriptId,
} from './scripts';
export {
	generateThemeConfig,
	getThemeCssImport,
	getThemeInfo,
	promptForTheme,
	THEME_OPTIONS,
	type ThemeId,
} from './theme';
