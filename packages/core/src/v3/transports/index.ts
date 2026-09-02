/**
 * Transport factories. Each export is optional — consumers pick the one
 * that matches their backend shape. Adapter authors who want to build
 * their own transport should import from `./contract` (re-exports below)
 * for the typed surface.
 *
 * Public subpath: `c15t/v3/transports`.
 */

export type {
	InitContext,
	InitResponse,
	InitResult,
	KernelTransport,
	SavePayload,
	SaveResult,
} from './contract';
export type { HostedTransportOptions } from './hosted';
export { createHostedTransport } from './hosted';
export {
	initOutputToKernelConfig,
	initResponseToKernelConfig,
	mapInitOutputToInitResponse,
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from './init-output';
export type { OfflineTransportOptions } from './offline';
export { createOfflineTransport } from './offline';
export { buildSubjectPostBody } from './subject-body';
export { C15T_VERSION_HEADER, c15tVersionHeaders } from './version-header';
