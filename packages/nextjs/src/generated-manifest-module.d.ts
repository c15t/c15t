// The package imports the build-time manifest and the app's config through
// its own specifiers so `withConsentManifest` can alias them. Declared here,
// not through `paths`, because the build would rewrite a `paths` import into
// a relative one, which no alias reaches.
declare module '@c15t/nextjs/generated-manifest' {
	import type { ConsentManifest } from '@c15t/schema/types';

	export const backendURL: string | undefined;
	export const snapshot: ConsentManifest | undefined;
}

declare module '@c15t/nextjs/user-config' {
	import type { ConsentConfig } from '~/config';

	const userConfig: ConsentConfig | undefined;
	export default userConfig;
}
