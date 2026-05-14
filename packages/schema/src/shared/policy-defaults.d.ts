import type { ResolvedPolicy } from '~/api/init';
export interface PolicyDefaults {
	offlineOptInBanner: () => ResolvedPolicy;
	offlineIab: () => ResolvedPolicy;
	offlineNoBanner: () => ResolvedPolicy;
}
export declare const policyDefaults: PolicyDefaults;
