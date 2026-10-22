import type { DefaultComFormsSdkClient as CurrentDefaultComClient } from '@c15t/integrations/default-com';
import type { posthog as current } from '@c15t/integrations/posthog';
import type { VendorManifest } from '@c15t/integrations/types';
import type { DefaultComFormsSdkClient as LegacyDefaultComClient } from '@c15t/scripts/default-com';
import { posthog as legacy } from '@c15t/scripts/posthog';
import type { VendorManifest as LegacyManifest } from '@c15t/scripts/types';

export const sameFactory: typeof current = legacy;
export const sameManifest = (manifest: LegacyManifest): VendorManifest =>
	manifest;

export const sameDefaultComClient = (
	client: LegacyDefaultComClient
): CurrentDefaultComClient => client;
