/**
 * `@c15t/core/generated` — what the build integration fetched.
 *
 * The `consentManifest()` Vite plugins replace this module with a virtual
 * one, and `withConsentManifest()` aliases it to a file under
 * `node_modules/.cache/c15t/` in Next.js. Without either, this module
 * stands in: both exports are `undefined`, so imports still compile and the
 * app reads the policy at runtime.
 *
 * In the browser bundle of a server-rendered framework (TanStack Start,
 * SvelteKit), `snapshot` is always `undefined`: the server resolves the
 * policy, and Next.js fails the build when client code imports the module.
 *
 * @example
 * ```ts
 * import { backendURL, snapshot } from '@c15t/core/generated';
 * ```
 */
import type { ConsentManifest } from '@c15t/schema/types';

/**
 * The backend URL the build read the manifest from, or `undefined` when no
 * build integration set it. Public: every environment receives it.
 */
export const backendURL: string | undefined = undefined;

/**
 * The deployment's consent manifest, fetched during the build or when dev
 * started. `undefined` when the fetch was skipped or failed with
 * `onBuildError: 'runtime'`, and in the browser bundle of a server-rendered
 * framework.
 */
export const snapshot: ConsentManifest | undefined = undefined;
