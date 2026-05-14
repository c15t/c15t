import type { PolicyUiSurfaceConfig } from './policy-runtime';
export declare function dedupeDefinedValues<T>(
	values?: readonly T[] | null
): T[] | undefined;
export declare function dedupeTrimmedStrings(
	values?: readonly string[] | null
): string[] | undefined;
export declare function compactDefined<T extends Record<string, unknown>>(
	value: T
): T | undefined;
export declare function hasRealPolicyUiHints(
	surface?: PolicyUiSurfaceConfig | null
): boolean;
