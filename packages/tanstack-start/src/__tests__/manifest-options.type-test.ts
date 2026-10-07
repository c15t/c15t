import type { ConsentManifest } from '@c15t/schema/types';
import { expectTypeOf } from 'vitest';

import type { ConsentServerRouteOptions } from '../api';
import type { ConsentManifestOptions, ResolveConsentOptions } from '../server';

declare const manifest: ConsentManifest;

// One object fits both helpers.
expectTypeOf<ConsentManifestOptions>().toExtend<ResolveConsentOptions>();
expectTypeOf<ConsentManifestOptions>().toExtend<ConsentServerRouteOptions>();

// The server function ignores `manifest` without `backendURL`, so the shared
// type requires it.
// @ts-expect-error -- backendURL is required
const withoutBackend: ConsentManifestOptions = { manifest };
void withoutBackend;
