import { type Translations } from '@c15t/translations';
import type { InitResponse } from '../client-interface';
type InitFallbackPolicy = NonNullable<InitResponse['policy']>;
export declare function resolveNoPolicyFallback(): InitFallbackPolicy;
interface ResolveFallbackPolicyOptions {
	explicitPolicy?: InitResponse['policy'];
}
interface BuildFallbackInitDataOptions {
	jurisdiction?: InitResponse['jurisdiction'];
	countryCode?: string | null;
	regionCode?: string | null;
	language?: string;
	translations?: Translations;
	gvl?: InitResponse['gvl'];
	policy?: InitResponse['policy'];
	policyDecision?: InitResponse['policyDecision'];
	policySnapshotToken?: InitResponse['policySnapshotToken'];
}
export declare function resolveFallbackPolicy(
	options: ResolveFallbackPolicyOptions
): InitFallbackPolicy;
export declare function buildFallbackInitData(
	options: BuildFallbackInitDataOptions
): InitResponse;
export {};
