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

const plain = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
	Object.getOwnPropertyNames(value).every((key) => allowed.includes(key));
const strings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');
const optional = (value: unknown, check: (value: unknown) => boolean) =>
	value === undefined || check(value);
const bool = (value: unknown) => typeof value === 'boolean';
const scopeMode = (value: unknown) =>
	value === 'strict' || value === 'permissive';
const surface = (value: unknown): boolean =>
	plain(value) &&
	keys(value, ['allowedActions', 'primaryActions', 'layout', 'direction']) &&
	optional(value.allowedActions, strings) &&
	optional(value.primaryActions, strings) &&
	optional(
		value.direction,
		(direction) => direction === 'row' || direction === 'column'
	) &&
	optional(
		value.layout,
		(layout) =>
			Array.isArray(layout) &&
			layout.every((item) => typeof item === 'string' || strings(item))
	);
const consent = (value: unknown): boolean =>
	plain(value) &&
	keys(value, [
		'categories',
		'expiryDays',
		'gpc',
		'preselectedCategories',
		'scopeMode',
	]) &&
	optional(value.categories, strings) &&
	optional(value.preselectedCategories, strings) &&
	optional(value.scopeMode, scopeMode) &&
	optional(
		value.expiryDays,
		(days) => typeof days === 'number' && Number.isFinite(days)
	) &&
	optional(value.gpc, bool);
const proof = (value: unknown): boolean =>
	plain(value) &&
	keys(value, ['storeIp', 'storeUserAgent', 'storeLanguage']) &&
	optional(value.storeIp, bool) &&
	optional(value.storeUserAgent, bool) &&
	optional(value.storeLanguage, bool);
const ui = (value: unknown): boolean =>
	plain(value) &&
	keys(value, ['mode', 'banner', 'dialog']) &&
	optional(
		value.mode,
		(mode) => mode === 'none' || mode === 'banner' || mode === 'dialog'
	) &&
	optional(value.banner, surface) &&
	optional(value.dialog, surface);

/** Validates frozen data only; it never supplies runtime behavior.
 * @internal
 */
export const isLegacyMaterialCompatibility = (
	value: unknown
): value is LegacyMaterialCompatibility => {
	if (
		!plain(value) ||
		!keys(value, ['input', 'policyFingerprint']) ||
		typeof value.policyFingerprint !== 'string' ||
		!value.policyFingerprint
	) {
		return false;
	}
	const { input } = value;
	return (
		plain(input) &&
		keys(input, ['model', 'consent', 'proof', 'ui']) &&
		typeof input.model === 'string' &&
		['opt-in', 'opt-out', 'iab', 'none'].includes(input.model) &&
		optional(input.consent, consent) &&
		optional(input.proof, proof) &&
		optional(input.ui, ui)
	);
};
