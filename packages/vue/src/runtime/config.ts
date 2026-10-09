import type {
	ConsentExperiment,
	ConsentPresentation,
	ClearOnRevocationConfig,
	HydrationRecords,
	Vendor,
} from '@c15t/core';
import type {
	ConsentControlOptions,
	ConsentRuntimeOptions,
	RuntimeIABOptions,
} from '@c15t/core/runtime';
import type { ConsentConfig as BaseConsentConfig } from '@c15t/schema/config';
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import type { Theme, UIOptions } from '@c15t/ui/theme';
import type { HTMLAttributes } from 'vue';

export interface ConsentManifestNuxtConfig {
	/** Inline snapshot for client manifest mode. Policy edits need a rebuild. */
	manifestSnapshot?: ConsentManifest;
	/**
	 * Enables Nuxt manifest mode. `server` registers same-origin init and
	 * manifest routes; `client` resolves the manifest in the browser and never
	 * fetches an init route. `true` is kept as an alias for `server`.
	 */
	manifest?: 'client' | 'server' | boolean;

	/**
	 * Backend or CDN manifest URL. Server mode fetches this from the Nuxt route;
	 * client mode fetches it directly in the browser. Defaults to
	 * `${backendURL}/manifest` for server routes and `manifestRoute` in client
	 * mode. Unless the Nuxt module bundles a build manifest, which switches
	 * to server mode, `manifest` unset calls the backend's `/init` and
	 * ignores `manifestURL`, so set `manifest: 'server'` for the server
	 * routes or `'client'` for the browser. The plain Vue
	 * plugin, which has no server routes, treats a `manifestURL` without
	 * `manifest` as client mode.
	 */
	manifestURL?: string;

	/**
	 * Optional browser-side geo microfetch used by client manifest mode. The
	 * endpoint should return `{ country, region }`. Defaults to no geo fetch,
	 * leaving the resolver on the manifest's unknown-location policy.
	 */
	geoURL?: string | false;

	/**
	 * Same-origin Nuxt init route used by the client. Defaults to
	 * `/api/c15t/init`.
	 */
	initRoute?: string;

	/**
	 * Same-origin Nuxt manifest passthrough route. Defaults to
	 * `/api/c15t/manifest`.
	 */
	manifestRoute?: string;

	/**
	 * Longest server rendering waits for the visitor's policy, in
	 * milliseconds. Past it the page renders without a resolved policy: no
	 * consent UI in the server HTML, optional categories denied, gated
	 * scripts and embeds blocked, and the browser resolves the policy after
	 * hydration. In server manifest mode the manifest request keeps running
	 * and fills the cache for the next request. Applies to the render only;
	 * the browser's own init requests wait for the manifest. `false` (or
	 * `Infinity`) removes the budget; any other value that is not a finite,
	 * non-negative number uses the default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;

	/**
	 * Report each init the server init route resolves to the backend's
	 * `POST /sessions`, server-to-server and detached from the response, so
	 * the backend still counts visitors it never served `/init` to. Needs an
	 * absolute `backendURL`; nothing is inferred from `manifestURL`. Set
	 * `false` to send none.
	 *
	 * @default true
	 */
	reportSessions?: boolean;
}

export interface ConsentConfig
	extends
		BaseConsentConfig<HTMLAttributes>,
		ConsentManifestNuxtConfig,
		ConsentControlOptions {
	/**
	 * Vendors the preference center lists under their category, each with
	 * its own switch, so a visitor can grant a category and still turn one
	 * vendor off. Scripts, network rules and iframes naming a vendor's `id`
	 * follow that choice. Merged with vendors the backend declares.
	 */
	vendors?: Vendor[];
	/** Remove configured browser data when its consent permission is revoked. */
	clearOnRevocation?: ClearOnRevocationConfig;
	/**
	 * Reload the page after an accept, reject or save turns off a category or
	 * vendor that was granted, or after a `consentSource` withdraws one.
	 * Removing a script cannot stop code that already ran, so the reload
	 * starts a document with only permitted code. Waits for the save request.
	 * Set `false` to handle revocation yourself.
	 * @default true
	 */
	reloadOnConsentRevoked?: boolean;
	/** Resolved server init data, reused for the first client render. */
	prefetch?: InitOutput;
	/** Raw server records with their request evaluation clock. */
	initialRecords?: HydrationRecords;
	/** Application-owned prompt and preference presentation. */
	presentation?: ConsentPresentation;
	/** Scripts whose loading follows the shared consent permissions. */
	scripts?: ConsentRuntimeOptions['scripts'];
	/**
	 * A/B experiment on prompt/preferences presentation. The assigned arm is
	 * merged over `presentation` (read it with `useResolvedPresentation()`),
	 * exposed through `useExperiment()`, and recorded with every impression
	 * and choice.
	 */
	experiment?: ConsentExperiment;
	/** Receives kernel events only when the corresponding change occurs. */
	callbacks?: ConsentRuntimeOptions['callbacks'];
	/**
	 * Turn on IAB TCF. Set it, even to `{}`, and c15t mounts its CMP
	 * (`__tcfapi`) and shows the IAB banner while the visitor's policy uses
	 * the `iab` model. Left unset, `false`, or `{ enabled: false }`, IAB
	 * stays off and the IAB code never loads; an `iab` policy whose vendor
	 * list arrives then throws an `IABUnavailableError`.
	 *
	 * The object takes publisher settings: `publisherRestrictions`,
	 * `publisherCountryCode`, `vendors`, `customVendors`, `cmpVersion`, and
	 * `cmpId` or `gvl` when the backend does not supply them. Fields left
	 * out come from `/init`. Read once, when the app starts.
	 *
	 * @example
	 * ```ts
	 * iab: {
	 * 	publisherCountryCode: 'DE',
	 * 	publisherRestrictions: [
	 * 		{ purposeId: 2, restrictionType: 1, vendorIds: [755] },
	 * 	],
	 * }
	 * ```
	 */
	iab?: RuntimeIABOptions;
	/**
	 * Light or dark for the banner and dialogs, through the `c15t-dark`
	 * class on `<html>`.
	 *
	 * `'light'` and `'dark'` force a scheme. `'system'` follows
	 * `prefers-color-scheme` and keeps following it as the visitor changes
	 * it. Left unset, `c15t-dark` mirrors a `dark` class on `<html>`, so a
	 * site theme switch that toggles `dark` also switches the consent UI.
	 * `null` leaves `c15t-dark` to the site.
	 *
	 * Nuxt sets the class for `'dark'` and `'system'` from an inline script
	 * in the server HTML, so the first paint is already dark.
	 */
	colorScheme?: UIOptions['colorScheme'];
	/**
	 * Design tokens, including `dark` colors, written as CSS custom
	 * properties into the same `<style id="c15t-css-vars">` element as
	 * `tokens`. Where both set a variable, `theme` wins. `theme.slots`
	 * style the same parts as `components`, which win where both set the
	 * same attribute.
	 *
	 * @example
	 * ```ts
	 * theme: {
	 * 	colors: { primary: '#2f6f4e' },
	 * 	dark: { primary: '#7fd1a8', surface: '#101512' },
	 * }
	 * ```
	 */
	theme?: Theme;
}
