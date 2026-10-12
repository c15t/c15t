/**
 * Applies `NUXT_PUBLIC_INTH_PROJECT_URL` on a running server, the way Nuxt
 * applies `NUXT_PUBLIC_C15T_BACKEND_URL` over `runtimeConfig.public`. Nuxt
 * maps environment variables by key path, so the Inth name needs this step.
 *
 * The module registers the plugin only when the build's backend URL came
 * from neither the `backendURL` option nor `NUXT_PUBLIC_C15T_BACKEND_URL`,
 * so both still win.
 *
 * @internal
 */

/** The part of the runtime config the step reads and writes. */
export interface InthRuntimeConfig {
	public: { c15t?: { backendURL?: string } };
}

/**
 * Sets `public.c15t.backendURL` from `NUXT_PUBLIC_INTH_PROJECT_URL` when
 * `NUXT_PUBLIC_C15T_BACKEND_URL` is unset. Empty values count as unset.
 *
 * @param runtimeConfig - The request's runtime config, changed in place.
 * @param env - The server's environment variables.
 */
export const applyInthProjectURL = function applyInthProjectURL(
	runtimeConfig: InthRuntimeConfig,
	env: Record<string, string | undefined>
): void {
	const inth = env.NUXT_PUBLIC_INTH_PROJECT_URL;
	if (!inth || env.NUXT_PUBLIC_C15T_BACKEND_URL || !runtimeConfig.public.c15t) {
		return;
	}
	runtimeConfig.public.c15t.backendURL = inth;
};
