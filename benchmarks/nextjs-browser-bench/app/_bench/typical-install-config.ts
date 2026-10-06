import { defineConsentConfig } from '@c15t/nextjs';

/**
 * The `typical-install` arm's consent config, shaped like the Next.js
 * quickstart's `c15t.config.ts`: a hosted backend plus the app's cached
 * manifest route. The backend is the bench fixture, which sleeps for
 * `C15T_BENCH_BACKEND_LATENCY_MS` on every request.
 */
export const typicalInstallConfig = defineConsentConfig({
	backendURL: '/api/bench-consent',
	manifestURL: '/api/c15t/manifest',
});

/** Where the stand-in vendor scripts are served from (`public/`). */
export const benchVendorScripts = {
	gtag: '/bench-vendor/gtag.js',
	'meta-pixel': '/bench-vendor/fbevents.js',
	'tiktok-pixel': '/bench-vendor/tiktok-events.js',
} as const;
