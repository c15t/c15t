/**
 * Read the native handshake payload.
 */

import { useMemo } from 'react';

import type { BootstrapPayload } from '../protocol';
import { useConsentClient } from '../provider/consent-context';

/**
 * The payload `getBootstrap()` reported once at mount.
 *
 * Meant for a debug or about screen: the native SDK version and protocol make a
 * stale-binary mismatch obvious, which is the failure a JavaScript-only update
 * causes.
 *
 * @returns The handshake payload for the running binary.
 */
export const useC15tBootstrap = function useC15tBootstrap(): BootstrapPayload {
	const client = useConsentClient();

	return useMemo(() => client.bootstrap, [client]);
};
