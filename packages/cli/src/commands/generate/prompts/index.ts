/**
 * Generate command prompts exports
 */

export {
	EXPANDED_THEME_OPTIONS,
	type ExpandedTheme,
	getExpandedThemeInfo,
	promptForExpandedTheme,
} from './expanded-theme';
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
export {
	getUIStyleInfo,
	promptForUIStyle,
	UI_STYLE_OPTIONS,
	type UIStyle,
} from './ui-style';
