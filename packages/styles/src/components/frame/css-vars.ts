/** Frame placeholder CSS variables */
export type FramePlaceholderCSSVariables = {
	'--frame-font-family': string;
	'--frame-line-height': string;
	'--frame-placeholder-gap': string;
	'--frame-placeholder-border-radius': string;
	'--frame-placeholder-border-width': string;
	'--frame-placeholder-border-color': string;
	'--frame-placeholder-border-color-dark': string;
	'--frame-placeholder-background-color': string;
	'--frame-placeholder-background-color-dark': string;
	'--frame-placeholder-text-color': string;
	'--frame-placeholder-text-color-dark': string;
	'--frame-placeholder-shadow': string;
	'--frame-placeholder-shadow-dark': string;
	'--frame-placeholder-opacity': string;
	'--frame-placeholder-animation': string;
};

/** Frame title CSS variables */
export type FrameTitleCSSVariables = {
	'--frame-placeholder-title-color': string;
	'--frame-placeholder-title-color-dark': string;
};

/** All frame CSS variables combined */
export type FrameCSSVariables = FramePlaceholderCSSVariables &
	FrameTitleCSSVariables;
