import type { ResolvedPolicy } from '~/api/init';
/** @deprecated Strategy selection removed — uses crypto.subtle (async) or pure-JS (sync) */
export type FingerprintHashStrategy = 'auto' | 'node' | 'webcrypto' | 'pure-js';
export declare function stableStringify(value: unknown): string;
export declare function hashSha256Hex(input: string): Promise<string>;
export declare function createDeterministicFingerprintSync(
	value: unknown
): string;
export declare function createDeterministicFingerprint(
	value: unknown
): Promise<string>;
export declare function createPolicyFingerprint(
	policy: ResolvedPolicy
): Promise<string>;
export declare function createMaterialPolicyFingerprint(
	policy: ResolvedPolicy
): Promise<string>;
