'use client';

import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

import { COMPAT_STATIC_BACKEND_URL } from '../../../lib/backend-url';
import { consentManifest } from '../../../lib/consent-manifest.generated';

/**
 * The `@c15t/nextjs/static` path: the manifest module was generated at
 * build time, so init resolves in the bundle and nothing is fetched.
 */
const StaticManifestLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell
		backendURL={COMPAT_STATIC_BACKEND_URL}
		manifest={consentManifest}
		scenario="static-manifest"
		transport="static"
	>
		{children}
	</ConsentShell>
);

export default StaticManifestLayout;
