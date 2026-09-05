/** Frozen v2 hash input. Never interpreted as a runtime policy or wire response. */
export interface LegacyMaterialPolicyInput {
	model: 'opt-in' | 'opt-out' | 'iab' | 'none';
	consent?: {
		categories?: string[];
		expiryDays?: number;
		gpc?: boolean;
		preselectedCategories?: string[];
		scopeMode?: 'strict' | 'permissive';
	};
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
	ui?: {
		mode?: 'none' | 'banner' | 'dialog';
		banner?: LegacyMaterialSurfaceInput;
		dialog?: LegacyMaterialSurfaceInput;
	};
}
/** Only the presentation fields included in the original v2 material hash. */
export interface LegacyMaterialSurfaceInput {
	allowedActions?: string[];
	primaryActions?: string[];
	layout?: (string | string[])[];
	direction?: 'row' | 'column';
}

/** Authoring-only v2 receipt compatibility, pinned to the reviewed v3 behavior. */
export interface LegacyMaterialCompatibility {
	input: LegacyMaterialPolicyInput;
	/** Exact v3 policy fingerprint for which the original v2 input is valid. */
	policyFingerprint: string;
}
