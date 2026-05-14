declare module 'c15t' {
	export type AllConsentNames =
		| 'necessary'
		| 'functionality'
		| 'marketing'
		| 'measurement'
		| 'experience';

	export const allConsentNames: AllConsentNames[];

	export type ConsentState = Record<AllConsentNames, boolean> &
		Record<string, boolean>;

	export interface ConsentInfo {
		id?: string;
		subjectId?: string;
		status?: boolean;
		updatedAt?: string;
		[key: string]: unknown;
	}

	export interface StorageConfig {
		type?: 'localStorage' | 'cookie' | 'custom';
		prefix?: string;
		cookieOptions?: CookieOptions;
		[key: string]: unknown;
	}

	export interface CookieOptions {
		domain?: string;
		expires?: Date | number;
		maxAge?: number;
		path?: string;
		sameSite?: 'strict' | 'lax' | 'none';
		secure?: boolean;
		[key: string]: unknown;
	}

	export type HasCondition<CategoryType = string> =
		| CategoryType
		| { and: HasCondition<CategoryType> | HasCondition<CategoryType>[] }
		| { or: HasCondition<CategoryType> | HasCondition<CategoryType>[] }
		| { not: HasCondition<CategoryType> };

	export interface HasOptions {
		policyCategories?: string[] | null;
		policyScopeMode?: 'strict' | 'permissive' | null;
	}

	export function has<CategoryType extends AllConsentNames>(
		condition: HasCondition<CategoryType>,
		consents: ConsentState,
		options?: HasOptions
	): boolean;

	export function extractConsentNamesFromCondition<
		CategoryType extends AllConsentNames,
	>(condition: HasCondition<CategoryType>): CategoryType[];

	export interface ScriptCallbackInfo {
		id: string;
		elementId: string;
		hasConsent: boolean;
		consents: ConsentState;
		element?: HTMLScriptElement;
		error?: Error;
	}

	export interface Script {
		id: string;
		src?: string;
		textContent?: string;
		category: HasCondition<AllConsentNames>;
		callbackOnly?: boolean;
		persistAfterConsentRevoked?: boolean;
		alwaysLoad?: boolean;
		fetchPriority?: 'high' | 'low' | 'auto';
		attributes?: Record<string, string>;
		async?: boolean;
		defer?: boolean;
		nonce?: string;
		anonymizeId?: boolean;
		target?: 'head' | 'body';
		onBeforeLoad?: (info: ScriptCallbackInfo) => void;
		onLoad?: (info: ScriptCallbackInfo) => void;
		onError?: (info: ScriptCallbackInfo) => void;
		onConsentChange?: (info: ScriptCallbackInfo) => void;
		vendorId?: number | string;
		iabPurposes?: number[];
		iabLegIntPurposes?: number[];
		iabSpecialFeatures?: number[];
	}

	export interface NetworkBlockerRule {
		id?: string;
		domain: string;
		pathIncludes?: string;
		methods?: string[];
		category: HasCondition<AllConsentNames>;
	}

	export interface BlockedRequestInfo {
		method: string;
		url: string;
		rule?: NetworkBlockerRule;
	}

	export interface NetworkBlockerConfig {
		enabled?: boolean;
		initialConsents?: ConsentState;
		logBlockedRequests?: boolean;
		onRequestBlocked?: (info: BlockedRequestInfo) => void;
		rules: NetworkBlockerRule[];
	}

	export function generateSubjectId(): string;
	export function isValidSubjectId(value: unknown): value is string;

	export function getConsentFromStorage<T = unknown>(
		options?: StorageConfig
	): T | null;
	export function saveConsentToStorage<T = unknown>(
		value: T,
		options?: StorageConfig
	): void;
	export function deleteConsentFromStorage(options?: StorageConfig): void;

	export function applyPolicyScopeForRuntimeGating<
		T extends Record<string, boolean>,
	>(
		consents: T,
		allowedPurposeIds?: string[] | null,
		scopeMode?: 'strict' | 'permissive' | null
	): T;

	export function filterConsentCategoriesByPolicy<T extends string>(
		categories: T[],
		allowedPurposeIds?: string[]
	): T[];
}
