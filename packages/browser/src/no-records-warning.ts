import { warnNoConsentRecords } from '@c15t/core';
import type { ProviderTransportFactory } from '@c15t/core';

import type { ResolvedMode } from './client-base';

const DEVELOPMENT_HOSTS = new Set([
	'localhost',
	'127.0.0.1',
	'0.0.0.0',
	'[::1]',
]);
const DEVELOPMENT_SUFFIXES = ['.localhost', '.local', '.test'];

/**
 * Whether the page runs on a host only a developer visits.
 *
 * @param hostname - The page's `location.hostname`.
 * @returns `true` for loopback addresses and the `.localhost`, `.local` and
 *   `.test` names.
 * @internal
 */
export const isDevelopmentHost = function isDevelopmentHost(
	hostname: string
): boolean {
	return (
		DEVELOPMENT_HOSTS.has(hostname) ||
		DEVELOPMENT_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
	);
};

/**
 * Warn that local mode keeps no consent records, on development hosts.
 *
 * The script-tag files are production builds, so core's development-build
 * warning never runs in them. The page's host stands in for the build.
 *
 * @param mode - The client's resolved mode.
 * @param acknowledged - `acknowledgeNoRecords` from the options or the tag.
 * @internal
 */
export const warnNoConsentRecordsOnDevelopmentHost =
	function warnNoConsentRecordsOnDevelopmentHost(
		mode: ResolvedMode,
		acknowledged: boolean | undefined
	): void {
		const factory = mode.factory as ProviderTransportFactory & {
			acknowledgeNoRecords?: boolean;
		};
		if (
			mode.name !== 'offline' ||
			acknowledged === true ||
			factory.acknowledgeNoRecords === true ||
			typeof location === 'undefined' ||
			!isDevelopmentHost(location.hostname)
		) {
			return;
		}
		warnNoConsentRecords();
	};
