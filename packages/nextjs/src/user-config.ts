/**
 * `@c15t/nextjs/user-config` — the app's `c15t.config.ts`, found
 * automatically.
 *
 * `withConsentManifest` aliases this specifier to `<root>/c15t.config.ts`
 * in Turbopack and webpack, for server and browser bundles. `ConsentRoot`,
 * `resolveConsent()`, `createConsentRoute()` and the Pages Router helpers
 * import it from inside the package, so the app never imports its own
 * config. Without the wrapper or the file, this stub stands in and exports
 * `undefined`.
 *
 * Read the default export when it is needed (inside a function or a
 * render), never at module top level: `c15t.config.ts` imports `c15t/next`,
 * so the browser graph has a cycle through this module.
 *
 * @internal
 */
import type { ConsentConfig } from './config';

const userConfig: ConsentConfig | undefined = undefined;

export default userConfig;
