import type { ManifestFetch } from './manifest-mode';

interface NitroAppWithLocalFetch {
	localFetch: ManifestFetch;
}

export const createServerFetch =
	(useNitroApp: () => NitroAppWithLocalFetch): ManifestFetch =>
	(input, init) =>
		useNitroApp().localFetch(input, init);
