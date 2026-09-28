/**
 * Imports the package the way a runner does, and reports what linked.
 *
 * Spawned rather than imported. The value of this file is that it runs under
 * whatever loader a caller passes, so `react-native-alias.mjs` is tested in the
 * one place it is load-bearing: a process that is not Vitest and so has no
 * `vitest.config.ts` to lean on. Importing the barrel pulls in every module the
 * built package links, including the components.
 */

import { createConsentClient, useConsentSafeArea } from '@c15t/react-native';

process.stdout.write(
	`${JSON.stringify({
		consentClient: typeof createConsentClient,
		safeArea: typeof useConsentSafeArea,
	})}\n`
);
