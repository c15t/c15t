import { getRegionFromHeaders } from '@c15t/utils';
import { type Ref } from 'vue';
import { useRequestHeaders, useState } from '#imports';

export interface RequestRegion {
	region?: string;
	country?: string;
}

export function useRequestRegion(): Ref<RequestRegion> {
	const headers = useRequestHeaders();

	const location = useState('c15t:location', () =>
		getRegionFromHeaders(headers)
	);
	return location;
}
