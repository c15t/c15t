import { computed } from 'vue';
import type { Ref } from 'vue';

import { useConsentKernelContext } from './kernel';

export interface RequestRegion {
	region?: string;
	country?: string;
}

export function useRequestRegion(): Ref<RequestRegion> {
	const context = useConsentKernelContext();
	return computed(() => ({
		country:
			context.snapshot.value.location?.countryCode ??
			context.snapshot.value.overrides.country,
		region:
			context.snapshot.value.location?.regionCode ??
			context.snapshot.value.overrides.region,
	}));
}
