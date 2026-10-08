import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

const nextConfig = {} satisfies NextConfig;

export default withConsentManifest(nextConfig, {
	backendURL:
		process.env.NEXT_PUBLIC_C15T_BACKEND_URL ??
		'https://benchmarks-inth.inth.app',
});
