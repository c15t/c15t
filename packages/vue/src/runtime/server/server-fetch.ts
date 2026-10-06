import type { ManifestFetch } from '@c15t/core/transports/manifest-cache';

interface NitroAppWithLocalFetch {
	localFetch: ManifestFetch;
}

export const createServerFetch =
	(useNitroApp: () => NitroAppWithLocalFetch): ManifestFetch =>
	(input, init) =>
		useNitroApp().localFetch(input, init);
