/**
 * CSS variables for the root switch component
 */
export type SwitchRootCSSVariables = {
	'--switch-height': string;
	'--switch-width': string;
	'--switch-padding': string;
	'--switch-duration': string;
	'--switch-ease': string;
};

/**
 * CSS variables for the switch thumb component
 */
export type SwitchThumbCSSVariables = {
	'--switch-thumb-size': string;
	'--switch-thumb-size-disabled': string;
	'--switch-thumb-translate': string;
	'--switch-thumb-background-color': string;
	'--switch-thumb-background-color-disabled': string;
};

/**
 * CSS variables for the switch track component
 */
export type SwitchTrackCSSVariables = {
	'--switch-background-color': string;
	'--switch-background-color-hover': string;
	'--switch-background-color-checked': string;
	'--switch-background-color-disabled': string;
};

/**
 * All CSS variables used in the switch component
 */
export type SwitchCSSVariables = SwitchRootCSSVariables &
	SwitchThumbCSSVariables &
	SwitchTrackCSSVariables;
