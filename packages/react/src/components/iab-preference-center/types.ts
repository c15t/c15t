/**
 * Processed vendor data for UI display.
 */
export interface ProcessedVendor {
	id: number;
	name: string;
	policyUrl: string;
	usesNonCookieAccess: boolean;
	deviceStorageDisclosureUrl: string | null;
	usesCookies: boolean;
	cookieMaxAgeSeconds: number | null;
	specialPurposes: number[];
	specialFeatures: number[];
	purposes: number[];
	legIntPurposes: number[];
	isCustom?: boolean;
	usesLegitimateInterest?: boolean;
	retention?: Record<number, number>;
	dataDeclaration?: number[];
}

/**
 * Processed purpose data for UI display.
 */
export interface ProcessedPurpose {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: ProcessedVendor[];
	isSpecialPurpose?: boolean;
}

/**
 * Special feature data for UI display.
 */
export interface ProcessedSpecialFeature {
	id: number;
	name: string;
	description: string;
	descriptionLegal?: string;
	illustrations: string[];
	vendors: ProcessedVendor[];
}

/**
 * Stack data with resolved purposes.
 */
export interface ProcessedStack {
	id: number;
	name: string;
	description: string;
	purposes: ProcessedPurpose[];
}
