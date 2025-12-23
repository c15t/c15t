/** Legal links container CSS variables */
export type LegalLinksContainerCSSVariables = {
	'--legal-links-gap': string;
};

/** Legal link item CSS variables */
export type LegalLinkCSSVariables = {
	'--legal-links-font-size': string;
	'--legal-links-transition': string;
	'--legal-links-text-decoration': string;
	'--legal-links-text-decoration-hover': string;
	'--legal-links-outline': string;
	'--legal-links-outline-offset': string;
	'--legal-links-color': string;
	'--legal-links-focus-color': string;
	'--legal-links-focus-color-dark': string;
};

/** All legal links CSS variables combined */
export type LegalLinksCSSVariables = LegalLinksContainerCSSVariables &
	LegalLinkCSSVariables;
