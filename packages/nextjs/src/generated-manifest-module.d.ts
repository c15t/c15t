// The server helpers import the build-time manifest through the package's
// own specifier so `withConsentManifest` can alias it. Declared here so type
// checks pass before `dist-types/` exists.
declare module '@c15t/nextjs/generated-manifest' {
	import type { ConsentManifest } from '@c15t/schema/types';

	export const consentManifest: ConsentManifest | undefined;
}
