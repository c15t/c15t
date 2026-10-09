import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

const nextConfig = {} satisfies NextConfig;

// Reads NEXT_PUBLIC_C15T_BACKEND_URL, like defineConsentConfig.
export default withConsentManifest(nextConfig);
